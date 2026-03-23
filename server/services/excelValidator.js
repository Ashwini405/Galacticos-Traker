import XLSX from 'xlsx';
import { 
  EXPECTED_COLUMNS, 
  mapExcelHeaders, 
  validateRequiredColumns, 
  validateCandidateRow,
  normalizeRow,
  resolveForeignKeys 
} from '../utils/validation.js';
import db from '../../index.js'; // Access global.db

/**
 * Complete Excel validation → DB-ready rows + detailed report
 */
export class ExcelValidator {
  
  static async validateAndParse(fileBuffer, filename = 'upload.xlsx') {
    try {
      // Parse Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawData.length < 2) {
        return {
          success: false,
          errors: ['Excel file is empty or missing data rows'],
          validRows: [],
          report: { totalRows: 0, valid: 0 }
        };
      }
      
      const headers = rawData[0];
      const dataRows = rawData.slice(1);
      
      // Map columns case-insensitively
      const columnMapping = mapExcelHeaders(headers);
      const headerErrors = validateRequiredColumns(columnMapping);
      
      if (headerErrors.length > 0) {
        return {
          success: false,
          errors: headerErrors,
          validRows: [],
          report: { totalRows: 0, valid: 0 }
        };
      }
      
      // Validate & normalize each row
      const validRows = [];
      const rowErrors = [];
      const masterCache = {}; // Cache master tables
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        // Skip empty rows
        if (row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
          continue;
        }
        
        const rowNum = i + 2; // Excel row number (1-indexed + header)
        const rowErrorsLocal = validateCandidateRow(row, columnMapping);
        
        if (rowErrorsLocal.length === 0) {
          // Normalize & resolve FKs
          let normalized = normalizeRow(row, columnMapping);
          normalized = await resolveForeignKeys(normalized, db, masterCache);
          
          // Final validation: Ensure required FKs resolved
          const missingFKs = [];
          ['job_role_id', 'client_id', 'funnel_stage_id'].forEach(field => {
            if (!normalized[field]) missingFKs.push(field);
          });
          
          if (missingFKs.length === 0) {
            validRows.push(normalized);
          } else {
            rowErrors.push(`Row ${rowNum}: Missing FKs: ${missingFKs.join(', ')}`);
          }
        } else {
          rowErrors.push(`Row ${rowNum}: ${rowErrorsLocal.join('; ')}`);
        }
      }
      
      const totalProcessed = dataRows.filter(row => 
        row.length > 0 && !row.every(cell => !cell || cell.toString().trim() === '')
      ).length;
      
      const report = {
        totalRows: totalProcessed,
        valid: validRows.length,
        invalid: totalProcessed - validRows.length,
        errorCount: rowErrors.length,
        successRate: totalProcessed > 0 ? ((validRows.length / totalProcessed) * 100).toFixed(1) : 0
      };
      
      const allErrors = [...headerErrors, ...rowErrors];
      
      return {
        success: allErrors.length === 0,
        validRows,
        errors: allErrors.slice(0, 50), // Limit response size
        allErrorsCount: allErrors.length,
        report,
        filename,
        warnings: report.successRate < 80 ? [`Low success rate: ${report.successRate}%`] : []
      };
      
    } catch (error) {
      console.error('ExcelValidator error:', error);
      return {
        success: false,
        errors: [`Parse error: ${error.message}`],
        validRows: [],
        report: { totalRows: 0, valid: 0 }
      };
    }
  }
}

// Export for route usage
export default ExcelValidator;


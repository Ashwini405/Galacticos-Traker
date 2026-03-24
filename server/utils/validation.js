/**
 * Shared Excel validation utils - Case-insensitive column matching
 * Sync'd with client/src/pages/Candidates.jsx EXPECTED_COLUMNS
 */

export const EXPECTED_COLUMNS = {
  name: { dbField: 'name', required: true, aliases: ['name', 'candidate name', 'full name', 'candidate'] },
  email: { dbField: 'email', required: false, aliases: ['email', 'e-mail', 'e mail'] },
  phone: { dbField: 'phone', required: false, aliases: ['phone', 'contact', 'mobile', 'phone number'] },
  location: { dbField: 'location', required: false, aliases: ['location', 'city', 'current location', 'current'] },
  experience: { dbField: 'experience', required: true, aliases: ['exp', 'experience', 'years of experience', 'rel exp (y', 'rel exp (yrs)', 'rel exp', 'relevant experience'] },
  job_role: { dbField: 'job_role_id', required: false, aliases: ['job role', 'role', 'position', 'job_role'] },
  office_mode: { dbField: 'office_mode_id', required: false, aliases: ['office mode', 'work mode', 'office mo', 'office mc', 'work mode'] },
  client: { dbField: 'client_id', required: false, aliases: ['client', 'company', 'client_name'] },
  funnel_stage: { dbField: 'funnel_stage_id', required: false, aliases: ['stage', 'status', 'funnel stage', 'recruitm', 'recruitment', 'funnel_stage'] },
  contract_type: { dbField: 'contract_type_id', required: false, aliases: ['contract type', 'employment type', 'type of c', 'type of contract', 'contract_type'] },
  offer_status: { dbField: 'offer_status', required: false, aliases: ['offer status', 'offer', 'offer sta'] },
  current_ctc: { dbField: 'current_ctc', required: false, aliases: ['current ctc', 'ctc', 'current_ctc'] },
  expected_ctc: { dbField: 'expected_ctc', required: false, aliases: ['expected ctc', 'ectc', 'expected', 'expected_ctc'] },
  recruiter: { dbField: 'recruiter_id', required: false, aliases: ['recruiter', 'assigned to', 'recruiter_name'] },
job_location: { dbField: 'job_location', required: false, aliases: ['job location', 'work location', 'job locat'] },
  submission_date: { 
    dbField: 'submission_date', 
    required: false, 
    aliases: ['submission date', 'submission_date', 'submitted', 'date submitted', 'sub date', 'submitted date', 'date'] 
  }
};

// Location keywords to reject in name field
const LOCATION_KEYWORDS = [
  'hyderabad', 'bangalore', 'bengaluru', 'delhi', 'mumbai', 'pune', 'chennai',
  'kolkata', 'ahmedabad', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore',
  'thane', 'bhopal', 'visakhapatnam', 'pimpri-chinchwad', 'patna', 'vadodara',
  'ghaziabad', 'ludhiana', 'coimbatore', 'kochi', 'srinagar', 'aurangabad',
  'dhanbad', 'amritsar', 'navi-mumbai', 'allahabad', 'ranchi', 'howrah',
  'guwahati', 'chandigarh', 'jabalpur', 'faridabad', 'meerut', 'varanasi',
  'bareilly', 'gorakhpur', 'belgaum', 'mysore', 'tiruppur', 'gurgaon',
  'noida', 'greater-noida', 'remote', 'wfh', 'wfo', 'onsite', 'hybrid',
  'bangcok', 'bangkok'
];

// Case-insensitive header → DB field mapping with duplicate & unknown column detection
export function mapExcelHeaders(headers) {
  const columnMapping = {};
  const errors = [];
  const fieldToHeader = {}; // Track which columns map to each field
  
  headers.forEach((header, index) => {
    if (!header) return;
    
    const cleanHeader = header.toString().trim().toUpperCase().replace(/\s+/g, ' ');
    let foundField = null;
    
    for (const [fieldName, config] of Object.entries(EXPECTED_COLUMNS)) {
      for (const alias of config.aliases) {
        const cleanAlias = alias.toUpperCase();
        if (cleanHeader === cleanAlias || 
            cleanHeader.startsWith(cleanAlias + ' ') || 
            cleanHeader.startsWith(cleanAlias + '(')) {
          foundField = fieldName;
          break;
        }
      }
      if (foundField) break;
    }
    
    if (foundField) {
      // Check for duplicate column (same field mapped twice)
      if (columnMapping[foundField] !== undefined) {
        errors.push(`Duplicate column: "${headers[columnMapping[foundField]]}" and "${header}" both map to "${foundField}"`);
      }
      
      columnMapping[foundField] = index;
      if (!fieldToHeader[foundField]) {
        fieldToHeader[foundField] = [];
      }
      fieldToHeader[foundField].push(header);
    } else {
      // Unknown column (doesn't match any field)
      errors.push(`Unknown column: "${header}" (not in expected schema)`);
    }
  });
  
  return { columnMapping, errors };
}

// Validate required columns exist
export function validateRequiredColumns(columnMapping) {
  const errors = [];
  
  for (const [fieldName, config] of Object.entries(EXPECTED_COLUMNS)) {
    if (config.required && columnMapping[fieldName] === undefined) {
      errors.push(`Missing required column: "${fieldName.replace(/_/g, ' ').toUpperCase()}"`);
    }
  }
  
  return errors;
}

// Validate single row data types/business rules with row number
export function validateCandidateRow(row, columnMapping, rowNumber = null) {
  const errors = [];
  
  for (const [fieldName, config] of Object.entries(EXPECTED_COLUMNS)) {
    const colIndex = columnMapping[fieldName];
    if (colIndex === undefined) continue;
    
    const rawValue = row[colIndex];
    const value = rawValue?.toString().trim() || '';
    
    // Required field check
    if (config.required && value === '') {
      const msg = `${config.dbField.replace(/_/g, ' ')} is empty`;
      errors.push(rowNumber ? `Row ${rowNumber}: ${msg}` : msg);
      continue;
    }
    
    // Skip validation if optional and empty
    if (!config.required && value === '') continue;
    
    // Field-specific validation
    switch (config.dbField) {
      case 'name':
        // Check for location keywords in name
        const nameLower = value.toLowerCase();
        const hasLocationKeyword = LOCATION_KEYWORDS.some(keyword => nameLower.includes(keyword));
        
        if (hasLocationKeyword) {
          const msg = `Invalid name "${value}" (contains location)`;
          errors.push(rowNumber ? `Row ${rowNumber}: ${msg}` : msg);
        } else if (!/^[a-zA-Z\s.\-']{2,50}$/.test(value)) {
          const msg = `Invalid name "${value}" (invalid characters)`;
          errors.push(rowNumber ? `Row ${rowNumber}: ${msg}` : msg);
        }
        break;
        
      case 'experience':
        const expNum = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (isNaN(expNum) || expNum < 0 || expNum > 60) {
          const msg = `Invalid experience "${value}" (0-60 years)`;
          errors.push(rowNumber ? `Row ${rowNumber}: ${msg}` : msg);
        }
        break;
        
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          const msg = `Invalid email "${value}"`;
          errors.push(rowNumber ? `Row ${rowNumber}: ${msg}` : msg);
        }
        break;
        
      case 'phone':
        if (!/^[\+]?[\d\s\-\(\)]{5,20}$/.test(value)) {
          const msg = `Invalid phone "${value}"`;
          errors.push(rowNumber ? `Row ${rowNumber}: ${msg}` : msg);
        }
        break;
        
      case 'current_ctc':
      case 'expected_ctc':
        if (/^[a-zA-Z\s]+$/.test(value) && !/\d/.test(value)) {
          const msg = `Invalid ${config.dbField} "${value}" (needs numbers)`;
          errors.push(rowNumber ? `Row ${rowNumber}: ${msg}` : msg);
        }
        break;
    }
  }
  
  return errors;
}

// Validate all rows and STOP at first error
export function validateAllRows(rows, columnMapping) {
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // Excel rows: 1=header, 2=first data row
    const errors = validateCandidateRow(rows[i], columnMapping, rowNumber);
    
    if (errors.length > 0) {
      return errors; // STOP at first error - don't continue validating
    }
  }
  
  return [];
}

// Complete validation pipeline - one call to validate everything
export function validateExcelImport(headers, rows) {
  // Step 1: Map headers and detect duplicates/unknown columns
  const { columnMapping, errors: headerErrors } = mapExcelHeaders(headers);
  if (headerErrors.length > 0) {
    return { success: false, errors: headerErrors };
  }
  
  // Step 2: Validate required columns exist
  const requiredErrors = validateRequiredColumns(columnMapping);
  if (requiredErrors.length > 0) {
    return { success: false, errors: requiredErrors };
  }
  
  // Step 3: Validate all rows - STOP at first error
  const rowErrors = validateAllRows(rows, columnMapping);
  if (rowErrors.length > 0) {
    return { success: false, errors: rowErrors };
  }
  
  return { success: true, columnMapping };
}

// Normalize/transform row for DB insert
export function normalizeRow(row, columnMapping, foreignKeys = {}) {
  const normalized = {};
  
  for (const [fieldName, config] of Object.entries(EXPECTED_COLUMNS)) {
    const colIndex = columnMapping[fieldName];
    if (colIndex === undefined) continue;
    
    const rawValue = row[colIndex];
    let value = rawValue?.toString().trim() || null;
    
    switch (config.dbField) {
      case 'experience':
        value = parseInt(value?.replace(/[^0-9]/g, '') || '0') || 0;
        break;
      case 'job_role_id':
      case 'client_id':
      case 'office_mode_id':
      case 'funnel_stage_id':
      case 'contract_type_id':
      case 'recruiter_id':
        // Will be resolved by resolveForeignKeys()
        normalized[config.dbField] = foreignKeys[fieldName] || null;
        continue;
      default:
        normalized[config.dbField] = value || null;
    }
    
    normalized[config.dbField] = value;
  }
  
  return normalized;
}

// Resolve FK IDs from master data (with caching)
export async function resolveForeignKeys(normalizedRow, db, masterCache = {}) {
  const promises = [];
  
  const fkFields = {
    'job_role_id': { table: 'job_roles', nameField: 'job_role' },
    'client_id': { table: 'clients', nameField: 'client' },
    'office_mode_id': { table: 'office_modes', nameField: 'office_mode' },
    'funnel_stage_id': { table: 'funnel_stages', nameField: 'funnel_stage' },
    'contract_type_id': { table: 'contract_types', nameField: 'contract_type' },
    'recruiter_id': { table: 'recruiters', nameField: 'recruiter' }
  };
  
  for (const [dbField, { table, nameField }] of Object.entries(fkFields)) {
    const nameValue = normalizedRow[nameField];
    if (!nameValue || masterCache[table]) continue;
    
    promises.push(
      new Promise((resolve) => {
        db.query(`SELECT id FROM \`${table}\` WHERE LOWER(TRIM(name)) = LOWER(?)`, [nameValue], (err, results) => {
          if (err) {
            console.error(`FK lookup error ${table}:`, err);
            resolve(null);
          } else {
            const id = results[0]?.id || null;
            masterCache[table] = results; // Cache full table
            resolve(id);
          }
        });
      }).then(id => {
        if (id) normalizedRow[dbField] = id;
      })
    );
  }
  
  await Promise.all(promises);
  return normalizedRow;
}
import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.js";
import { sendEmail } from "../services/emailService.js";
import { validateExcelImport, normalizeRow } from "../utils/validation.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.get("/", verifyToken, (req, res) => {
  const { search, role_id, client_id, stage_id, experience, recruiter_id, sortBy, page = 1 } = req.query;

  const limit = 10;
  const offset = (parseInt(page) - 1) * limit;

  let query = `
    SELECT 
      c.*,
      jr.name AS role,
      cl.name AS client,
      fs.name AS status,
      om.name AS office_mode,
      ct.name AS contract_type,
      r.name AS recruiter
    FROM candidates c
    LEFT JOIN job_roles jr ON c.job_role_id = jr.id
    LEFT JOIN clients cl ON c.client_id = cl.id
    LEFT JOIN funnel_stages fs ON c.funnel_stage_id = fs.id
    LEFT JOIN office_modes om ON c.office_mode_id = om.id
    LEFT JOIN contract_types ct ON c.contract_type_id = ct.id
    LEFT JOIN recruiters r ON c.recruiter_id = r.id
    WHERE 1=1
  `;
  
  let countQuery = "SELECT COUNT(*) as total FROM candidates WHERE 1=1";
  const params = [];
  const countParams = [];

  if (search) {
    query += " AND c.name LIKE ?";
    countQuery += " AND name LIKE ?";
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
  }

  if (role_id) {
    query += " AND c.job_role_id=?";
    countQuery += " AND job_role_id=?";
    params.push(role_id);
    countParams.push(role_id);
  }

  if (client_id) {
    query += " AND c.client_id=?";
    countQuery += " AND client_id=?";
    params.push(client_id);
    countParams.push(client_id);
  }

  if (stage_id) {
    query += " AND c.funnel_stage_id=?";
    countQuery += " AND funnel_stage_id=?";
    params.push(stage_id);
    countParams.push(stage_id);
  }

  if (experience) {
    query += " AND c.experience >= ?";
    countQuery += " AND experience >= ?";
    params.push(experience);
    countParams.push(experience);
  }

  if (recruiter_id) {
    query += " AND c.recruiter_id = ?";
    countQuery += " AND recruiter_id = ?";
    params.push(recruiter_id);
    countParams.push(recruiter_id);
  }

  // Sorting
  switch (sortBy) {
    case "oldest":
      query += " ORDER BY c.id ASC";
      break;
    case "name_asc":
      query += " ORDER BY c.name ASC";
      break;
    case "name_desc":
      query += " ORDER BY c.name DESC";
      break;
    case "exp_high":
      query += " ORDER BY c.experience DESC";
      break;
    case "exp_low":
      query += " ORDER BY c.experience ASC";
      break;
    default:
      query += " ORDER BY c.id DESC"; // newest
  }

  // Get total count first
  global.db.query(countQuery, countParams, (countErr, countResult) => {
    if (countErr) return res.status(500).json(countErr);
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    const currentPage = parseInt(page);
    
    query += " LIMIT " + parseInt(limit) + " OFFSET " + parseInt(offset);

    global.db.query(query, params, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({
        candidates: result,
        total: total,
        page: currentPage,
        totalPages: totalPages
      });
    });
  });
});

router.put("/:id/status", verifyToken, (req, res) => {
  global.db.query(
    "UPDATE candidates SET status=? WHERE id=?",
    [req.body.status, req.params.id],
    () => res.json({ message: "Updated" })
  );
});

router.delete("/:id", verifyToken, (req, res) => {
  global.db.query("DELETE FROM candidates WHERE id=?", [req.params.id]);
  res.json({ message: "Deleted" });
});

router.post("/", verifyToken, upload.single("resume"), (req, res) => {
  const resume = req.file?.path || null;
  
  const { 
    name, email, phone, location, experience, 
    primary_skills, secondary_skills,
    job_role_id, client_id, office_mode_id, funnel_stage_id, contract_type_id,
    expected_ctc, current_ctc, job_location, submission_date, recruiter_id
  } = req.body;

  global.db.query(
    `INSERT INTO candidates (name, email, phone, location, experience, primary_skills, secondary_skills, job_role_id, client_id, office_mode_id, funnel_stage_id, contract_type_id, expected_ctc, current_ctc, job_location, submission_date, recruiter_id, resume)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [name, email, phone, location, experience || 0, primary_skills, secondary_skills, job_role_id, client_id, office_mode_id, funnel_stage_id, contract_type_id, expected_ctc, current_ctc, job_location, submission_date, recruiter_id, resume],
    (err, result) => {
      if (err) {
        console.error("Error inserting candidate:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Candidate Added", id: result.insertId });
    }
  );
});

router.post("/:id/send-interview", verifyToken, async (req, res) => {
  const { subject, message } = req.body;

  global.db.query(
    "SELECT * FROM candidates WHERE id=?",
    [req.params.id],
    async (err, result) => {
      if (err || !result.length)
        return res.status(404).json({ message: "Candidate not found" });

      const candidate = result[0];

      await sendEmail(candidate.email, subject, message);

      res.json({ message: "Email sent successfully" });
    }
  );
});

// Keep legacy JSON bulk endpoint (for API compatibility)
router.post("/bulk", verifyToken, (req, res) => {
  const candidates = req.body;
  
  if (!Array.isArray(candidates) || candidates.length === 0 || candidates.length > 1000) {
    return res.status(400).json({ message: "Invalid data: Must be array of 1-1000 candidates" });
  }

  const validationErrors = [];
  candidates.forEach((candidate, index) => {
    if (!candidate.name || candidate.name.trim().length < 2) {
      validationErrors.push(`Row ${index + 1}: Name missing or too short`);
    }
  });

  if (validationErrors.length > 0) {
    return res.status(400).json({ 
      message: "Validation failed", 
      errors: validationErrors.slice(0, 10)
    });
  }

  const insertQuery = `
    INSERT INTO candidates (name, email, phone, location, experience, primary_skills, 
      job_role_id, client_id, office_mode_id, funnel_stage_id, contract_type_id, 
      expected_ctc, current_ctc, job_location, submission_date, recruiter_id)
    VALUES ?`;

  const values = candidates.map(c => [
    c.name?.trim() || null, c.email?.trim() || null, c.phone?.trim() || null, c.location?.trim() || null, 
    parseInt(c.experience) || 0, c.primary_skills?.trim() || null,
    parseInt(c.job_role_id) || null, parseInt(c.client_id) || null, parseInt(c.office_mode_id) || null, 
    parseInt(c.funnel_stage_id) || null, parseInt(c.contract_type_id) || null,
    c.expected_ctc?.trim() || null, c.current_ctc?.trim() || null, c.job_location?.trim() || null,
    (c.submission_date ? (c.submission_date.includes('-') ? c.submission_date.split('-').reverse().join('-') : c.submission_date) : null) || null, parseInt(c.recruiter_id) || null
  ]);

  global.db.query(insertQuery, [values], (err, result) => {
    if (err) {
      if (err.code === 'ER_NO_REFERENCED_ROW') {
        return res.status(400).json({ message: "Foreign key violation" });
      }
      return res.status(500).json({ message: "Failed to import batch", error: err.code });
    }
    res.json({ message: `Imported ${result.affectedRows} candidates` });
  });
});

// 🔥 NEW: Complete Excel validation endpoint (case-insensitive columns)
router.post("/excel-bulk", verifyToken, multer({ dest: 'uploads/' }).single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Excel file required (form field: 'excelFile')" });
    }

    const ExcelValidator = (await import('../services/excelValidator.js')).default;
    const result = await ExcelValidator.validateAndParse(
      require('fs').readFileSync(req.file.path), 
      req.file.originalname
    );

    if (!result.success || result.validRows.length === 0) {
      // Auto-clean temp file
      require('fs').unlinkSync(req.file.path);
      return res.status(400).json({
        message: `Validation failed: ${result.report.valid}/${result.report.totalRows} valid`,
        ...result
      });
    }

    // Batch insert VALID rows only
    if (result.validRows.length > 1000) {
      return res.status(400).json({ message: "Too many valid rows (>1000). Split file." });
    }

    const insertQuery = `
      INSERT INTO candidates (
        name, email, phone, location, experience, primary_skills, secondary_skills,
        job_role_id, client_id, office_mode_id, funnel_stage_id, contract_type_id,
        offer_status, expected_ctc, current_ctc, job_location, submission_date, recruiter_id
      ) VALUES ?`;

    const dbValues = result.validRows.map(row => [
      row.name || null, row.email || null, row.phone || null, row.location || null,
      row.experience || 0, row.primary_skills || null, row.secondary_skills || null,
      row.job_role_id, row.client_id, row.office_mode_id, row.funnel_stage_id, row.contract_type_id,
      row.offer_status || 'Pending', row.expected_ctc || null, row.current_ctc || null,
      row.job_location || null, row.submission_date || null, row.recruiter_id || null
    ]);

    global.db.query(insertQuery, [dbValues], (err, insertResult) => {
      // Clean temp file
      require('fs').unlinkSync(req.file.path);
      
      if (err) {
        console.error('Excel bulk insert error:', err);
        if (err.code === 'ER_NO_REFERENCED_ROW') {
          return res.status(400).json({ message: "Foreign key error (master data missing)" });
        }
        return res.status(500).json({ message: "Insert failed", error: err.code });
      }

      res.json({
        message: `✅ Success! Imported ${insertResult.affectedRows}/${result.report.totalRows} candidates`,
        importedCount: insertResult.affectedRows,
        validationReport: result.report,
        filename: result.filename
      });
    });

  } catch (error) {
    console.error('Excel bulk error:', error);
    if (req.file) require('fs').unlinkSync(req.file.path);
    res.status(500).json({ message: "Server error during validation", error: error.message });
  }
});

router.post("/:id/send-offer", verifyToken, async (req, res) => {
  const { subject, message } = req.body;

  global.db.query(
    "SELECT * FROM candidates WHERE id=?",
    [req.params.id],
    async (err, result) => {
      if (!result.length)
        return res.status(404).json({ message: "Candidate not found" });

      const candidate = result[0];

      await sendEmail(candidate.email, subject, message);

      res.json({ message: "Offer email sent" });
    }
  );
});

// NEW: Excel API validation endpoint (JSON {headers, rows})
router.post("/excel-api-validate", verifyToken, (req, res) => {
  const { headers, rows } = req.body;
  
  if (!headers || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid input: Expect JSON {headers: string[], rows: any[][]}" 
    });
  }

  const { success, errors, columnMapping } = validateExcelImport(headers, rows);

  if (!success) {
    return res.status(400).json({ 
      success: false, 
      message: errors[0] // Show first error to user
    });
  }

  // Safe to insert now
  const normalized = rows.map(row => normalizeRow(row, columnMapping));
  
  // Batch insert (same fields/order as /bulk endpoint)
  const insertQuery = `
    INSERT INTO candidates (
      name, email, phone, location, experience, primary_skills,
      job_role_id, client_id, office_mode_id, funnel_stage_id, contract_type_id,
      expected_ctc, current_ctc, job_location, submission_date, recruiter_id
    ) VALUES ?
  `;

  const dbValues = normalized.map(n => [
    n.name || null,
    n.email || null,
    n.phone || null,
    n.location || null,
    n.experience || 0,
    n.primary_skills || null,
    n.job_role_id || null,
    n.client_id || null,
    n.office_mode_id || null,
    n.funnel_stage_id || null,
    n.contract_type_id || null,
    n.expected_ctc || null,
    n.current_ctc || null,
    n.job_location || null,
    n.submission_date || null,
    n.recruiter_id || null
  ]);

  global.db.query(insertQuery, [dbValues], (err, result) => {
    if (err) {
      console.error("Bulk insert error:", err);
      return res.status(500).json({ 
        success: false, 
        message: err.code === "ER_NO_REFERENCED_ROW" ? "Foreign key violation (master data missing)" : err.message 
      });
    }
    res.json({ 
      success: true, 
      message: `Imported ${result.affectedRows} candidates`,
      importedCount: result.affectedRows 
    });
  });
});

export default router;

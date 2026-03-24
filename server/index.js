// @ts-nocheck
import express from "express";
import cors from "cors";
import mysql from "mysql2";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import crypto from "crypto";
import nodemailer from "nodemailer";
import path from "path";
import net from "net";
import { fileURLToPath } from "url";
import { sendSetPasswordEmail, sendForgotPasswordEmail } from "./services/emailService.js";
import fs from "fs";

// Load .env relative to this file's location, not CWD
const __filename_env = fileURLToPath(import.meta.url);
const __dirname_env = path.dirname(__filename_env);
dotenv.config({ path: path.join(__dirname_env, '.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'galacticos_resumes',
    resource_type: 'auto'
  }
});

const upload = multer({ storage: storage });
// 🔐 VERIFY TOKEN MIDDLEWARE
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(403).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });

    req.user = decoded;
    next();
  });
};

// 🔐 ADMIN CHECK
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only access" });
  }
  next();
};

// 🔐 HR CHECK
const verifyHR = (req, res, next) => {
  if (req.user.role !== "hr" && req.user.role !== "admin") {
    return res.status(403).json({ message: "HR only access" });
  }
  next();
};

// 🔐 CLIENT CHECK
const verifyClient = (req, res, next) => {
  if (req.user.role !== "client" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Client only access" });
  }
  next();
};

// 📝 AUDIT LOG MIDDLEWARE
const logAudit = (action, entity_name) => {
  return (req, res, next) => {
    // We execute the DB insert after the request finishes to not block the response
    res.on("finish", () => {
      // We only care about successful writes (POST, PUT, DELETE) right now
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user_id = req.user ? req.user.id : null;
        if (!user_id) return; // Can't log if not authenticated

        let entity_id = null;
        if (req.params.id) {
          entity_id = req.params.id;
        } else if (res.locals.insertedId) {
          entity_id = res.locals.insertedId;
        }

        const details = JSON.stringify({
          body: req.body,
          query: req.query,
          method: req.method,
          url: req.originalUrl
        });

        // Insert into audit_logs table. Assuming 'db' is available globally or within scope.
        // We will do this via the db object below.
        if (global.db) {
          global.db.query(
            "INSERT INTO audit_logs (user_id, action, entity_name, entity_id, details) VALUES (?, ?, ?, ?, ?)",
            [user_id, action, entity_name, entity_id, details],
            (err) => {
              if (err) console.error("Failed to log audit action:", err);
            }
          );
        }
      }
    });
    next();
  };
};

console.log("DB CONFIG:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL
});
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "*").split(",").map(o => o.trim());
const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin || 
      allowedOrigins.includes("*") || 
      allowedOrigins.includes(origin) ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:")
    ) {
      callback(null, true);
    } else {
      console.error(`CORS Blocked Origin: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

import authRoutes from "./routes/authRoutes.js";
app.use("/api/auth", authRoutes);
app.use("/api/profile", authRoutes);  // Profile endpoints

import candidateRoutes from "./routes/candidateRoutes.js";
import referenceRoutes from "./routes/referenceRoutes.js";

app.use("/api/candidates", candidateRoutes);
app.use("/api/reference", referenceRoutes);

// Support both individual DB_* env vars and a full connection URL (e.g. Aiven service URI).
// For Aiven MySQL, SSL is usually required; you can set DB_SSL=true and optionally provide a CA via DB_SSL_CA.
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

if (process.env.DATABASE_URL || process.env.DB_URL || process.env.MYSQL_URL) {
  const url = new URL(process.env.DATABASE_URL || process.env.DB_URL || process.env.MYSQL_URL);
  dbConfig.host = url.hostname;
  dbConfig.port = Number(url.port);
  dbConfig.user = url.username;
  dbConfig.password = url.password;
  dbConfig.database = url.pathname.replace(/^\//, '');

  // Preserve any `ssl-mode` query param in the connection string (e.g. ?ssl-mode=REQUIRED)
  const sslMode = url.searchParams.get('ssl-mode');
  if (sslMode) dbConfig.ssl = { rejectUnauthorized: sslMode.toLowerCase() !== 'required' };
}

// Allow overriding SSL config via env vars (useful for Aiven or other hosted DBs)
if (process.env.DB_SSL && process.env.DB_SSL !== 'false') {
  dbConfig.ssl = dbConfig.ssl || {};
  if (process.env.DB_SSL === 'required' || process.env.DB_SSL === 'true') {
    dbConfig.ssl.rejectUnauthorized = false; // relax by default to make hosted DBs work without needing a CA
  }
  if (process.env.DB_SSL_CA) {
    dbConfig.ssl.ca = Buffer.from(process.env.DB_SSL_CA, 'base64');
  }
  if (process.env.DB_SSL_CA_PATH) {
    dbConfig.ssl.ca = fs.readFileSync(process.env.DB_SSL_CA_PATH);
  }
}

const db = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

global.db = db;
console.log("MySQL Pool Connected");

// Ensure the users table exists (needed on fresh deployments)
if (process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      await db.promise().query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role ENUM('admin','hr','client') DEFAULT 'hr',
          client_id INT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const [usersCount] = await db.promise().query("SELECT COUNT(*) as count FROM users");
      if (usersCount[0].count === 0) {
        // Force ensure all default users + create login_logs table
        const defaultUsers = [
          { name: "Admin User", email: "admin@company.com", role: "admin", client_id: null },
          { name: "HR User", email: "hr@company.com", role: "hr", client_id: null },
          { name: "Client One", email: "client1@company.com", role: "client", client_id: 1 }
        ];

        for (const user of defaultUsers) {
          const hashed = await bcrypt.hash("password123", 10);
          await db.promise().query(`
            INSERT INTO users (name, email, password, role, client_id) 
            VALUES (?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role), client_id = VALUES(client_id)
          `, [user.name, user.email, hashed, user.role, user.client_id || null]);
          console.log(`✅ Ensured default user: ${user.email} (password123)`);
        }
      }

      // Create login_logs table
      await db.promise().query(`
        CREATE TABLE IF NOT EXISTS login_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          ip_address VARCHAR(45),
          success TINYINT(1),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user (user_id),
          INDEX idx_ip (ip_address),
          INDEX idx_success (success)
        )
      `);
      console.log("✅ login_logs table ready");


    } catch (err) {
      console.error("Error ensuring default users/login_logs:", err);
    }
  })();
}



const columnsToAdd = [
  { name: 'name', type: 'VARCHAR(100)' },
  { name: 'email', type: 'VARCHAR(100)' },
  { name: 'phone', type: 'VARCHAR(20)' },
  { name: 'location', type: 'VARCHAR(100)' },
  { name: 'experience', type: 'INT' },
  { name: 'primary_skills', type: 'TEXT' },
  { name: 'secondary_skills', type: 'TEXT' },
  { name: 'resume_url', type: 'VARCHAR(255)' },
  { name: 'job_role_id', type: 'INT' },
  { name: 'client_id', type: 'INT' },
  { name: 'office_mode_id', type: 'INT' },
  { name: 'funnel_stage_id', type: 'INT' },
  { name: 'contract_type_id', type: 'INT' },
  { name: 'recruiter_id', type: 'INT' },
  { name: 'offer_status', type: 'VARCHAR(50)' },
  { name: 'expected_ctc', type: 'VARCHAR(50)' },
  { name: 'current_ctc', type: 'VARCHAR(50)' },
  { name: 'job_location', type: 'VARCHAR(100)' },
  { name: 'submission_date', type: 'DATE' },
  { name: 'client_status', type: 'VARCHAR(50)' },
  { name: 'client_feedback', type: 'TEXT' },
  { name: 'rejection_reason', type: 'TEXT' }
];



// Add each column individually with error handling
columnsToAdd.forEach(({ name, type }) => {
  db.query(`ALTER TABLE candidates ADD COLUMN ${name} ${type}`, (err) => {
    if (err) {
      // Ignore "Duplicate column" errors
      if (!err.message.includes('Duplicate column')) {
        console.log(`Note: Column ${name}:`, err.message);
      }
    } else {
      console.log(`✅ Added column: ${name}`);
    }
  });
});


console.log("✅ Skills columns migration completed");

if (process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      // Master tables
      const masterTables = [
        `CREATE TABLE IF NOT EXISTS job_roles (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`,
        `CREATE TABLE IF NOT EXISTS clients (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`,
        `CREATE TABLE IF NOT EXISTS funnel_stages (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`,
        `CREATE TABLE IF NOT EXISTS office_modes (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`,
        `CREATE TABLE IF NOT EXISTS contract_types (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`,
        `CREATE TABLE IF NOT EXISTS recruiters (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`
      ];

      for (const sql of masterTables) {
        await db.promise().query(sql);
        console.log(`✅ Master table ready`);
      }

      // Seed master data only if empty
      const tablesToCheck = ['job_roles', 'clients', 'recruiters'];
      for (const table of tablesToCheck) {
        const [count] = await db.promise().query(`SELECT COUNT(*) as count FROM \`${table}\``);
        if (count[0].count === 0) {
          const masterSeed = {
            job_roles: ['Frontend Developer', 'Backend Developer', 'Fullstack Developer', 'DevOps Engineer', 'QA Engineer'],
            funnel_stages: ['Screening', 'Interview 1', 'Interview 2', 'Technical Interview', 'Offer', 'Hired', 'Rejected'],
            office_modes: ['WFH', 'Hybrid', 'Office', 'On-site'],
            contract_types: ['Full-time', 'Contract', 'Freelance', 'Internship'],
            recruiters: ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson'],
            clients: ['Infosys', 'HCL', 'TCS', 'Wipro']
          };
          const data = masterSeed[table];
          for (const name of data) {
            await db.promise().query(`INSERT IGNORE INTO \`${table}\` (name) VALUES (?)`, [name]);
          }
          console.log(`✅ Seeded ${table}`);
        }
      }
      console.log('🎉 Master data ready!');
    } catch (err) {
      console.error('Master data init error:', err);
    }
  })();
}


// 📋 MASTER TABLES APIs
app.get("/master-data", verifyToken, async (req, res) => {
  try {
    const [roles] = await db.promise().query("SELECT * FROM job_roles");
    const [clients] = await db.promise().query("SELECT * FROM clients");
    const [funnelStages] = await db.promise().query("SELECT * FROM funnel_stages");
    const [contractTypes] = await db.promise().query("SELECT * FROM contract_types");
    const [officeModes] = await db.promise().query("SELECT * FROM office_modes");
    const [recruiters] = await db.promise().query("SELECT id, name FROM recruiters");

    console.log('Master data counts:', {
      roles: roles.length,
      clients: clients.length,
      stages: funnelStages.length,
      recruiters: recruiters.length
    });

    res.json({
      job_roles: roles,
      clients: clients,
      funnel_stages: funnelStages,
      contract_types: contractTypes,
      office_modes: officeModes,
      recruiters: recruiters
    });
  } catch (err) {
    console.error("Error fetching master data:", err);
    res.status(500).json({ message: "Server error fetching master data", error: err });
  }
});

// 🏢 ADD CLIENT API
app.post("/clients", verifyToken, (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Client name is required" });
  }

  db.query(
    "INSERT INTO clients (name) VALUES (?)",
    [name],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: "Client already exists" });
        }
        return res.status(500).json({ message: "Error adding client", error: err });
      }
      res.json({ message: "Client added successfully", id: result.insertId, name });
    }
  );
});


app.get("/admin/users", verifyToken, verifyAdmin, (req, res) => {
  db.query(`
    SELECT u.id, u.name, u.email, u.role, u.client_id, c.name as client_name 
    FROM users u 
    LEFT JOIN clients c ON u.client_id = c.id
    ORDER BY u.id DESC
  `, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.put("/admin/users/:id", verifyToken, verifyAdmin, logAudit('UPDATE_USER', 'users'), async (req, res) => {
  const { name, email, role, client_id } = req.body;
  try {
    let finalClientId = client_id || null;
    if (role !== 'client') {
      finalClientId = null;
    }
    await db.promise().query(
      "UPDATE users SET name=?, email=?, role=?, client_id=? WHERE id=?",
      [name, email, role, finalClientId, req.params.id]
    );
    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating user", error: err });
  }
});

app.delete("/admin/users/:id", verifyToken, verifyAdmin, logAudit('DELETE_USER', 'users'), async (req, res) => {
  try {
    await db.promise().query("DELETE FROM users WHERE id=?", [req.params.id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ message: "Cannot delete user. They have associated records (e.g., login logs, candidates, etc)." });
    }
    res.status(500).json({ message: "Error deleting user", error: err });
  }
});

app.post("/register", async (req, res) => {
  const { name, email, role, client } = req.body;

  // Basic validation so the client can get a useful error message
  if (!name || !email || !role) {
    return res.status(400).json({ message: "Name, email, and role are required." });
  }

  if (!["admin", "hr", "client"].includes(role)) {
    return res.status(400).json({ message: "Invalid role. Allowed values: admin, hr, client." });
  }

  try {
    const tempPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    let query = "INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)";
    let values = [name, email, hashedPassword, role];

    if (role === "client" && client) {
      const [existingClients] = await db.promise().query("SELECT id FROM clients WHERE name = ?", [client]);
      let clientId;

      if (existingClients.length > 0) {
        clientId = existingClients[0].id;
      } else {
        const [newClient] = await db.promise().query("INSERT INTO clients (name) VALUES (?)", [client]);
        clientId = newClient.insertId;
      }

      query = "INSERT INTO users (name,email,password,role,client_id) VALUES (?,?,?,?,?)";
      values = [name, email, hashedPassword, role, clientId];
    }

    const [result] = await db.promise().query(query, values);

    const token = jwt.sign(
      { id: result.insertId, email, purpose: "set_password" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    try {
      await sendSetPasswordEmail(email, name, token);
      return res.status(201).json({ message: "User created and setup email sent. ✅" });
    } catch (emailErr) {
      console.error("Failed to send setup email:", emailErr);
      // Still return success for user creation, but surface the email issue so it's easier to debug.
      return res.status(201).json({
        message: "User created successfully, but the setup email failed to send.",
        emailError: emailErr?.message || "Unknown error"
      });
    }

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: "A user with this email already exists." });
    }
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

app.post("/set-password", async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== "set_password") {
      return res.status(400).json({ message: "Invalid token" });
    }

    const hashed = await bcrypt.hash(password, 10);

    db.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashed, decoded.id],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });
        if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
        res.json({ message: "Password updated successfully" });
      }
    );
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});



app.post("/candidates/:id/send-interview", verifyToken, verifyHR, async (req, res) => {
  const { subject, message } = req.body;

  db.query(
    "SELECT * FROM candidates WHERE id=?",
    [req.params.id],
    async (err, result) => {
      if (err) return res.status(500).json(err);
      if (!result.length) return res.status(404).json({ message: "Candidate not found" });

      const candidate = result[0];

      try {
        await transporter.sendMail({
          from: `"Galacticos HR" <${process.env.EMAIL_USER}>`,
          to: candidate.email,
          subject: subject,
          html: message.replace(/\n/g, "<br>")
        });

        res.json({ message: "Interview email sent successfully" });
      } catch (emailErr) {
        console.error("Email Error:", emailErr);
        res.status(500).json({ message: "Failed to send email" });
      }
    }
  );
});

app.post("/candidates/:id/send-rejection", verifyToken, verifyHR, async (req, res) => {
  const { subject, message } = req.body;

  db.query("SELECT * FROM candidates WHERE id=?", [req.params.id], async (err, result) => {
    if (!result.length) return res.status(404).json({ message: "Candidate not found" });

    const candidate = result[0];

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: candidate.email,
      subject,
      html: message.replace(/\n/g, "<br>")
    });

    res.json({ message: "Rejection email sent" });
  });
});


app.post("/candidates/:id/send-offer", verifyToken, verifyHR, async (req, res) => {
  const { subject, message } = req.body;

  db.query("SELECT * FROM candidates WHERE id=?", [req.params.id], async (err, result) => {
    if (!result.length) return res.status(404).json({ message: "Candidate not found" });

    const candidate = result[0];

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: candidate.email,
      subject,
      html: message.replace(/\n/g, "<br>")
    });

    res.json({ message: "Offer email sent" });
  });
});

// 📊 DASHBOARD STATS API
app.get("/dashboard/stats", verifyToken, async (req, res) => {
  try {
    const isClient = req.user.role === 'client';
    const clientId = req.user.client_id;
    const params = isClient ? [clientId] : [];
    const clientCondition = isClient ? 'WHERE client_id = ?' : '';
    const andClientCondition = isClient ? 'AND c.client_id = ?' : '';

    // 1. Total Candidates
    const [[{ total_candidates }]] = await db.promise().query(`SELECT COUNT(*) AS total_candidates FROM candidates ${clientCondition}`, params);

    // 2. Open Positions / Job Roles count
    const [[{ open_positions }]] = await db.promise().query("SELECT COUNT(*) AS open_positions FROM job_roles");

    // 3. Candidates per role
    const [candidates_per_role] = await db.promise().query(`
      SELECT r.name as role, COUNT(c.id) as count
      FROM job_roles r
      LEFT JOIN candidates c ON c.job_role_id = r.id ${andClientCondition}
      GROUP BY r.id
    `, params);

    // 4. Funnel stats
    const [funnel_stats] = await db.promise().query(`
      SELECT f.name as stage, COUNT(c.id) as count
      FROM funnel_stages f
      LEFT JOIN candidates c ON c.funnel_stage_id = f.id ${andClientCondition}
      GROUP BY f.id
    `, params);

    // 5. Recent Candidates
    const [recent_candidates] = await db.promise().query(`
      SELECT c.name, r.name as role, f.name as status
      FROM candidates c
      LEFT JOIN job_roles r ON c.job_role_id = r.id
      LEFT JOIN funnel_stages f ON c.funnel_stage_id = f.id
      ${isClient ? 'WHERE c.client_id = ?' : ''}
      ORDER BY c.id DESC LIMIT 5
    `, params);

    // 6. Placements per client (Only for Admin/HR)
    let placements_per_client = [];
    if (!isClient) {
      const [pc] = await db.promise().query(`
        SELECT cl.name as client, COUNT(c.id) as count
        FROM clients cl
        LEFT JOIN candidates c ON c.client_id = cl.id 
        LEFT JOIN funnel_stages f ON c.funnel_stage_id = f.id
        WHERE f.name LIKE '%Hired%' OR f.name LIKE '%Select%' OR f.name LIKE '%Offer%'
        GROUP BY cl.id
        ORDER BY count DESC
      `);
      placements_per_client = pc;
    }

    // 7. Stuck in Interview > 7 days
    const [[{ stuck_candidates }]] = await db.promise().query(`
      SELECT COUNT(*) AS stuck_candidates 
      FROM candidates c
      JOIN funnel_stages f ON c.funnel_stage_id = f.id
      WHERE f.name LIKE '%Interview%' AND DATEDIFF(NOW(), c.created_at) > 7 ${andClientCondition}
    `, params);

    // 8. Hiring Trends
    const [[{ hired_this_month }]] = await db.promise().query(`
      SELECT COUNT(*) AS hired_this_month 
      FROM candidates c
      JOIN funnel_stages f ON c.funnel_stage_id = f.id
      WHERE f.name LIKE '%Hired%' AND MONTH(c.created_at) = MONTH(CURRENT_DATE()) AND YEAR(c.created_at) = YEAR(CURRENT_DATE()) ${andClientCondition}
    `, params);

    // 9. Conversion Rate (Screening -> Selected)
    const [[{ total_screened }]] = await db.promise().query(`SELECT COUNT(*) AS total_screened FROM candidates ${clientCondition}`, params);
    const [[{ total_hired }]] = await db.promise().query(`
      SELECT COUNT(*) AS total_hired
      FROM candidates c
      JOIN funnel_stages f ON c.funnel_stage_id = f.id
      WHERE (f.name LIKE '%Hired%' OR f.name LIKE '%Offer%') ${andClientCondition}
    `, params);
    const conversion_rate = total_screened > 0 ? ((total_hired / total_screened) * 100).toFixed(1) : 0;

    res.json({
      total_candidates,
      open_positions,
      candidates_per_role,
      funnel_stats,
      recent_candidates,
      placements_per_client,
      stuck_candidates,
      hired_this_month,
      conversion_rate
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
});

// 📅 INTERVIEWS API
app.get("/interviews", verifyToken, (req, res) => {
  db.query(`
    SELECT i.*, c.name as candidate_name, c.role as candidate_role 
    FROM interviews i 
    JOIN candidates c ON i.candidate_id = c.id 
    ORDER BY i.scheduled_at ASC
  `, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post("/interviews", verifyToken, verifyHR, (req, res) => {
  const { candidate_id, interviewer_name, scheduled_at, meet_link } = req.body;
  if (!candidate_id || !scheduled_at) {
    return res.status(400).json({ message: "candidate_id and scheduled_at are required" });
  }

  db.query(
    "INSERT INTO interviews (candidate_id, interviewer_name, scheduled_at, meet_link) VALUES (?, ?, ?, ?)",
    [candidate_id, interviewer_name, scheduled_at, meet_link],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Interview scheduled successfully", id: result.insertId });
    }
  );
});

app.get("/debug-exp", (req, res) => {
  db.query("SELECT id, name, experience FROM candidates LIMIT 20", (err, result) => {
    if (err) {
      console.log("DEBUG ERR:", err);
      return res.json(err);
    }
    console.log("DEBUG EXP RESULTS:", result);
    res.json(result);
  });
});

app.get("/candidates", verifyToken, (req, res) => {
  const { search, role_id, stage_id, client_id, location, experience, sortBy, recruiter_id, page = 1, limit: queryLimit } = req.query;

  const limit = queryLimit === 'all' ? null : (parseInt(queryLimit) || 10);
  const offset = (parseInt(page) - 1) * (limit || 10);

  let query = `
    SELECT 
      c.id, c.name, c.email, c.phone, c.location, c.experience, 
      c.primary_skills, c.secondary_skills,
      c.offer_status, c.expected_ctc, c.current_ctc, c.job_location, c.submission_date, c.created_at,
      c.resume_url, c.client_status, c.client_feedback,
      r.name AS role, r.id AS role_id,
      cl.name AS client, cl.id AS client_id,
      o.name AS office_mode, o.id AS office_mode_id,
      f.name AS status, f.id AS funnel_stage_id,
      ct.name AS contract_type, ct.id AS contract_type_id,
      rec.name AS recruiter
    FROM candidates c
    LEFT JOIN job_roles r ON c.job_role_id = r.id
    LEFT JOIN clients cl ON c.client_id = cl.id
    LEFT JOIN office_modes o ON c.office_mode_id = o.id
    LEFT JOIN funnel_stages f ON c.funnel_stage_id = f.id
    LEFT JOIN contract_types ct ON c.contract_type_id = ct.id
    LEFT JOIN recruiters rec ON c.recruiter_id = rec.id
    WHERE 1=1
  `;
  
  // Build count query
  let countQuery = "SELECT COUNT(*) as total FROM candidates c WHERE 1=1";
  const params = [];
  const countParams = [];

  if (search) {
    query += " AND c.name LIKE ?";
    countQuery += " AND c.name LIKE ?";
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
  }

  if (role_id) {
    query += " AND c.job_role_id=?";
    countQuery += " AND c.job_role_id=?";
    params.push(role_id);
    countParams.push(role_id);
  }

  if (stage_id) {
    query += " AND c.funnel_stage_id=?";
    countQuery += " AND c.funnel_stage_id=?";
    params.push(stage_id);
    countParams.push(stage_id);
  }

  if (req.user.role === 'client') {
    query += " AND c.client_id=?";
    countQuery += " AND c.client_id=?";
    params.push(req.user.client_id);
    countParams.push(req.user.client_id);
  } else if (client_id) {
    query += " AND c.client_id=?";
    countQuery += " AND c.client_id=?";
    params.push(client_id);
    countParams.push(client_id);
  }

  if (location) {
    query += " AND c.location LIKE ?";
    countQuery += " AND c.location LIKE ?";
    params.push(`%${location}%`);
    countParams.push(`%${location}%`);
  }

  if (recruiter_id) {
    query += " AND c.recruiter_id=?";
    countQuery += " AND c.recruiter_id=?";
    params.push(recruiter_id);
    countParams.push(recruiter_id);
  }

  if (experience) {
    query += " AND CAST(c.experience AS UNSIGNED) >= ?";
    countQuery += " AND CAST(c.experience AS UNSIGNED) >= ?";
    params.push(parseInt(experience, 10));
    countParams.push(parseInt(experience, 10));
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
      query += " ORDER BY CAST(c.experience AS UNSIGNED) DESC";
      break;
    case "exp_low":
      query += " ORDER BY CAST(c.experience AS UNSIGNED) ASC";
      break;
    default:
      query += " ORDER BY c.id DESC"; // newest
  }

  // Get total count first
  db.query(countQuery, countParams, (countErr, countResult) => {
    if (countErr) {
      console.error("GET /candidates COUNT QUERY ERROR:", countErr, countQuery, countParams);
      return res.status(500).json(countErr);
    }
    
    const total = countResult[0].total;
    const totalPages = limit ? Math.ceil(total / limit) : 1;
    const currentPage = parseInt(page);
    
    if (limit) {
      query += " LIMIT " + parseInt(limit) + " OFFSET " + parseInt(offset);
    }

    db.query(query, params, (err, result) => {
      if (err) {
        console.error("GET /candidates MAIN QUERY ERROR:", err, query, params);
        return res.status(500).json(err);
      }
      res.json({
        candidates: result,
        total: total,
        page: currentPage,
        totalPages: totalPages
      });
    });
  });
});

app.post("/candidates", verifyToken, verifyHR, upload.single("resume"), logAudit('CREATE_CANDIDATE', 'candidates'), (req, res) => {
  const {
    name, email, phone, location, experience = '0',
    primary_skills = '', secondary_skills = '',
    job_role_id, client_id, office_mode_id,
    funnel_stage_id, contract_type_id,
    offer_status = 'Pending', expected_ctc = '', current_ctc = '',
    job_location = '', submission_date, recruiter_id
  } = req.body;

  // Enhanced validation matching client-side
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: "Name is required (min 2 chars), no locations/remote" });
  }
  if (experience && (isNaN(parseInt(experience)) || parseInt(experience) < 0 || parseInt(experience) > 50)) {
    return res.status(400).json({ message: "Experience must be 0-50 years" });
  }
  if (!job_role_id || !client_id || !funnel_stage_id) {
    return res.status(400).json({ message: "Job role, client, and funnel stage IDs required" });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const resume_url = req.file ? req.file.path : null;

  const sql = `
    INSERT INTO candidates 
    (name, email, phone, location, experience, primary_skills, secondary_skills, 
     job_role_id, client_id, office_mode_id, funnel_stage_id, contract_type_id, 
     offer_status, expected_ctc, current_ctc, job_location, submission_date, recruiter_id, resume_url)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  const params = [
    name.trim(), email?.trim() || null, phone?.trim() || null, 
    location?.trim() || null, parseInt(experience) || 0, 
    primary_skills?.trim() || null, secondary_skills?.trim() || null,
    parseInt(job_role_id), parseInt(client_id), parseInt(office_mode_id) || null,
    parseInt(funnel_stage_id), parseInt(contract_type_id) || null,
    offer_status, expected_ctc?.trim() || null, current_ctc?.trim() || null,
    job_location?.trim() || null, submission_date || null, parseInt(recruiter_id) || null,
    resume_url
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("POST /candidates ERROR:", {
        error: err.code,
        message: err.message,
        sqlState: err.sqlMessage,
        params: params.slice(0, 5) + '...',
        user: req.user?.id
      });
      if (err.code === 'ER_NO_REFERENCED_ROW') {
        return res.status(400).json({ message: "Invalid FK: job_role_id/client_id/funnel_stage_id not found" });
      }
      return res.status(500).json({ 
        message: "Failed to add candidate", 
        error: err.message 
      });
    }
    console.log(`✅ Candidate added: ID ${result.insertId} by ${req.user.id}`);
    res.json({ message: "Candidate added successfully", id: result.insertId });
  });
});

// 📥 EXCEL BULK IMPORT API
app.post("/candidates/bulk", verifyToken, verifyHR, (req, res) => {
  const candidates = req.body; // Expects an array of candidate objects

  if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ message: "No data provided for bulk import" });
  }

  const sql = `
    INSERT INTO candidates 
    (name, email, phone, location, experience, job_role_id, client_id, office_mode_id, funnel_stage_id, contract_type_id, offer_status, current_ctc, expected_ctc, recruiter_id, job_location, submission_date)
    VALUES ?
  `;

  const parseDate = (d) => {
    if (!d) return null;
    const str = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str.split('-').reverse().join('-');
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str.split('/').reverse().join('-');
    if (!isNaN(Number(str)) && Number(str) > 20000) {
      // Excel serial date approx
      const date = new Date((Number(str) - (25567 + 2)) * 86400 * 1000);
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    }
    const dObj = new Date(str);
    if (!isNaN(dObj.getTime())) return dObj.toISOString().split('T')[0];
    return null;
  };

  const values = candidates.map(c => [
    c.name,
    c.email,
    c.phone,
    c.location,
    c.experience,
    c.job_role_id,
    c.client_id,
    c.office_mode_id,
    c.funnel_stage_id,
    c.contract_type_id,
    c.offer_status || 'Pending',
    c.current_ctc || '',
    c.expected_ctc || '',
    c.recruiter_id,
    c.job_location || '',
    parseDate(c.submission_date)
  ]);

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Bulk Insert Error:", err);
      return res.status(500).json({ message: "Failed to import batch", error: err });
    }
    res.json({ message: `Successfully imported ${result.affectedRows} candidates.` });
  });
});

// 📚 ADD NEW REFERENCE DATA ENDPOINTS (Auto-create missing data during import)

// Add new job role
app.post("/reference/job-roles", verifyToken, verifyHR, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Job role name required" });

  db.query("INSERT INTO job_roles (name) VALUES (?)", [name], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: "Job role already exists" });
      }
      return res.status(500).json({ message: "Failed to add job role", error: err });
    }
    res.json({ id: result.insertId, name: name, message: "Job role added successfully" });
  });
});

// Add new client
app.post("/reference/clients", verifyToken, verifyHR, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Client name required" });

  db.query("INSERT INTO clients (name) VALUES (?)", [name], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: "Client already exists" });
      }
      return res.status(500).json({ message: "Failed to add client", error: err });
    }
    res.json({ id: result.insertId, name: name, message: "Client added successfully" });
  });
});

// Add new office mode
app.post("/reference/office-modes", verifyToken, verifyHR, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Office mode name required" });

  db.query("INSERT INTO office_modes (name) VALUES (?)", [name], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: "Office mode already exists" });
      }
      return res.status(500).json({ message: "Failed to add office mode", error: err });
    }
    res.json({ id: result.insertId, name: name, message: "Office mode added successfully" });
  });
});

// Add new contract type
app.post("/reference/contract-types", verifyToken, verifyHR, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Contract type name required" });

  db.query("INSERT INTO contract_types (name) VALUES (?)", [name], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: "Contract type already exists" });
      }
      return res.status(500).json({ message: "Failed to add contract type", error: err });
    }
    res.json({ id: result.insertId, name: name, message: "Contract type added successfully" });
  });
});

// Add new recruiter
app.post("/reference/recruiters", verifyToken, verifyHR, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Recruiter name required" });

  db.query("INSERT INTO recruiters (name) VALUES (?)", [name], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: "Recruiter already exists" });
      }
      return res.status(500).json({ message: "Failed to add recruiter", error: err });
    }
    res.json({ id: result.insertId, name: name, message: "Recruiter added successfully" });
  });
});

app.put("/candidates/:id/status", verifyToken, verifyHR, logAudit('UPDATE_CANDIDATE_STATUS', 'candidates'), (req, res) => {
  const { funnel_stage_id, rejection_reason } = req.body;

  db.query(
    "UPDATE candidates SET funnel_stage_id=?, rejection_reason=? WHERE id=?",
    [funnel_stage_id, rejection_reason || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Status updated successfully" });
    }
  );
});


app.get("/candidates/:id", verifyToken, verifyHR, (req, res) => {
  const query = `
    SELECT 
      c.*,
      r.name AS role,
      cl.name AS client,
      o.name AS office_mode,
      f.name AS status,
      ct.name AS contract_type,
      rec.name AS recruiter
    FROM candidates c
    LEFT JOIN job_roles r ON c.job_role_id = r.id
    LEFT JOIN clients cl ON c.client_id = cl.id
    LEFT JOIN office_modes o ON c.office_mode_id = o.id
    LEFT JOIN funnel_stages f ON c.funnel_stage_id = f.id
    LEFT JOIN contract_types ct ON c.contract_type_id = ct.id
    LEFT JOIN recruiters rec ON c.recruiter_id = rec.id
    WHERE c.id = ?
  `;

  db.query(query, [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result.length) return res.status(404).json({ message: "Candidate not found" });

    // Check client authorization
    if (req.user.role === 'client' && result[0].client_id !== req.user.client_id) {
      return res.status(403).json({ message: "Client only access" });
    }

    res.json(result[0]);
  });
});

app.put("/candidates/:id", verifyToken, verifyAdmin, upload.single("resume"), logAudit('UPDATE_CANDIDATE', 'candidates'), (req, res) => {
  const {
    name, email, phone, location, experience,
    primary_skills, secondary_skills,
    job_role_id, client_id, office_mode_id,
    funnel_stage_id, contract_type_id,
    offer_status, expected_ctc, current_ctc, job_location, recruiter_id, submission_date
  } = req.body;

  const resume_url = req.file ? req.file.path : null;

  let sql = `
    UPDATE candidates 
    SET name=?, email=?, phone=?, location=?, experience=?, primary_skills=?, secondary_skills=?, job_role_id=?, client_id=?, office_mode_id=?, funnel_stage_id=?, contract_type_id=?, offer_status=?, expected_ctc=?, current_ctc=?, job_location=?, recruiter_id=?, submission_date=?
  `;
  const params = [
    name, 
    email, 
    phone, 
    location, 
    experience === "" ? null : experience, 
    primary_skills, 
    secondary_skills, 
    job_role_id || null, 
    client_id || null, 
    office_mode_id || null, 
    funnel_stage_id || null, 
    contract_type_id || null, 
    offer_status || 'Pending', 
    expected_ctc, 
    current_ctc, 
    job_location, 
    recruiter_id || null,
    submission_date || null
  ];

  // Add resume_url to the query if a new file was uploaded
  if (resume_url) {
    sql += ", resume_url = ?";
    params.push(resume_url);
  }

  sql += " WHERE id = ?";
  params.push(req.params.id);

  db.query(sql, params, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Candidate updated successfully" });
  });
});

app.put("/candidates/:id/client-feedback", verifyToken, logAudit('UPDATE_CLIENT_FEEDBACK', 'candidates'), (req, res) => {
  const { client_status, client_feedback } = req.body;
  if (!['Pending', 'Approved', 'Rejected'].includes(client_status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  let query = "UPDATE candidates SET client_status=?, client_feedback=? WHERE id=?";
  const params = [client_status, client_feedback || null, req.params.id];

  if (req.user.role === 'client') {
    query += " AND client_id=?";
    params.push(req.user.client_id);
  }

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Candidate not found or unauthorized" });
    res.json({ message: "Feedback submitted successfully" });
  });
});

app.delete("/candidates/:id", verifyToken, verifyAdmin, logAudit('DELETE_CANDIDATE', 'candidates'), (req, res) => {
  db.query(
    "DELETE FROM candidates WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Candidate deleted" });
    }
  );
});

// ==========================================
// 💬 COMMENTS APIs
// ==========================================

// Create candidate_comments table if not exists
db.query(`
  CREATE TABLE IF NOT EXISTS candidate_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`, (err) => {
  if (err) console.error("Error creating candidate_comments table:", err);
  else console.log("candidate_comments table ready");
});

// ➕ Add Comment API
app.post("/candidates/:id/comments", verifyToken, (req, res) => {
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ message: "Comment required" });

  db.query(
    "INSERT INTO candidate_comments (candidate_id, user_id, comment) VALUES (?, ?, ?)",
    [req.params.id, req.user.id, comment],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Comment added" });
    }
  );
});

// 📥 Get Comments API
app.get("/candidates/:id/comments", verifyToken, (req, res) => {
  db.query(`
    SELECT cc.*, u.name as user_name, u.role
    FROM candidate_comments cc
    JOIN users u ON cc.user_id = u.id
    WHERE cc.candidate_id=?
    ORDER BY cc.created_at DESC
  `, [req.params.id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});


app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const user = results[0];
      console.log("Login attempt for:", email);
      
      const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
      const match = await bcrypt.compare(password, user.password);
      
      // Log to DB
      db.query(
        "INSERT INTO login_logs (user_id, ip_address, success) VALUES (?, ?, ?)",
        [match ? user.id : null, ip, match],
        (logErr) => { if (logErr) console.error("Login log failed:", logErr); }
      );
      
      console.log(`Login ${match ? 'SUCCESS' : 'FAILED'} from IP: ${ip}`);
      
      if (!match) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, client_id: user.client_id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          client_id: user.client_id
        }
      });
    }
  );
});


// ==========================================
// 🛡️ ADMIN & SECURITY APIS
// ==========================================

// 📊 Admin Analytics
app.get("/admin/analytics", verifyToken, verifyAdmin, async (req, res) => {
  try {
    // 1. Rejection Reasons
    const [rejection_analytics] = await db.promise().query(`
      SELECT rejection_reason, COUNT(*) as count 
      FROM candidates 
      WHERE rejection_reason IS NOT NULL 
      GROUP BY rejection_reason
    `);

    // 2. Avg Time to Hire (in days)
    const [[{ avg_time_to_hire }]] = await db.promise().query(`
      SELECT AVG(DATEDIFF(updated_at, created_at)) as avg_time_to_hire 
      FROM candidates c
      JOIN funnel_stages f ON c.funnel_stage_id = f.id
      WHERE f.name LIKE '%Hired%' OR f.name LIKE '%Offer%'
    `);

    // 3. Funnel Drop-off %
    const [funnel_counts] = await db.promise().query(`
      SELECT f.name as stage, COUNT(c.id) as count
      FROM funnel_stages f
      LEFT JOIN candidates c ON c.funnel_stage_id = f.id
      GROUP BY f.id
      ORDER BY f.id
    `);

    // 4. Best Recruiter Performance (Candidates successfully hired)
    const [best_recruiters] = await db.promise().query(`
      SELECT r.name, COUNT(c.id) as hires
      FROM recruiters r
      JOIN candidates c ON c.recruiter_id = r.id
      JOIN funnel_stages f ON c.funnel_stage_id = f.id
      WHERE f.name LIKE '%Hired%' OR f.name LIKE '%Offer%'
      GROUP BY r.id
      ORDER BY hires DESC
      LIMIT 5
    `);

    res.json({
      rejection_analytics,
      avg_time_to_hire: avg_time_to_hire ? Math.round(avg_time_to_hire) : 0,
      funnel_counts,
      best_recruiters
    });
  } catch (err) {
    console.error("Admin Analytics Error:", err);
    res.status(500).json({ message: "Error fetching admin analytics" });
  }
});

// 📜 Audit Logs
app.get("/admin/audit-logs", verifyToken, verifyAdmin, (req, res) => {
  db.query(`
    SELECT a.*, u.name as user_name 
    FROM audit_logs a 
    LEFT JOIN users u ON a.user_id = u.id 
    ORDER BY a.created_at DESC LIMIT 100
  `, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// 🔐 Login Logs
app.get("/admin/login-logs", verifyToken, verifyAdmin, (req, res) => {
  db.query(`
    SELECT l.*, u.name as user_name, u.email 
    FROM login_logs l 
    LEFT JOIN users u ON l.user_id = u.id 
    ORDER BY l.created_at DESC LIMIT 100
  `, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// 👥 Update User Role (Admin Only)
app.put("/admin/users/:id/role", verifyToken, verifyAdmin, logAudit('UPDATE_USER_ROLE', 'users'), (req, res) => {
  const { role } = req.body;
  if (!['admin', 'hr', 'client'].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  db.query("UPDATE users SET role=? WHERE id=?", [role, req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Role updated successfully" });
  });
});

// 🏢 Subscriptions Management
app.get("/admin/subscriptions", verifyToken, verifyAdmin, (req, res) => {
  db.query(`
    SELECT s.*, c.name as client_name 
    FROM subscriptions s 
    JOIN clients c ON s.client_id = c.id
  `, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post("/admin/subscriptions", verifyToken, verifyAdmin, logAudit('CREATE_SUBSCRIPTION', 'subscriptions'), (req, res) => {
  const { client_id, plan_name, end_date } = req.body;
  db.query(
    "INSERT INTO subscriptions (client_id, plan_name, end_date) VALUES (?, ?, ?)",
    [client_id, plan_name, end_date || null],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Subscription added", id: result.insertId });
    }
  );
});

// 🔑 Password Reset flows

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 3600000);

  db.query("SELECT name FROM users WHERE email=?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (results.length === 0) return res.json({ message: "If the email is registered, a reset link will be sent" });

    const name = results[0].name;
    db.query("UPDATE users SET reset_token=?, reset_token_expiry=? WHERE email=?", [token, expiry, email], async (err2) => {
      if (err2) return res.status(500).json({ message: "Server error" });
      try {
        await sendForgotPasswordEmail(email, name, token);
      } catch (e) {
        console.error("Reset email failed:", e);
      }
      res.json({ message: "If the email is registered, a reset link will be sent" });
    });
  });
});

app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: "Missing required fields" });

  db.query("SELECT id FROM users WHERE reset_token=? AND reset_token_expiry > NOW()", [token], async (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) return res.status(400).json({ message: "Invalid or expired token" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.query("UPDATE users SET password=?, reset_token=NULL, reset_token_expiry=NULL WHERE id=?", [hashedPassword, results[0].id], (updateErr) => {
      if (updateErr) return res.status(500).json(updateErr);
      res.json({ message: "Password updated successfully" });
    });
  });
});






// Determine correct __dirname in ESM (so paths work in Docker/Render)
const __filename = __filename_env;
const __dirname = __dirname_env;

// serve React build
// correct path in container relative to server folder
const clientDistPath = path.join(__dirname, "..", "client/dist");
app.use(express.static(clientDistPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`)).on("error", (err) => {
  console.error(`Failed to start server on port ${PORT}:`, err.message);
  process.exit(1);
});

// Ensure audit_logs table exists (prevents runtime errors when audit logging is enabled)
(async () => {
  try {
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(255) NOT NULL,
        entity_name VARCHAR(100),
        entity_id INT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ audit_logs table ready");
  } catch (err) {
    console.error("Error ensuring audit_logs table:", err);
  }
})();
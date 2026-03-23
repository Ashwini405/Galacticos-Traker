import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const initDB = async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'defaultdb', 
    ssl: { rejectUnauthorized: false }
  });

  console.log('🔄 Initializing production DB...');

  // 1. Core tables
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','hr','client') DEFAULT 'hr',
      client_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS login_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      ip_address VARCHAR(45),
      success TINYINT(1),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_ip (ip_address)
    )`,
    `CREATE TABLE IF NOT EXISTS candidates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100),
      phone VARCHAR(20),
      location VARCHAR(100),
      experience INT DEFAULT 0,
      job_role_id INT,
      client_id INT,
      funnel_stage_id INT,
      office_mode_id INT,
      contract_type_id INT,
      offer_status VARCHAR(50) DEFAULT 'Pending',
      rejection_reason TEXT,
      expected_ctc VARCHAR(50),
      current_ctc VARCHAR(50),
      job_location VARCHAR(100),
      submission_date DATE,
      recruiter_id INT,
      resume_url VARCHAR(255),
      client_status VARCHAR(50) DEFAULT 'Pending',
      client_feedback TEXT,
      primary_skills TEXT,
      secondary_skills TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    // Master data tables
    `CREATE TABLE IF NOT EXISTS job_roles (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`,
    `CREATE TABLE IF NOT EXISTS clients (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`,
    `CREATE TABLE IF NOT EXISTS funnel_stages (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`,
    `CREATE TABLE IF NOT EXISTS office_modes (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`,
    `CREATE TABLE IF NOT EXISTS contract_types (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`,
    `CREATE TABLE IF NOT EXISTS recruiters (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) UNIQUE)`
  ];

  for (const sql of tables) {
    await db.execute(sql);
    console.log('✅ Table ready');
  }

  // 2. Seed master data
  const masterData = {
    job_roles: ['Frontend Developer', 'Backend Developer', 'Fullstack Developer', 'DevOps Engineer'],
    funnel_stages: ['Screening', 'Interview 1', 'Interview 2', 'Offer', 'Hired', 'Rejected'],
    office_modes: ['WFH', 'Hybrid', 'Office'],
    contract_types: ['Full-time', 'Contract', 'Freelance'],
    recruiters: ['John Doe', 'Jane Smith', 'Mike Johnson']
  };

  for (const [table, data] of Object.entries(masterData)) {
    for (const name of data) {
      await db.execute(`INSERT IGNORE INTO ${table} (name) VALUES (?)`, [name]);
    }
  }
  console.log('✅ Master data seeded');

  // 3. Seed default users
  const defaultUsers = [
    { name: "Admin User", email: "admin@company.com", role: "admin", client_id: null },
    { name: "HR User", email: "hr@company.com", role: "hr", client_id: null },
    { name: "Client One", email: "client1@company.com", role: "client", client_id: 1 }
  ];

  for (const user of defaultUsers) {
    const hashed = await bcrypt.hash("password123", 10);
    await db.execute(`
      INSERT INTO users (name, email, password, role, client_id) 
      VALUES (?, ?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE password = ?, role = ?, client_id = ?
    `, [user.name, user.email, hashed, user.role, user.client_id || null, hashed, user.role, user.client_id || null]);
    console.log(`✅ User ensured: ${user.email}`);
  }

  // 4. Add missing columns to candidates
  const columns = [
    'rejection_reason TEXT',
    'client_status VARCHAR(50) DEFAULT "Pending"',
    'client_feedback TEXT',
    'primary_skills TEXT',
    'secondary_skills TEXT'
  ];

  for (const col of columns) {
    try {
      await db.execute(`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ${col}`);
    } catch (e) {}
  }

  await db.end();
  console.log('🎉 Production DB fully initialized!');
};

initDB().catch(console.error);


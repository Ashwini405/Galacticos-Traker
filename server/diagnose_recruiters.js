const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'recruitmentDB'
});

db.connect(err => {
  if (err) {
    console.error('DB Error:', err);
    return;
  }
  
  console.log('🔍 Recruiter Filter Diagnostics:');
  
  // 1. Recruiters count
  db.query('SELECT COUNT(*) as recruiter_count FROM recruiters', (err, r) => {
    console.log('Recruiters:', r[0].recruiter_count);
  });
  
  // 2. Sample recruiters
  db.query('SELECT * FROM recruiters LIMIT 5', (err, recruiters) => {
    console.log('Sample recruiters:', recruiters.map(r => ({id: r.id, name: r.name})));
  });
  
  // 3. Candidates with recruiter_id
  db.query('SELECT COUNT(*) as candidates_with_recruiter FROM candidates WHERE recruiter_id IS NOT NULL', (err, c) => {
    console.log('Candidates with recruiter_id:', c[0].candidates_with_recruiter);
  });
  
  // 4. Test filter query (recruiter_id=1)
  db.query('SELECT COUNT(*) as filtered FROM candidates WHERE recruiter_id = 1', (err, f) => {
    console.log('Test filter (recruiter_id=1):', f[0].filtered);
  });
  
  setTimeout(() => db.end(), 1000);
});


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
    console.error('❌ DB Error:', err.message);
    process.exit(1);
  }
  
  console.log('🔍 Recruiter Filter Diagnostics\n');
  console.log('='.repeat(50));
  
  // 1. Recruiters count & sample
  db.query('SELECT COUNT(*) as recruiter_count FROM recruiters', (err, r) => {
    if (err) console.error('Recruiters error:', err);
    else console.log(`📊 Recruiters total: ${r[0].recruiter_count}`);
  });
  
  db.query('SELECT id, name FROM recruiters LIMIT 5', (err, recruiters) => {
    if (err) console.error('Sample recruiters error:', err);
    else {
      console.log('👥 Sample recruiters:', recruiters.map(r => `ID:${r.id} "${r.name}"`).join(', ') || 'None');
    }
  });
  
  // 2. Candidates with recruiter_id
  db.query('SELECT COUNT(*) as candidates_with_recruiter FROM candidates WHERE recruiter_id IS NOT NULL', (err, c) => {
    if (err) console.error('Candidates error:', err);
    else console.log(`🎯 Candidates WITH recruiter_id: ${c[0].candidates_with_recruiter}`);
  });
  
  // 3. Total candidates
  db.query('SELECT COUNT(*) as total_candidates FROM candidates', (err, t) => {
    if (err) console.error('Total candidates error:', err);
    else console.log(`📈 Total candidates: ${t[0].total_candidates}`);
  });
  
  // 4. Test filter queries
  db.query('SELECT COUNT(*) as ramya_count FROM candidates WHERE recruiter_id = 1', (err, f1) => {
    if (err) console.error('Ramya filter error:', err);
    else console.log(`🔎 Test filter recruiter_id=1: ${f1[0].ramya_count} candidates`);
  });
  
  setTimeout(() => {
    console.log('\n✅ Diagnostics complete. Reply with this output!');
    db.end();
  }, 500);
});


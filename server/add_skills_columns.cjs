const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'recruitmentDB'
});

db.connect(err => {
  if (err) {
    console.error('DB Connection Failed:', err);
    process.exit(1);
  }
  
  // Add primary_skills and secondary_skills columns
  const sql = `
    ALTER TABLE candidates 
    ADD COLUMN primary_skills TEXT,
    ADD COLUMN secondary_skills TEXT
  `;
  
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error adding columns:', err.message);
    } else {
      console.log('✅ Skills columns added successfully!');
    }
    db.end();
    process.exit(0);
  });
});


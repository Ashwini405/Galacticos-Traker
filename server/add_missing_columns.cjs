const db = require('./db');

console.log('Adding missing columns to candidates table...');

// Add missing columns one by one
const columnsToAdd = [
  { name: 'primary_skills', type: 'TEXT' },
  { name: 'secondary_skills', type: 'TEXT' },
  { name: 'current_ctc', type: 'VARCHAR(50)' },
  { name: 'job_location', type: 'VARCHAR(100)' },
  { name: 'submission_date', type: 'DATE' }
];

// Check and add each column
columnsToAdd.forEach(({ name, type }) => {
  db.query(`ALTER TABLE candidates ADD COLUMN ${name} ${type}`, (err, result) => {
    if (err) {
      console.log(`Column ${name} may already exist or error:`, err.message);
    } else {
      console.log(`✓ Added column: ${name}`);
    }
  });
});

// Also update the status update route to use funnel_stage_id
db.query("SHOW COLUMNS FROM candidates LIKE 'status'", (err, result) => {
  if (result.length === 0) {
    console.log("Adding status column...");
    db.query("ALTER TABLE candidates ADD COLUMN status VARCHAR(100)", (err2) => {
      if (err2) console.log("Status column error:", err2.message);
      else console.log("✓ Added status column");
    });
  } else {
    console.log("Status column already exists");
  }
});

console.log('Migration completed!');
process.exit(0);


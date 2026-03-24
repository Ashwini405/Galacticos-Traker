require('dotenv').config();
const db = require('./db');

db.query("SELECT id, name, experience FROM candidates LIMIT 10", (err, result) => {
  if (err) {
    console.error("DB ERROR:", err);
    process.exit(1);
  }
  console.log("Raw Experience Data:", JSON.stringify(result, null, 2));
  process.exit(0);
});

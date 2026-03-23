const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  const updates = [
    ["admin@galacticosnetwork.com", "admin@company.com"],
    ["hr@galacticosnetwork.com", "hr@company.com"],
    ["client1@galacticosnetwork.com", "client1@company.com"]
  ];

  for (const [newEmail, oldEmail] of updates) {
    const [res] = await db.query("UPDATE users SET email=? WHERE email=?", [newEmail, oldEmail]);
    console.log(`${oldEmail} → ${newEmail}: ${res.affectedRows} row(s) updated`);
  }

  await db.end();
  console.log("Done.");
})();

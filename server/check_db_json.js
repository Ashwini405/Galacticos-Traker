import mysql from "mysql2";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.query("SELECT * FROM clients LIMIT 5", (err, clients) => {
  db.query("SELECT * FROM office_modes LIMIT 5", (err, office_modes) => {
    fs.writeFileSync("db_check.json", JSON.stringify({ clients, office_modes }, null, 2));
    process.exit(0);
  });
});

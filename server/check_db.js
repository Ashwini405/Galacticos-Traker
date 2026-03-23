import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.query("SELECT * FROM clients", (err, clients) => {
  console.log("CLIENTS:", clients);
  db.query("SELECT * FROM office_modes", (err, office_modes) => {
    console.log("OFFICE MODES:", office_modes);
    process.exit(0);
  });
});

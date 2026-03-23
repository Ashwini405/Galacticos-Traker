import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = mysql.createPool({ 
  host: process.env.DB_HOST||'127.0.0.1', 
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME 
});

async function check() {
  const tables = ['job_roles', 'clients', 'funnel_stages', 'office_modes', 'contract_types', 'recruiters'];
  for (const table of tables) {
    const [rows] = await db.query(`SELECT * FROM ${table}`);
    console.log(`${table}: ${rows.length} rows`);
  }
  process.exit(0);
}
check();

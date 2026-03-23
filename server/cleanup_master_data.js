import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = mysql.createPool({ 
  host: process.env.DB_HOST||'127.0.0.1', 
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME 
});

async function cleanup() {
  const validClients = ['Infosys', 'HCL', 'TCS', 'Wipro'];
  const validOfficeModes = ['WFH', 'Hybrid', 'Office', 'On-site', 'Remote'];

  console.log("Cleaning candidates linked to bad clients...");
  await db.query(`UPDATE candidates SET client_id = NULL WHERE client_id NOT IN (SELECT id FROM clients WHERE name IN (?))`, [validClients]);
  
  console.log("Deleting bad clients...");
  await db.query(`DELETE FROM clients WHERE name NOT IN (?)`, [validClients]);
  
  console.log("Cleaning candidates linked to bad office_modes...");
  await db.query(`UPDATE candidates SET office_mode_id = NULL WHERE office_mode_id NOT IN (SELECT id FROM office_modes WHERE name IN (?))`, [validOfficeModes]);
  
  console.log("Deleting bad office_modes...");
  await db.query(`DELETE FROM office_modes WHERE name NOT IN (?)`, [validOfficeModes]);
  
  console.log("Done!");
  process.exit(0);
}
cleanup();

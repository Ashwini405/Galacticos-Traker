import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = mysql.createPool({ 
  host: process.env.DB_HOST||'127.0.0.1', 
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME 
});

async function addClients() {
  const clientsToAdd = ['Anagha Soft', 'Fint'];
  
  for (const clientName of clientsToAdd) {
    console.log(`Adding ${clientName}...`);
    try {
      await db.query(`INSERT IGNORE INTO clients (name) VALUES (?)`, [clientName]);
    } catch (e) {
      console.error(e);
    }
  }
  
  console.log("Done adding missing valid clients!");
  process.exit(0);
}
addClients();

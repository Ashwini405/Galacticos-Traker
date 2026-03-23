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
  const [clients] = await db.query("SELECT * FROM clients");
  const [officeModes] = await db.query("SELECT * FROM office_modes");
  console.log(`Clients count: ${clients.length}`);
  console.log(`Office Modes count: ${officeModes.length}`);
  process.exit(0);
}
check();

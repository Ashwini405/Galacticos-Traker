import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'recruitmentDB'
    });

    console.log('Adding new columns to candidates table...');
    try {
        await connection.query("ALTER TABLE candidates ADD COLUMN job_location VARCHAR(100);");
        console.log("Added job_location");
    } catch (e) { console.log(e.message); }

    try {
        await connection.query("ALTER TABLE candidates ADD COLUMN submission_date VARCHAR(50);");
        console.log("Added submission_date");
    } catch (e) { console.log(e.message); }

    try {
        await connection.query("ALTER TABLE candidates ADD COLUMN current_ctc VARCHAR(50);");
        console.log("Added current_ctc");
    } catch (e) { console.log(e.message); }

    console.log('Database patching complete!');
    process.exit(0);
}

run().catch(console.error);

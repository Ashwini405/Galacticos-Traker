import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'recruitmentDB'
    });

    console.log('Adding resume_url column...');
    try {
        await connection.query('ALTER TABLE candidates ADD COLUMN resume_url VARCHAR(255) DEFAULT NULL;');
    } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    console.log('Adding client_status column...');
    try {
        await connection.query("ALTER TABLE candidates ADD COLUMN client_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending';");
    } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    console.log('Adding client_feedback column...');
    try {
        await connection.query('ALTER TABLE candidates ADD COLUMN client_feedback TEXT DEFAULT NULL;');
    } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    console.log('Adding resume_text column...');
    try {
        await connection.query('ALTER TABLE candidates ADD COLUMN resume_text LONGTEXT DEFAULT NULL;');
    } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    console.log('Done altering table candidates!');
    process.exit(0);
}

run().catch(console.error);

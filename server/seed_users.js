import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const seedUsers = async () => {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log("Connected to DB, hashing passwords...");

    const hash = await bcrypt.hash("password123", 10);

    const users = [
        { name: 'Admin User', email: 'admin@galacticosnetwork.com', password: hash, role: 'admin', client_id: null },
        { name: 'HR User', email: 'hr@galacticosnetwork.com', password: hash, role: 'hr', client_id: null },
        { name: 'Client One', email: 'client1@galacticosnetwork.com', password: hash, role: 'client', client_id: 1 }
    ];

    for (const user of users) {
        try {
            await db.query(`
        INSERT INTO users (name, email, password, role, client_id) 
        VALUES (?, ?, ?, ?, ?)
      `, [user.name, user.email, user.password, user.role, user.client_id]);
            console.log(`Inserted ${user.email}`);
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                console.log(`${user.email} already exists, skipping.`);
            } else {
                console.error(`Error inserting ${user.email}:`, err.message);
            }
        }
    }

    await db.end();
    console.log("Done.");
};

seedUsers();

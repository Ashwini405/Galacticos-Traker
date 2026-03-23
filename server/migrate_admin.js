import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const runMigration = async () => {
    try {
        console.log("Connecting to database...");
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("Connected. Running admin migrations...");

        // 1. Add rejection_reason to candidates
        try {
            await connection.query("ALTER TABLE candidates ADD COLUMN rejection_reason VARCHAR(255) DEFAULT NULL;");
            console.log("✅ Added rejection_reason to candidates.");
        } catch (e) {
            console.log("⚠️ rejection_reason might already exist or error:", e.message);
        }

        // 2. Add reset_token fields to users
        try {
            await connection.query("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL;");
            await connection.query("ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME DEFAULT NULL;");
            console.log("✅ Added reset_token fields to users.");
        } catch (e) {
            console.log("⚠️ reset_token fields might already exist or error:", e.message);
        }

        // 3. Create login_logs
        await connection.query(`
            CREATE TABLE IF NOT EXISTS login_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45),
                status VARCHAR(50),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log("✅ Created login_logs table.");

        // 4. Create audit_logs
        await connection.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                action VARCHAR(255) NOT NULL,
                entity_name VARCHAR(100),
                entity_id INT,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `);
        console.log("✅ Created audit_logs table.");

        // 5. Create subscriptions
        await connection.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT NOT NULL,
                plan_name VARCHAR(100) NOT NULL,
                start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_date DATETIME,
                status ENUM('active', 'inactive', 'cancelled') DEFAULT 'active',
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
            );
        `);
        console.log("✅ Created subscriptions table.");

        await connection.end();
        console.log("🎉 Migration complete!");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    }
};

runMigration();

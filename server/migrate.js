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

    console.log('Dropping existing table...');
    await connection.query('DROP TABLE IF EXISTS candidates;');

    console.log('Creating Job Roles...');
    await connection.query('CREATE TABLE IF NOT EXISTS job_roles (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE);');

    console.log('Creating Clients...');
    await connection.query('CREATE TABLE IF NOT EXISTS clients (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE);');

    console.log('Creating Funnel Stages...');
    await connection.query('CREATE TABLE IF NOT EXISTS funnel_stages (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE);');

    console.log('Creating Contract Types...');
    await connection.query('CREATE TABLE IF NOT EXISTS contract_types (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE);');

    console.log('Creating Office Modes...');
    await connection.query('CREATE TABLE IF NOT EXISTS office_modes (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE);');

    console.log('Creating Recruiters...');
    await connection.query('CREATE TABLE IF NOT EXISTS recruiters (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(100) UNIQUE);');

    console.log('Creating Candidates Table...');
    await connection.query(`
    CREATE TABLE candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        location VARCHAR(100),
        experience INT,
        job_role_id INT,
        client_id INT,
        office_mode_id INT,
        funnel_stage_id INT,
        contract_type_id INT,
        offer_status VARCHAR(50) DEFAULT 'Pending',
        job_location VARCHAR(100),
        submission_date VARCHAR(50),
        current_ctc VARCHAR(50),
        expected_ctc VARCHAR(50),
        recruiter_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (job_role_id) REFERENCES job_roles(id),
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (office_mode_id) REFERENCES office_modes(id),
        FOREIGN KEY (funnel_stage_id) REFERENCES funnel_stages(id),
        FOREIGN KEY (contract_type_id) REFERENCES contract_types(id),
        FOREIGN KEY (recruiter_id) REFERENCES recruiters(id)
    );
  `);

    console.log('Inserting Master Data...');
    await connection.query("INSERT IGNORE INTO job_roles (name) VALUES ('Frontend Developer'), ('Backend Developer'), ('Full Stack Developer'), ('UI/UX Designer'), ('Project Manager'), ('DevOps Engineer');");
    await connection.query("INSERT IGNORE INTO clients (name) VALUES ('TechCrop'), ('InnoSystems'), ('Global Solutions'), ('Startup Hub'), ('Enterprise Inc');");
    await connection.query("INSERT IGNORE INTO funnel_stages (name) VALUES ('Sourced'), ('Screening'), ('Technical Interview'), ('HR Interview'), ('Offer Extended'), ('Hired'), ('Rejected');");
    await connection.query("INSERT IGNORE INTO contract_types (name) VALUES ('Full-Time'), ('Part-Time'), ('Contract'), ('Freelance');");
    await connection.query("INSERT IGNORE INTO office_modes (name) VALUES ('Remote'), ('On-site'), ('Hybrid');");
    await connection.query("INSERT IGNORE INTO recruiters (name, email) VALUES ('Alice Johnson', 'alice@company.com'), ('Bob Smith', 'bob@company.com');");

    console.log('Inserting Sample Candidates...');
    await connection.query(`
    INSERT INTO candidates (name, email, phone, location, experience, job_role_id, client_id, office_mode_id, funnel_stage_id, contract_type_id, offer_status, expected_ctc, recruiter_id) VALUES 
    ('John Doe', 'john@example.com', '1234567890', 'New York', 5, 1, 1, 1, 2, 1, 'Pending', '100k', 1),
    ('Jane Smith', 'jane@example.com', '0987654321', 'London', 3, 2, 2, 2, 3, 2, 'Pending', '80k', 2)
  `);

    console.log('Done!');
    process.exit(0);
}

run().catch(console.error);

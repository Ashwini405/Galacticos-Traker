USE recruitmentDB;

-- Drop existing candidates table
DROP TABLE IF EXISTS candidates;

-- 1. Create Master Tables
CREATE TABLE IF NOT EXISTS job_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS funnel_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS contract_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS office_modes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS recruiters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE
);

-- 1.5 Users Table (Admin, HR, Client)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'hr', 'client') DEFAULT 'hr',
    client_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- 2. Create the New Candidates Table
CREATE TABLE candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    location VARCHAR(100),
    experience INT,
    primary_skills TEXT,
    secondary_skills TEXT,
    job_role_id INT,
    client_id INT,
    office_mode_id INT,
    funnel_stage_id INT,
    contract_type_id INT,
    offer_status VARCHAR(50) DEFAULT 'Pending',
    current_ctc VARCHAR(50),
    expected_ctc VARCHAR(50),
    job_location VARCHAR(100),
    submission_date DATE,
    recruiter_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (job_role_id) REFERENCES job_roles(id),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (office_mode_id) REFERENCES office_modes(id),
    FOREIGN KEY (funnel_stage_id) REFERENCES funnel_stages(id),
    FOREIGN KEY (contract_type_id) REFERENCES contract_types(id),
    FOREIGN KEY (recruiter_id) REFERENCES users(id)
);

-- 2.5 Interviews Table
CREATE TABLE IF NOT EXISTS interviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT,
    interviewer_name VARCHAR(100),
    scheduled_at DATETIME,
    meet_link VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- 3. Insert Initial Master Data
INSERT IGNORE INTO job_roles (name) VALUES ('Frontend Developer'), ('Backend Developer'), ('Full Stack Developer'), ('UI/UX Designer'), ('Project Manager'), ('DevOps Engineer');
INSERT IGNORE INTO clients (name) VALUES ('TechCrop'), ('InnoSystems'), ('Global Solutions'), ('Startup Hub'), ('Enterprise Inc');
INSERT IGNORE INTO funnel_stages (name) VALUES ('Sourced'), ('Screening'), ('Technical Interview'), ('HR Interview'), ('Offer Extended'), ('Hired'), ('Rejected');
INSERT IGNORE INTO contract_types (name) VALUES ('Full-Time'), ('Part-Time'), ('Contract', 'Freelance');
INSERT IGNORE INTO office_modes (name) VALUES ('Remote'), ('On-site', 'Hybrid');
INSERT IGNORE INTO recruiters (name, email) VALUES ('Alice Johnson', 'alice@company.com'), ('Bob Smith', 'bob@company.com');



-- Master/reference tables (seeded by server)
CREATE TABLE IF NOT EXISTS job_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS funnel_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS office_modes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contract_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recruiters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;

-- Core candidates table matching exact INSERT (19 columns)
CREATE TABLE IF NOT EXISTS candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Basic info
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  location VARCHAR(100),
  
  -- Experience & skills
  experience INT DEFAULT 0,
  primary_skills TEXT,
  secondary_skills TEXT,
  
  -- FK references (nullable)
  job_role_id INT,
  client_id INT,
  office_mode_id INT,
  funnel_stage_id INT,
  contract_type_id INT,
  recruiter_id INT,
  
  -- Job details
  offer_status VARCHAR(50) DEFAULT 'Pending',
  expected_ctc VARCHAR(50),
  current_ctc VARCHAR(50),
  job_location VARCHAR(100),
  submission_date DATE,
  
  -- File & extras
  resume_url VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_email (email),
  INDEX idx_experience (experience),
  INDEX idx_job_role (job_role_id),
  INDEX idx_client (client_id),
  INDEX idx_status (funnel_stage_id),
  FOREIGN KEY (job_role_id) REFERENCES job_roles(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (office_mode_id) REFERENCES office_modes(id) ON DELETE SET NULL,
  FOREIGN KEY (funnel_stage_id) REFERENCES funnel_stages(id) ON DELETE SET NULL,
  FOREIGN KEY (contract_type_id) REFERENCES contract_types(id) ON DELETE SET NULL,
  FOREIGN KEY (recruiter_id) REFERENCES recruiters(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','hr','client') DEFAULT 'hr',
  client_id INT DEFAULT NULL,
  reset_token VARCHAR(255) DEFAULT NULL,
  reset_token_expiry DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Supporting tables
CREATE TABLE IF NOT EXISTS interviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT,
  interviewer_name VARCHAR(100),
  scheduled_at DATETIME,
  meet_link VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  ip_address VARCHAR(45),
  success TINYINT(1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_ip (ip_address),
  INDEX idx_success (success),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS candidate_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Sample seed data (server will override/ensure)
INSERT IGNORE INTO job_roles (name) VALUES 
('Frontend Developer'), ('Backend Developer'), ('Fullstack Developer'), ('DevOps Engineer'), ('QA Engineer');

INSERT IGNORE INTO funnel_stages (name) VALUES 
('Screening'), ('Interview 1'), ('Interview 2'), ('Technical Interview'), ('Offer'), ('Hired'), ('Rejected');

INSERT IGNORE INTO office_modes (name) VALUES ('WFH'), ('Hybrid'), ('Office'), ('On-site');
INSERT IGNORE INTO contract_types (name) VALUES ('Full-time'), ('Contract'), ('Freelance'), ('Internship');
INSERT IGNORE INTO recruiters (name) VALUES ('John Doe'), ('Jane Smith'), ('Mike Johnson'), ('Sarah Wilson');
INSERT IGNORE INTO clients (name) VALUES ('Infosys'), ('HCL'), ('TCS'), ('Wipro');

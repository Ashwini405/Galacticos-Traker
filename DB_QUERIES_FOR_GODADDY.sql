-- =====================================================
-- Galacticos Tracker - ALL SQL QUERIES for GoDaddy cPanel
-- DB: recruitmentDB | All table schemas + cleanup + maintenance
-- Upload/run in phpMyAdmin
-- =====================================================

USE recruitmentDB;

-- 1. CLEANUP DUPLICATE RECRUITERS (Critical - Run First!)
-- View duplicates
SELECT LOWER(TRIM(name)) as name, GROUP_CONCAT(id ORDER BY id) as ids, COUNT(*) as count
FROM recruiters WHERE name IS NOT NULL AND name != ''
GROUP BY LOWER(TRIM(name)) HAVING count > 1;

-- DELETE duplicates (keeps lowest ID per name)
DELETE r1 FROM recruiters r1
INNER JOIN recruiters r2 
WHERE r1.id > r2.id AND LOWER(TRIM(r1.name)) = LOWER(TRIM(r2.name));

-- Verify unique count
SELECT COUNT(*) as unique_recruiters FROM recruiters WHERE name != '';

-- 2. FULL SCHEMA (from server/database.sql)
CREATE TABLE IF NOT EXISTS recruiters (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB;

-- All other tables...
-- [PASTE FULL server/database.sql HERE if needed]

-- 3. SEED DEFAULT DATA (safe INSERT IGNORE)
INSERT IGNORE INTO recruiters (name) VALUES 
('John Doe'), ('Jane Smith'), ('Mike Johnson'), ('Sarah Wilson');

-- 4. MAINTENANCE QUERIES
-- Reset auto-increment (after cleanup)
ALTER TABLE recruiters AUTO_INCREMENT = 1;

-- Add missing indexes
ALTER TABLE recruiters ADD INDEX idx_name (name);

-- Backup current state
CREATE TABLE recruiters_backup AS SELECT * FROM recruiters;

-- 5. VERIFY ALL MASTER TABLES
SELECT 'recruiters' as table_name, COUNT(*) as count FROM recruiters WHERE name != ''
UNION ALL SELECT 'job_roles', COUNT(*) FROM job_roles
UNION ALL SELECT 'clients', COUNT(*) FROM clients;

-- =====================================================
-- SUCCESS: Run sections 1→5 in order. Duplicates gone!
-- Questions? Check TODO.md or server/index.js
-- =====================================================


import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const db = await mysql.createPool({
    host: process.env.DB_HOST || 'a2nlmysql25plsk.secureserver.net',
    user: process.env.DB_USER || 'hr_user',
    password: process.env.DB_PASSWORD,
    database: 'ph15919328924_',
    ssl: { rejectUnauthorized: false }
  });

  const sql = `
    INSERT INTO candidates 
    (name, email, phone, location, experience, job_role_id, client_id, office_mode_id, funnel_stage_id, contract_type_id, offer_status, current_ctc, expected_ctc, recruiter_id, submission_date)
    VALUES ?
  `;

  // Provide dummy values matching the UI screenshot
  const values = [[
    'ashwini', // name
    null, // email
    null, // phone
    'Bangalore', // location
    6, // experience
    1, // job_role_id
    1, // client_id
    1, // office_mode_id
    2, // funnel_stage_id
    1, // contract_type_id
    'Active', // offer_status
    '', // current_ctc
    '', // expected_ctc
    1, // recruiter_id
    null // submission_date (parsed from ########)
  ]];

  try {
    const [result] = await db.query(sql, [values]);
    console.log("Success:", result);
  } catch (err) {
    console.error("MySQL Error:", err);
  }
  db.end();
}

test();

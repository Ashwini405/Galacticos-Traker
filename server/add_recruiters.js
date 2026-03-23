import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error("DB Connection Failed:", err);
        process.exit(1);
    } else {
        console.log("MySQL Connected");

        // Check existing recruiters and insert new ones
        const recruitersToAdd = ["Ramya", "Sushma", "PAVAN"];

        let pending = recruitersToAdd.length;
        let completed = 0;

        recruitersToAdd.forEach(name => {
            db.query("SELECT * FROM recruiters WHERE name = ?", [name], (err, results) => {
                if (err) {
                    console.error(err);
                } else if (results.length === 0) {
                    db.query("INSERT INTO recruiters (name) VALUES (?)", [name], (err, insertRes) => {
                        if (err) console.error("Error inserting", name);
                        else console.log("Inserted recruiter:", name);
                        complete();
                    });
                } else {
                    console.log("Recruiter already exists:", name);
                    complete();
                }
            });
        });

        function complete() {
            completed++;
            if (completed === pending) {
                db.end();
                process.exit(0);
            }
        }
    }
});

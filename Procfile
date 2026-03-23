release: cd server && npm install && npx mysql2 -u $DB_USER -p $DB_PASSWORD -h $DB_HOST $DB_NAME < database.sql && node init_db.js
web: cd server && npm start

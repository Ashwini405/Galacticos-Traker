import express from "express";
import mysql from "mysql2";

const router = express.Router();

// Get DB connection from req.app or global. For now we will create a connection pool or use the existing connection.
// Wait, the existing index.js uses a single connection `db` which isn't exported easily.
// It's better to refactor `db` connection or pass it.
// Actually `index.js` already has routes defined within it. Let's look at `server/index.js` again to see how it structure routes.

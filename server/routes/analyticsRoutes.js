import express from "express";
import db from "../db.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/monthly", verifyToken, (req, res) => {
  db.query(`
    SELECT MONTH(created_at) as month, COUNT(*) as total
    FROM candidates
    GROUP BY MONTH(created_at)
  `, (err, result) => {
    res.json(result);
  });
});

export default router;

import express from "express";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Create missing reference data
router.post("/job-roles", verifyToken, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });
  
  global.db.query(
    "INSERT INTO job_roles (name) VALUES (?)",
    [name],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return global.db.query("SELECT id, name FROM job_roles WHERE name = ?", [name], (err2, results) => {
            if (err2) return res.status(500).json(err2);
            res.json({ id: results[0].id, name });
          });
        }
        return res.status(500).json(err);
      }
      res.json({ id: result.insertId, name });
    }
  );
});

router.post("/clients", verifyToken, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });
  
  global.db.query(
    "INSERT INTO clients (name) VALUES (?)",
    [name],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return global.db.query("SELECT id, name FROM clients WHERE name = ?", [name], (err2, results) => {
            if (err2) return res.status(500).json(err2);
            res.json({ id: results[0].id, name });
          });
        }
        return res.status(500).json(err);
      }
      res.json({ id: result.insertId, name });
    }
  );
});

router.post("/recruiters", verifyToken, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });
  
  global.db.query(
    "INSERT INTO recruiters (name) VALUES (?)",
    [name],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return global.db.query("SELECT id, name FROM recruiters WHERE name = ?", [name], (err2, results) => {
            if (err2) return res.status(500).json(err2);
            res.json({ id: results[0].id, name });
          });
        }
        return res.status(500).json(err);
      }
      res.json({ id: result.insertId, name });
    }
  );
});

router.post("/office-modes", verifyToken, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });
  
  global.db.query(
    "INSERT INTO office_modes (name) VALUES (?)",
    [name],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return global.db.query("SELECT id, name FROM office_modes WHERE name = ?", [name], (err2, results) => {
            if (err2) return res.status(500).json(err2);
            res.json({ id: results[0].id, name });
          });
        }
        return res.status(500).json(err);
      }
      res.json({ id: result.insertId, name });
    }
  );
});

router.post("/contract-types", verifyToken, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });
  
  global.db.query(
    "INSERT INTO contract_types (name) VALUES (?)",
    [name],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return global.db.query("SELECT id, name FROM contract_types WHERE name = ?", [name], (err2, results) => {
            if (err2) return res.status(500).json(err2);
            res.json({ id: results[0].id, name });
          });
        }
        return res.status(500).json(err);
      }
      res.json({ id: result.insertId, name });
    }
  );
});

export default router;


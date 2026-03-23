import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import crypto from "crypto";
import { sendSetPasswordEmail } from "../services/emailService.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, role, client } = req.body;

  try {
    const tempPassword = crypto.randomBytes(16).toString("hex");
    const hashed = await bcrypt.hash(tempPassword, 10);

    let query = "INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)";
    let values = [name, email, hashed, role];

    if (role === "client" && client) {
      query = "INSERT INTO users (name,email,password,role,client_id) VALUES (?,?,?,?,?)";
      values = [name, email, hashed, role, client];
    }

    global.db.query(query, values, async (err, result) => {
      if (err) return res.status(500).json({ message: "Error creating user", error: err });

      const token = jwt.sign(
        { id: result.insertId, email, purpose: "set_password" },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      try {
        await sendSetPasswordEmail(email, name, token);
        res.json({ message: "User created and setup email sent" });
      } catch (emailErr) {
        console.error("Failed to send email:", emailErr);
        res.status(500).json({ message: "User created but email failed to send" });
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});

router.post("/set-password", async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== "set_password") {
      return res.status(400).json({ message: "Invalid token" });
    }

    const hashed = await bcrypt.hash(password, 10);

    global.db.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashed, decoded.id],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });
        if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
        res.json({ message: "Password updated successfully" });
      }
    );
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  global.db.query("SELECT * FROM users WHERE email=?", [email], async (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result.length)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = result[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role, client_id: user.client_id || null },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ 
      token, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        client_id: user.client_id || null
      } 
    });
  });
});

const updateProfile = async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: "Valid name required" });
  }
  const newName = name.trim();
  if (newName.length < 2) {
    return res.status(400).json({ message: "Name too short" });
  }
  global.db.query("UPDATE users SET name = ? WHERE id = ?", [newName, req.user.id], (err, result) => {
    if (err) {
      console.error("Profile update error:", err);
      return res.status(500).json({ message: "Update failed", error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    global.db.query("SELECT id, name, email, role, client_id FROM users WHERE id = ?", [req.user.id], (err2, rows) => {
      if (err2) {
        console.error("Fetch updated user error:", err2);
        return res.status(500).json({ message: "Error fetching profile" });
      }
      res.json({ message: "Profile updated successfully", user: rows[0] });
    });
  });
};

router.put("/profile", verifyToken, updateProfile);
router.put("/", verifyToken, updateProfile);

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }
  global.db.query("SELECT password FROM users WHERE id = ?", [req.user.id], async (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(500).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    global.db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, req.user.id], (err) => {
      if (err) {
        console.error("Password update error:", err);
        return res.status(500).json({ message: "Failed to update password" });
      }
      res.json({ message: "Password updated successfully" });
    });
  });
};

router.put("/profile/password", verifyToken, updatePassword);
router.put("/password", verifyToken, updatePassword);

export default router;

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const issueToken = (admin) => jwt.sign({ sub: admin.id }, process.env.JWT_SECRET, { expiresIn: "8h", issuer: "computer-deposit-tracker" });
const publicAdmin = (admin) => ({ id: admin.id, name: admin.name, email: admin.email });

router.get("/setup-status", async (_req, res, next) => {
  try { res.json({ setupRequired: (await Admin.estimatedDocumentCount()) === 0 }); }
  catch (error) { next(error); }
});

router.post("/setup", async (req, res, next) => {
  try {
    if (await Admin.estimatedDocumentCount()) return res.status(409).json({ message: "Initial admin setup is already complete" });
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!name || name.length > 100 || !emailPattern.test(email) || password.length < 12 || password.length > 128) {
      return res.status(400).json({ message: "Enter a name, valid email, and password between 12 and 128 characters" });
    }
    const admin = await Admin.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: issueToken(admin), admin: publicAdmin(admin) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An admin with this email already exists" });
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const admin = await Admin.findOne({ email }).select("+passwordHash");
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) return res.status(401).json({ message: "Email or password is incorrect" });
    res.json({ token: issueToken(admin), admin: publicAdmin(admin) });
  } catch (error) { next(error); }
});

router.get("/me", requireAdmin, (req, res) => res.json({ admin: publicAdmin(req.admin) }));
module.exports = router;

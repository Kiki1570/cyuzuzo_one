const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

async function requireAdmin(req, res, next) {
  const value = req.get("authorization") || "";
  if (!value.startsWith("Bearer ")) return res.status(401).json({ message: "Admin sign-in required" });
  try {
    const payload = jwt.verify(value.slice(7), process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.sub).select("name email");
    if (!admin) return res.status(401).json({ message: "Admin session is no longer valid" });
    req.admin = admin;
    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired admin session" });
  }
}
module.exports = { requireAdmin };

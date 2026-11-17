const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit").rateLimit;
require("dotenv").config();

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "20kb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : "Unexpected server error" });
});

const port = Number(process.env.PORT) || 5000;
async function start() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("Set MONGO_URI and a JWT_SECRET of at least 32 characters in backend/.env");
  }
  await mongoose.connect(process.env.MONGO_URI);
  app.listen(port, () => console.log(`Computer Deposit Tracker API listening on ${port}`));
}
start().catch((error) => { console.error(error.message); process.exit(1); });

const express = require("express");
const mongoose = require("mongoose");
const ComputerRecord = require("../models/ComputerRecord");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();
router.use(requireAdmin);
const statuses = ["not_deposited", "deposited", "withdrawn"];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/summary", async (_req, res, next) => {
  try {
    const rows = await ComputerRecord.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const summary = { total: 0, not_deposited: 0, deposited: 0, withdrawn: 0 };
    for (const row of rows) { summary[row._id] = row.count; summary.total += row.count; }
    res.json(summary);
  } catch (error) { next(error); }
});

router.get("/records", async (req, res, next) => {
  try {
    const query = {};
    const search = String(req.query.search || "").trim().slice(0, 100);
    const status = String(req.query.status || "all");
    if (search) {
      const safe = new RegExp(escapeRegex(search), "i");
      query.$or = [{ personName: safe }, { computerName: safe }];
    }
    if (status !== "all") {
      if (!statuses.includes(status)) return res.status(400).json({ message: "Invalid status filter" });
      query.status = status;
    }
    const records = await ComputerRecord.find(query).sort({ updatedAt: -1 }).limit(500).lean();
    res.json(records);
  } catch (error) { next(error); }
});

router.post("/records", async (req, res, next) => {
  try {
    const personName = String(req.body.personName || "").trim();
    const computerName = String(req.body.computerName || "").trim();
    if (!personName || personName.length > 120 || !computerName || computerName.length > 120) {
      return res.status(400).json({ message: "Person and computer names are required (maximum 120 characters each)" });
    }
    const record = await ComputerRecord.create({
      personName,
      computerName,
      status: "not_deposited",
      history: [{ status: "not_deposited", adminId: req.admin.id, adminName: req.admin.name, note: "Record created", timestamp: new Date() }]
    });
    res.status(201).json(record);
  } catch (error) { next(error); }
});

router.patch("/records/:id/status", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid record ID" });
    const status = String(req.body.status || "");
    const note = String(req.body.note || "").trim();
    if (!["deposited", "withdrawn"].includes(status)) return res.status(400).json({ message: "Choose deposited or withdrawn" });
    if (note.length > 500) return res.status(400).json({ message: "Note must be 500 characters or fewer" });
    const record = await ComputerRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (record.status === status) return res.status(409).json({ message: "This computer already has that status" });
    record.status = status;
    record.history.push({ status, adminId: req.admin.id, adminName: req.admin.name, note, timestamp: new Date() });
    await record.save();
    res.json(record);
  } catch (error) { next(error); }
});

module.exports = router;

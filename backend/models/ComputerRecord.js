const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  status: { type: String, enum: ["not_deposited", "deposited", "withdrawn"], required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  adminName: { type: String, required: true, trim: true },
  note: { type: String, trim: true, maxlength: 500, default: "" },
  timestamp: { type: Date, required: true, default: Date.now }
}, { _id: false });

const recordSchema = new mongoose.Schema({
  personName: { type: String, required: true, trim: true, maxlength: 120 },
  computerName: { type: String, required: true, trim: true, maxlength: 120 },
  status: { type: String, enum: ["not_deposited", "deposited", "withdrawn"], default: "not_deposited", required: true },
  history: { type: [historySchema], default: [] }
}, { timestamps: true });

recordSchema.index({ personName: 1 });
recordSchema.index({ computerName: 1 });
recordSchema.index({ status: 1, updatedAt: -1 });
module.exports = mongoose.model("ComputerRecord", recordSchema);

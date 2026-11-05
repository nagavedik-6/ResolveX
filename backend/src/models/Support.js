const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

supportSchema.index({ complaint: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Support", supportSchema);

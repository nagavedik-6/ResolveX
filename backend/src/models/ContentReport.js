const mongoose = require("mongoose");

const contentReportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", default: null },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

contentReportSchema.path("comment").validate(function hasOneTarget(comment) {
  return Boolean(this.complaint) !== Boolean(comment);
}, "A report must target exactly one complaint or comment");

module.exports = mongoose.model("ContentReport", contentReportSchema);

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", default: null },
    type: {
      type: String,
      enum: ["complaint_submitted", "comment", "reply", "support", "assigned", "status_changed"],
      required: true
    },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);

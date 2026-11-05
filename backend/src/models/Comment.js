const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    depth: { type: Number, default: 0, min: 0, max: 3 },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    isHidden: { type: Boolean, default: false }
  },
  { timestamps: true }
);

commentSchema.index({ complaint: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);

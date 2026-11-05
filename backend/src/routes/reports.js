const express = require("express");
const { body, validationResult } = require("express-validator");
const ContentReport = require("../models/ContentReport");
const Complaint = require("../models/Complaint");
const Comment = require("../models/Comment");
const { authenticate, authorize } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", errors: result.array().map((error) => error.msg) });
  }
  next();
}

router.post(
  "/",
  authenticate,
  [
    body("reason").trim().isLength({ min: 3, max: 1000 }),
    body("complaintId").optional().isMongoId(),
    body("commentId").optional().isMongoId()
  ],
  validate,
  asyncHandler(async (req, res) => {
    if (Boolean(req.body.complaintId) === Boolean(req.body.commentId)) {
      return res.status(400).json({ message: "Provide exactly one complaintId or commentId" });
    }
    const [complaint, comment] = await Promise.all([
      req.body.complaintId ? Complaint.findById(req.body.complaintId) : null,
      req.body.commentId ? Comment.findById(req.body.commentId) : null
    ]);
    if ((req.body.complaintId && !complaint) || (req.body.commentId && !comment)) {
      return res.status(404).json({ message: "Reported content not found" });
    }
    const report = await ContentReport.create({
      reporter: req.user.id,
      complaint: complaint ? complaint.id : undefined,
      comment: comment ? comment.id : undefined,
      reason: req.body.reason
    });
    res.status(201).json({ report });
  })
);

router.get(
  "/",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const reports = await ContentReport.find({ status: req.query.status || "open" })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("reporter", "fullName email")
      .populate("complaint", "trackingId title isHidden")
      .populate("comment", "text isHidden");
    res.json({ reports });
  })
);

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  [body("status").isIn(["reviewed", "dismissed"]), body("hideContent").optional().isBoolean()],
  validate,
  asyncHandler(async (req, res) => {
    const report = await ContentReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });
    report.status = req.body.status;
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    await report.save();
    if (req.body.hideContent === true) {
      if (report.complaint) await Complaint.updateOne({ _id: report.complaint }, { $set: { isHidden: true } });
      if (report.comment) await Comment.updateOne({ _id: report.comment }, { $set: { isHidden: true } });
    }
    res.json({ report });
  })
);

module.exports = router;

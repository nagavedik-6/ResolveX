const express = require("express");
const { body, query, validationResult } = require("express-validator");
const Complaint = require("../models/Complaint");
const Comment = require("../models/Comment");
const User = require("../models/User");
const Department = require("../models/Department");
const Notification = require("../models/Notification");
const Support = require("../models/Support");
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

function dateBound(value, endOfDay = false) {
  const date = new Date(value);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
  return date;
}

router.use(authenticate, authorize("admin"));

router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const [complaintsByStatus, totalUsers, totalComments, totalComplaints] = await Promise.all([
      Complaint.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      User.countDocuments({ isActive: true }),
      Comment.countDocuments({ isHidden: false }),
      Complaint.countDocuments()
    ]);
    res.json({
      totalComplaints,
      totalUsers,
      totalComments,
      complaintsByStatus: Object.fromEntries(complaintsByStatus.map((row) => [row._id, row.count]))
    });
  })
);

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) filter.$or = [
      { fullName: new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { email: new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }
    ];
    const [users, total] = await Promise.all([
      User.find(filter).select("-passwordHash -tokenVersion").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter)
    ]);
    res.json({ users, page, limit, total });
  })
);

router.put(
  "/users/:id/role",
  [body("role").isIn(["community", "officer"])],
  validate,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot change your own administrator account role" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.role = req.body.role;
    if (req.body.role === "community") user.department = null;
    await user.save();
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    delete safeUser.tokenVersion;
    res.json({ user: safeUser });
  })
);

router.put(
  "/complaints/:id/assign",
  [
    body("departmentId").optional({ values: "falsy" }).isMongoId(),
    body("officerId").optional({ values: "falsy" }).isMongoId(),
    body("note").optional().trim().isLength({ max: 1000 })
  ],
  asyncHandler(async (req, res) => {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: validation.array().map((error) => error.msg) });
    }
    const { departmentId, officerId } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    const department = departmentId ? await Department.findById(departmentId) : null;
    if (departmentId && !department) return res.status(404).json({ message: "Department not found" });
    const officer = officerId
      ? await User.findOne({ _id: officerId, role: "officer", isActive: true })
      : null;
    if (officerId && !officer) return res.status(400).json({ message: "A valid active officer is required" });
    const nextDepartmentId = departmentId !== undefined ? (department ? department.id : null) : complaint.department;
    const nextOfficerId = officerId !== undefined ? (officer ? officer.id : null) : complaint.assignedOfficer;
    if (nextOfficerId) {
      const assignedOfficer = officer || await User.findById(nextOfficerId);
      if (!assignedOfficer || assignedOfficer.department?.toString() !== nextDepartmentId?.toString()) {
        return res.status(400).json({ message: "Officer must belong to the assigned department" });
      }
    }
    complaint.department = nextDepartmentId;
    complaint.assignedOfficer = nextOfficerId;
    complaint.status = "Assigned";
    complaint.statusHistory.push({ status: "Assigned", changedBy: req.user.id, note: req.body.note || "" });
    await complaint.save();
    const notifications = [];
    if (officer && officerId && officer.id !== req.user.id) {
      notifications.push({
        recipient: officer.id,
        actor: req.user.id,
        complaint: complaint.id,
        type: "assigned",
        message: `Complaint ${complaint.trackingId} was assigned to you`
      });
    }
    if (complaint.author.toString() !== req.user.id) {
      notifications.push({
        recipient: complaint.author,
        actor: req.user.id,
        complaint: complaint.id,
        type: "assigned",
        message: `Complaint ${complaint.trackingId} was assigned`
      });
    }
    if (notifications.length) await Notification.insertMany(notifications);
    res.json({ complaint });
  })
);

router.get(
  "/reports/analytics",
  [query("from").optional().isISO8601(), query("to").optional().isISO8601(), query("district").optional().trim().isLength({ max: 100 })],
  validate,
  asyncHandler(async (req, res) => {
    const match = {};
    if (req.query.from || req.query.to) {
      match.createdAt = {};
      if (req.query.from) match.createdAt.$gte = dateBound(req.query.from);
      if (req.query.to) match.createdAt.$lte = dateBound(req.query.to, true);
    }
    if (req.query.district) match.district = req.query.district;
    const [byCategory, byVillage, byStatus, mostSupported] = await Promise.all([
      Complaint.aggregate([{ $match: match }, { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Complaint.aggregate([{ $match: match }, { $group: { _id: "$village", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
      Complaint.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Complaint.aggregate([
        { $match: match },
        { $lookup: { from: Support.collection.name, localField: "_id", foreignField: "complaint", as: "supports" } },
        { $addFields: { supportCount: { $size: "$supports" } } },
        { $sort: { supportCount: -1 } },
        { $limit: 10 },
        { $project: { supports: 0 } }
      ])
    ]);
    res.json({ byCategory, byVillage, byStatus, mostSupported });
  })
);

module.exports = router;

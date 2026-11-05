const crypto = require("crypto");
const express = require("express");
const { body, query, validationResult } = require("express-validator");
const { rateLimit } = require("express-rate-limit");
const Complaint = require("../models/Complaint");
const Comment = require("../models/Comment");
const Support = require("../models/Support");
const Notification = require("../models/Notification");
const { authenticate, authenticateOptional, authorize } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many complaint submissions. Try again later." }
});
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many comments. Try again later." }
});

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", errors: result.array().map((error) => error.msg) });
  }
  next();
}

function visibleTo(user) {
  if (!user) return { visibility: "public", isHidden: false };
  if (user.role === "admin") return {};
  if (user.role === "officer") {
    return {
      $or: [
        { visibility: "public", isHidden: false },
        { author: user.id },
        { assignedOfficer: user.id }
      ]
    };
  }
  return {
    $or: [
      { visibility: "public", isHidden: false },
      { author: user.id }
    ]
  };
}

function canManage(complaint, user) {
  return user.role === "admin" || complaint.author.toString() === user.id;
}

function dateBound(value, endOfDay = false) {
  const date = new Date(value);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
  return date;
}

router.post(
  "/",
  authenticate,
  submissionLimiter,
  [
    body("title").trim().isLength({ min: 5, max: 160 }),
    body("description").trim().isLength({ min: 10, max: 10000 }),
    body("category").isIn(Complaint.categories),
    body("village").trim().isLength({ min: 1, max: 100 }),
    body("district").trim().isLength({ min: 1, max: 100 }),
    body("coordinates").isArray({ min: 2, max: 2 }),
    body("coordinates.0").isFloat({ min: -180, max: 180 }),
    body("coordinates.1").isFloat({ min: -90, max: 90 }),
    body("priority").optional().isIn(["Low", "Normal", "High", "Urgent"]),
    body("visibility").optional().isIn(["public", "private"]),
    body("imageUrls").optional().isArray({ max: 8 }),
    body("imageUrls.*").optional().isURL({ protocols: ["http", "https"], require_protocol: true })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const trackingId = `RX-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const complaint = await Complaint.create({
      trackingId,
      author: req.user.id,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      village: req.body.village,
      district: req.body.district,
      location: { type: "Point", coordinates: req.body.coordinates.map(Number) },
      priority: req.body.priority,
      visibility: req.body.visibility,
      imageUrls: req.body.imageUrls,
      statusHistory: [{ status: "Submitted", changedBy: req.user.id, note: "Complaint submitted" }]
    });
    await Notification.create({
      recipient: req.user.id,
      complaint: complaint.id,
      type: "complaint_submitted",
      message: `Complaint ${trackingId} was submitted`
    });
    res.status(201).json({ complaint });
  })
);

router.get(
  "/assigned",
  authenticate,
  authorize("officer"),
  asyncHandler(async (req, res) => {
    const complaints = await Complaint.find({ assignedOfficer: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate("author", "fullName profilePictureUrl village")
      .populate("department", "name");
    res.json({ complaints });
  })
);

router.get(
  "/nearby",
  authenticateOptional,
  [
    query("longitude").isFloat({ min: -180, max: 180 }),
    query("latitude").isFloat({ min: -90, max: 90 }),
    query("radiusMeters").optional().isInt({ min: 1, max: 100000 }),
    query("limit").optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const radius = Number(req.query.radiusMeters || 10000);
    const filter = {
      ...visibleTo(req.user),
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(req.query.longitude), Number(req.query.latitude)]
          },
          $maxDistance: radius
        }
      }
    };
    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit || 50))
      .populate("author", "fullName profilePictureUrl village");
    res.json({ complaints });
  })
);

router.get(
  "/track/:trackingId",
  authenticateOptional,
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findOne({ trackingId: req.params.trackingId.toUpperCase() })
      .populate("department", "name")
      .populate("assignedOfficer", "fullName");
    if (
      !complaint ||
      complaint.isHidden ||
      (complaint.visibility === "private" && (!req.user || !canManage(complaint, req.user)))
    ) {
      return res.status(404).json({ message: "Public complaint not found" });
    }
    res.json({
      trackingId: complaint.trackingId,
      status: complaint.status,
      createdAt: complaint.createdAt,
      department: complaint.department,
      assignedOfficer: complaint.assignedOfficer,
      statusHistory: complaint.statusHistory,
      resolvedAt: complaint.resolvedAt
    });
  })
);

router.get(
  "/",
  authenticateOptional,
  [query("from").optional().isISO8601(), query("to").optional().isISO8601()],
  validate,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { ...visibleTo(req.user) };
    const { status, category, village, district, sort, from, to } = req.query;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (village) filter.village = new RegExp(`^${String(village).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (district) filter.district = new RegExp(`^${String(district).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = dateBound(from);
      if (to) filter.createdAt.$lte = dateBound(to, true);
    }

    const order = sort === "supported" ? { supportCount: -1, createdAt: -1 } : { createdAt: -1 };
    if (sort === "supported") {
      const ranked = await Complaint.aggregate([
        { $match: { ...filter, status: status || { $exists: true } } },
        {
          $lookup: {
            from: Support.collection.name,
            localField: "_id",
            foreignField: "complaint",
            as: "supports"
          }
        },
        { $addFields: { supportCount: { $size: "$supports" } } },
        { $sort: order },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { supports: 0 } }
      ]);
      const documents = await Complaint.find({ _id: { $in: ranked.map((item) => item._id) } })
        .populate("author", "fullName profilePictureUrl village")
        .populate("department", "name");
      const documentById = new Map(documents.map((item) => [item.id, item]));
      return res.json({
        complaints: ranked.map((item) => ({
          ...documentById.get(item._id.toString()).toObject(),
          supportCount: item.supportCount
        })),
        page,
        limit
      });
    }

    const complaints = await Complaint.find(filter)
      .sort(order)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "fullName profilePictureUrl village")
      .populate("department", "name");
    const [total, supportCounts] = await Promise.all([
      Complaint.countDocuments(filter),
      complaints.length
        ? Support.aggregate([
            { $match: { complaint: { $in: complaints.map((item) => item._id) } } },
            { $group: { _id: "$complaint", count: { $sum: 1 } } }
          ])
        : []
    ]);
    const countByComplaint = new Map(supportCounts.map((item) => [item._id.toString(), item.count]));
    const results = complaints.map((item) => ({
      ...item.toObject(),
      supportCount: countByComplaint.get(item.id) || 0
    }));
    res.json({ complaints: results, page, limit, total, pages: Math.ceil(total / limit) });
  })
);

router.get(
  "/:id",
  authenticateOptional,
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id)
      .populate("author", "fullName profilePictureUrl village")
      .populate("department", "name")
      .populate("assignedOfficer", "fullName");
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    if (complaint.visibility === "private" && (!req.user || !canManage(complaint, req.user))) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    if (complaint.isHidden && (!req.user || req.user.role !== "admin")) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    const supportCount = await Support.countDocuments({ complaint: complaint.id });
    res.json({ complaint, supportCount });
  })
);

router.put(
  "/:id",
  authenticate,
  [
    body("title").optional().trim().isLength({ min: 5, max: 160 }),
    body("description").optional().trim().isLength({ min: 10, max: 10000 }),
    body("visibility").optional().isIn(["public", "private"]),
    body("imageUrls").optional().isArray({ max: 8 }),
    body("imageUrls.*").optional().isURL({ protocols: ["http", "https"], require_protocol: true })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    if (!canManage(complaint, req.user)) return res.status(403).json({ message: "Not permitted" });
    if (complaint.status === "Resolved" || complaint.status === "Rejected") {
      return res.status(409).json({ message: "Closed complaints cannot be edited" });
    }
    for (const key of ["title", "description", "visibility", "imageUrls"]) {
      if (req.body[key] !== undefined) complaint[key] = req.body[key];
    }
    await complaint.save();
    res.json({ complaint });
  })
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    if (!canManage(complaint, req.user)) return res.status(403).json({ message: "Not permitted" });
    await complaint.deleteOne();
    await Promise.all([
      Comment.deleteMany({ complaint: complaint.id }),
      Support.deleteMany({ complaint: complaint.id })
    ]);
    res.status(204).end();
  })
);

router.post(
  "/:id/support",
  authenticate,
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findOne({ _id: req.params.id, visibility: "public", isHidden: false });
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    const result = await Support.updateOne(
      { complaint: complaint.id, user: req.user.id },
      { $setOnInsert: { complaint: complaint.id, user: req.user.id } },
      { upsert: true }
    );
    if (result.upsertedCount > 0 && complaint.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: complaint.author,
        actor: req.user.id,
        complaint: complaint.id,
        type: "support",
        message: "Someone supported your complaint"
      });
    }
    res.json({ supported: true, supportCount: await Support.countDocuments({ complaint: complaint.id }) });
  })
);

router.delete(
  "/:id/support",
  authenticate,
  asyncHandler(async (req, res) => {
    await Support.deleteOne({ complaint: req.params.id, user: req.user.id });
    res.json({ supported: false, supportCount: await Support.countDocuments({ complaint: req.params.id }) });
  })
);

router.get(
  "/:id/support",
  authenticate,
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findOne({ _id: req.params.id, ...visibleTo(req.user) });
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    const [supportCount, supported] = await Promise.all([
      Support.countDocuments({ complaint: complaint.id }),
      Support.exists({ complaint: complaint.id, user: req.user.id })
    ]);
    res.json({ supportCount, supported: Boolean(supported) });
  })
);

router.get(
  "/:id/comments",
  authenticateOptional,
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint || (complaint.visibility === "private" && (!req.user || !canManage(complaint, req.user)))) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    const comments = await Comment.find({ complaint: complaint.id, isHidden: false })
      .sort({ createdAt: 1 })
      .populate("author", "fullName profilePictureUrl");
    res.json({ comments });
  })
);

router.post(
  "/:id/comments",
  authenticate,
  commentLimiter,
  [body("text").trim().isLength({ min: 1, max: 2000 }), body("parentId").optional({ values: "falsy" }).isMongoId()],
  validate,
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findOne({ _id: req.params.id, visibility: "public", isHidden: false });
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    let parent = null;
    if (req.body.parentId) {
      parent = await Comment.findOne({ _id: req.body.parentId, complaint: complaint.id, isHidden: false });
      if (!parent) return res.status(404).json({ message: "Parent comment not found" });
      if (parent.depth >= 3) return res.status(400).json({ message: "Reply nesting limit reached" });
    }
    const comment = await Comment.create({
      complaint: complaint.id,
      author: req.user.id,
      parent: parent ? parent.id : null,
      depth: parent ? parent.depth + 1 : 0,
      text: req.body.text
    });
    if (complaint.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: complaint.author,
        actor: req.user.id,
        complaint: complaint.id,
        type: parent ? "reply" : "comment",
        message: parent ? "Someone replied to your complaint discussion" : "Someone commented on your complaint"
      });
    }
    res.status(201).json({ comment: await comment.populate("author", "fullName profilePictureUrl") });
  })
);

router.put(
  "/:id/comments/:commentId",
  authenticate,
  [body("text").trim().isLength({ min: 1, max: 2000 })],
  validate,
  asyncHandler(async (req, res) => {
    const comment = await Comment.findOne({ _id: req.params.commentId, complaint: req.params.id });
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.author.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not permitted" });
    }
    comment.text = req.body.text;
    await comment.save();
    res.json({ comment });
  })
);

router.delete(
  "/:id/comments/:commentId",
  authenticate,
  asyncHandler(async (req, res) => {
    const comment = await Comment.findOne({ _id: req.params.commentId, complaint: req.params.id });
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.author.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not permitted" });
    }
    const descendants = [comment.id];
    let parents = [comment.id];
    for (let depth = 0; depth < 3; depth += 1) {
      const children = await Comment.find({ parent: { $in: parents } }).select("_id");
      parents = children.map((child) => child.id);
      descendants.push(...parents);
      if (parents.length === 0) break;
    }
    await Comment.deleteMany({ _id: { $in: descendants } });
    res.status(204).end();
  })
);

router.post(
  "/:id/status",
  authenticate,
  authorize("admin", "officer"),
  [body("status").isIn(Complaint.statuses), body("note").optional().trim().isLength({ max: 1000 })],
  validate,
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    if (
      req.user.role === "officer" &&
      (!req.user.department || complaint.assignedOfficer?.toString() !== req.user.id)
    ) {
      return res.status(403).json({ message: "Complaint is not assigned to you" });
    }
    complaint.status = req.body.status;
    complaint.resolvedAt = req.body.status === "Resolved" ? new Date() : null;
    complaint.statusHistory.push({
      status: req.body.status,
      changedBy: req.user.id,
      note: req.body.note || ""
    });
    await complaint.save();
    if (complaint.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: complaint.author,
        actor: req.user.id,
        complaint: complaint.id,
        type: "status_changed",
        message: `Complaint ${complaint.trackingId} is now ${complaint.status}`
      });
    }
    res.json({ complaint });
  })
);

module.exports = router;

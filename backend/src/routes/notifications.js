const express = require("express");
const { param } = require("express-validator");
const { validationResult } = require("express-validator");
const Notification = require("../models/Notification");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("actor", "fullName profilePictureUrl")
      .populate("complaint", "trackingId title");
    res.json({ notifications });
  })
);

router.put(
  "/:id/read",
  param("id").isMongoId(),
  asyncHandler(async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) return res.status(400).json({ message: "Invalid notification identifier" });
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json({ notification });
  })
);

module.exports = router;

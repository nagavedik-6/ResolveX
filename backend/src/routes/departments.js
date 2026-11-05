const express = require("express");
const { body, validationResult } = require("express-validator");
const Department = require("../models/Department");
const User = require("../models/User");
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

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ departments: await Department.find({ isActive: true }).sort({ name: 1 }) });
  })
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  [body("name").trim().isLength({ min: 2, max: 120 }), body("description").optional().trim().isLength({ max: 1000 })],
  validate,
  asyncHandler(async (req, res) => {
    const department = await Department.create({ name: req.body.name, description: req.body.description });
    res.status(201).json({ department });
  })
);

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  [
    body("name").optional().trim().isLength({ min: 2, max: 120 }),
    body("description").optional().trim().isLength({ max: 1000 }),
    body("isActive").optional().isBoolean()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!department) return res.status(404).json({ message: "Department not found" });
    res.json({ department });
  })
);

router.put(
  "/:id/officers/:userId",
  authenticate,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const [department, officer] = await Promise.all([
      Department.findById(req.params.id),
      User.findById(req.params.userId)
    ]);
    if (!department || !officer) return res.status(404).json({ message: "Department or user not found" });
    if (!["officer", "admin"].includes(officer.role)) {
      return res.status(400).json({ message: "Only an officer or administrator can be assigned to a department" });
    }
    officer.department = department.id;
    if (officer.role !== "admin") officer.role = "officer";
    await officer.save();
    res.json({ user: await User.findById(officer.id).select("-passwordHash") });
  })
);

module.exports = router;

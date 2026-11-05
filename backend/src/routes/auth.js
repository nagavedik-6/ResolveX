const express = require("express");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", errors: result.array().map((error) => error.msg) });
  }
  next();
}

function createToken(user) {
  return jwt.sign(
    { sub: user.id, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

router.post(
  "/register",
  [
    body("fullName").trim().isLength({ min: 2, max: 100 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 10, max: 128 }),
    body("village").trim().isLength({ min: 1, max: 100 }),
    body("district").trim().isLength({ min: 1, max: 100 }),
    body("state").trim().isLength({ min: 1, max: 100 }),
    body("mobileNumber").optional({ values: "falsy" }).trim().isLength({ max: 30 }),
    body("profilePictureUrl").optional({ values: "falsy" }).isURL({ protocols: ["http", "https"], require_protocol: true })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { fullName, email, password, mobileNumber, village, district, state, profilePictureUrl } = req.body;
    const user = await User.create({
      fullName,
      email,
      passwordHash: password,
      mobileNumber,
      village,
      district,
      state,
      profilePictureUrl
    });
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    delete safeUser.tokenVersion;
    res.status(201).json({ token: createToken(user), user: safeUser });
  })
);

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").isString().isLength({ min: 1, max: 128 })],
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email, isActive: true }).select("+passwordHash +tokenVersion");
    if (!user || !(await user.verifyPassword(req.body.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      token: createToken(user),
      user: await User.findById(user.id).select("-passwordHash")
    });
  })
);

router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
    res.json({ message: "Logged out successfully" });
  })
);

router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user.toObject({ versionKey: false, transform: (doc, value) => {
    delete value.tokenVersion;
    return value;
  } }) });
});

router.put(
  "/me",
  authenticate,
  [
    body("fullName").optional().trim().isLength({ min: 2, max: 100 }),
    body("village").optional().trim().isLength({ min: 1, max: 100 }),
    body("district").optional().trim().isLength({ min: 1, max: 100 }),
    body("state").optional().trim().isLength({ min: 1, max: 100 }),
    body("mobileNumber").optional({ values: "falsy" }).trim().isLength({ max: 30 }),
    body("profilePictureUrl").optional({ values: "falsy" }).isURL({ protocols: ["http", "https"], require_protocol: true })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const allowed = ["fullName", "village", "district", "state", "mobileNumber", "profilePictureUrl"];
    for (const field of allowed) {
      if (req.body[field] !== undefined) req.user[field] = req.body[field];
    }
    await req.user.save();
    const user = req.user.toObject();
    delete user.passwordHash;
    delete user.tokenVersion;
    res.json({ user });
  })
);

module.exports = router;

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  let payload;
  try {
    payload = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const user = await User.findById(payload.sub).select("-passwordHash +tokenVersion");
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = user;
  next();
});

function authenticateOptional(req, res, next) {
  if (!req.get("authorization")) {
    return next();
  }
  return authenticate(req, res, next);
}

function authorize(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You are not authorized to perform this action" });
    }
    next();
  };
}

module.exports = { authenticate, authenticateOptional, authorize };

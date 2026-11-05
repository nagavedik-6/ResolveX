const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const complaintRoutes = require("./routes/complaints");
const departmentRoutes = require("./routes/departments");
const notificationRoutes = require("./routes/notifications");
const reportRoutes = require("./routes/reports");
const adminRoutes = require("./routes/admin");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org"]
    }
  }
}));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()) : false
}));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", (req, res) => res.status(404).json({ message: "Route not found" }));

const frontendDist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    res.sendFile(path.join(frontendDist, "index.html"), (error) => {
      if (error) next(error);
    });
  });
}

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use(errorHandler);

module.exports = app;

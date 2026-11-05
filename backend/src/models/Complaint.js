const mongoose = require("mongoose");

const statuses = ["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected"];
const categories = [
  "Roads and transportation",
  "Water supply",
  "Electricity",
  "Drainage and sanitation",
  "Garbage and waste management",
  "Street lights",
  "Public safety",
  "College infrastructure",
  "Government services",
  "Other issues"
];

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: statuses, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    changedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    trackingId: { type: String, required: true, unique: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    category: { type: String, required: true, enum: categories },
    imageUrls: { type: [{ type: String, trim: true, maxlength: 2048 }], default: [], validate: [(urls) => urls.length <= 8, "At most 8 images are allowed"] },
    village: { type: String, required: true, trim: true, maxlength: 100 },
    district: { type: String, required: true, trim: true, maxlength: 100 },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coordinates) =>
            coordinates.length === 2 &&
            coordinates[0] >= -180 &&
            coordinates[0] <= 180 &&
            coordinates[1] >= -90 &&
            coordinates[1] <= 90,
          message: "Location must contain valid longitude and latitude"
        }
      }
    },
    priority: { type: String, enum: ["Low", "Normal", "High", "Urgent"], default: "Normal" },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    status: { type: String, enum: statuses, default: "Submitted", index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    statusHistory: { type: [statusHistorySchema], default: [] },
    resolvedAt: { type: Date, default: null },
    isHidden: { type: Boolean, default: false }
  },
  { timestamps: true }
);

complaintSchema.index({ location: "2dsphere" });
complaintSchema.index({ category: 1, village: 1, createdAt: -1 });
complaintSchema.index({ district: 1, createdAt: -1 });

module.exports = mongoose.model("Complaint", complaintSchema);
module.exports.statuses = statuses;
module.exports.categories = categories;

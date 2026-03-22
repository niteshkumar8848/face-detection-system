const mongoose = require("mongoose");

const consentSchema = new mongoose.Schema(
  {
    accepted: {
      type: Boolean,
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
    userAgent: {
      type: String,
      default: "",
    },
    ip: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema({
  profileId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  consentHistory: {
    type: [consentSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

profileSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Profile", profileSchema);

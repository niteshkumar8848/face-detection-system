const mongoose = require("mongoose");

const faceSchema = new mongoose.Schema({
  age: Number,
  gender: String,
  emotion: String,
  confidence: Number,
  smoothedEmotion: String,
  profileId: {
    type: String,
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  trackId: Number,
  alertTriggered: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("FaceData", faceSchema);

const mongoose = require("mongoose");

const faceSchema = new mongoose.Schema({
  age: Number,
  gender: String,
  emotion: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("FaceData", faceSchema);
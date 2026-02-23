const router = require("express").Router();
const FaceData = require("../models/FaceData");
const faceController = require("../controllers/faceController");

// Save Data
router.post("/face-data", faceController.saveFaceData);

// Emotion Stats
router.get("/stats/emotions", async (req, res) => {
  try {
    const stats = await FaceData.aggregate([
      { $group: { _id: "$emotion", count: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gender Stats
router.get("/stats/gender", async (req, res) => {
  try {
    const stats = await FaceData.aggregate([
      { $group: { _id: "$gender", count: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Face Detection API is running" });
});

module.exports = router;

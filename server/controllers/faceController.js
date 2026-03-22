const FaceData = require("../models/FaceData");
const realtimeBus = require("../events/realtimeBus");

// Save Face Data
const saveFaceData = async (req, res) => {
  try {
    const {
      age,
      gender,
      emotion,
      confidence,
      smoothedEmotion,
      profileId,
      sessionId,
      trackId,
      alertTriggered,
      timestamp
    } = req.body;

    // Validate required fields
    if (age == null || !gender || !emotion) {
      return res.status(400).json({ 
        error: "Missing required fields: age, gender, and emotion are required" 
      });
    }

    if (typeof age !== "number" || Number.isNaN(age) || age < 0) {
      return res.status(400).json({
        error: "Invalid age value"
      });
    }

    const data = await FaceData.create({
      age,
      gender: String(gender).toLowerCase(),
      emotion: String(emotion).toLowerCase(),
      confidence: typeof confidence === "number" ? confidence : undefined,
      smoothedEmotion: smoothedEmotion ? String(smoothedEmotion).toLowerCase() : undefined,
      profileId: profileId || undefined,
      sessionId: sessionId || undefined,
      trackId: typeof trackId === "number" ? trackId : undefined,
      alertTriggered: Boolean(alertTriggered),
      timestamp: timestamp ? new Date(timestamp) : undefined
    });

    realtimeBus.emit("face-data-saved", data);
    res.status(201).json(data);
  } catch (err) {
    console.error("Error saving face data:", err);
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  saveFaceData
};

const FaceData = require("../models/FaceData");

// Save Face Data
const saveFaceData = async (req, res) => {
  try {
    const { age, gender, emotion } = req.body;

    // Validate required fields
    if (!age || !gender || !emotion) {
      return res.status(400).json({ 
        error: "Missing required fields: age, gender, and emotion are required" 
      });
    }

    const data = await FaceData.create({
      age,
      gender,
      emotion
    });

    res.status(201).json(data);
  } catch (err) {
    console.error("Error saving face data:", err);
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  saveFaceData
};


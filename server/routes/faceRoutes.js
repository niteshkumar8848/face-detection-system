const router = require("express").Router();
const FaceData = require("../models/FaceData");
const Profile = require("../models/Profile");
const faceController = require("../controllers/faceController");
const realtimeBus = require("../events/realtimeBus");

const EMOTION_VALENCE = {
  angry: -0.8,
  disgusted: -0.9,
  fearful: -0.75,
  sad: -0.6,
  neutral: 0,
  surprised: 0.35,
  happy: 0.9,
};

const NEGATIVE_EMOTIONS = new Set(["angry", "disgusted", "fearful", "sad"]);
const sseClients = new Set();

const normalizeEmotion = (value) => String(value || "neutral").toLowerCase();
const safeTimestamp = (entry) => new Date(entry.timestamp || entry.createdAt || Date.now());

const buildFilter = (query) => {
  const { from, to, profileId } = query;
  const filter = {};

  if (profileId) {
    filter.profileId = profileId;
  }

  if (from || to) {
    filter.timestamp = {};
    if (from) {
      filter.timestamp.$gte = new Date(from);
    }
    if (to) {
      filter.timestamp.$lte = new Date(to);
    }
  }

  return filter;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const computeBehaviorInsights = (records) => {
  if (!records.length) {
    return {
      totalSamples: 0,
      dominantEmotion: "neutral",
      moodTrend: "stable",
      engagementScore: 0,
      stressRisk: false,
      averageConfidence: 0,
      negativeRatio: 0,
      maxNegativeStreak: 0,
    };
  }

  const emotions = records.map((record) => normalizeEmotion(record.smoothedEmotion || record.emotion));
  const confidenceValues = records
    .map((record) => Number(record.confidence || 0))
    .filter((value) => Number.isFinite(value));

  const counts = emotions.reduce((acc, emotion) => {
    acc[emotion] = (acc[emotion] || 0) + 1;
    return acc;
  }, {});

  const dominantEmotion = Object.keys(counts).reduce(
    (maxEmotion, emotion) => (counts[emotion] > (counts[maxEmotion] || 0) ? emotion : maxEmotion),
    "neutral"
  );

  const valenceSeries = emotions.map((emotion) => EMOTION_VALENCE[emotion] ?? 0);
  const midpoint = Math.floor(valenceSeries.length / 2);
  const firstHalf = valenceSeries.slice(0, Math.max(1, midpoint));
  const secondHalf = valenceSeries.slice(Math.max(1, midpoint));

  const avg = (arr) => (arr.length ? arr.reduce((sum, value) => sum + value, 0) / arr.length : 0);
  const firstAvg = avg(firstHalf);
  const secondAvg = avg(secondHalf);
  const trendDelta = secondAvg - firstAvg;

  let moodTrend = "stable";
  if (trendDelta > 0.15) {
    moodTrend = "improving";
  } else if (trendDelta < -0.15) {
    moodTrend = "declining";
  }

  let streak = 0;
  let maxNegativeStreak = 0;
  let negativeCount = 0;
  emotions.forEach((emotion) => {
    if (NEGATIVE_EMOTIONS.has(emotion)) {
      negativeCount += 1;
      streak += 1;
      if (streak > maxNegativeStreak) {
        maxNegativeStreak = streak;
      }
    } else {
      streak = 0;
    }
  });

  const averageConfidence = confidenceValues.length
    ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length)
    : 0;

  const neutralCount = counts.neutral || 0;
  const expressiveness = 1 - neutralCount / records.length;
  const engagementScore = clamp(
    Math.round(averageConfidence * 0.65 + expressiveness * 100 * 0.35),
    0,
    100
  );

  const negativeRatio = Number((negativeCount / records.length).toFixed(2));
  const stressRisk = negativeRatio >= 0.55 || maxNegativeStreak >= 6;

  return {
    totalSamples: records.length,
    dominantEmotion,
    moodTrend,
    engagementScore,
    stressRisk,
    averageConfidence,
    negativeRatio,
    maxNegativeStreak,
  };
};

const buildSessionPlayback = (records) => {
  if (!records.length) {
    return {
      timeline: [],
      events: [],
      insights: computeBehaviorInsights([]),
      summary: {
        startedAt: null,
        endedAt: null,
        durationSeconds: 0,
        totalFrames: 0,
      },
    };
  }

  const grouped = new Map();
  records.forEach((record) => {
    const time = safeTimestamp(record);
    const bucket = new Date(Math.floor(time.getTime() / 1000) * 1000).toISOString();

    if (!grouped.has(bucket)) {
      grouped.set(bucket, {
        timestamp: bucket,
        totalConfidence: 0,
        confidenceCount: 0,
        faceCount: 0,
        alertCount: 0,
        emotions: {},
      });
    }

    const node = grouped.get(bucket);
    const emotion = normalizeEmotion(record.smoothedEmotion || record.emotion);
    node.faceCount += 1;
    node.totalConfidence += Number(record.confidence || 0);
    node.confidenceCount += 1;
    node.alertCount += record.alertTriggered ? 1 : 0;
    node.emotions[emotion] = (node.emotions[emotion] || 0) + 1;
  });

  const timeline = [...grouped.values()]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((point) => {
      const dominantEmotion = Object.keys(point.emotions).reduce(
        (maxEmotion, emotion) =>
          point.emotions[emotion] > (point.emotions[maxEmotion] || 0) ? emotion : maxEmotion,
        "neutral"
      );

      return {
        timestamp: point.timestamp,
        dominantEmotion,
        faceCount: point.faceCount,
        avgConfidence: point.confidenceCount
          ? Math.round(point.totalConfidence / point.confidenceCount)
          : 0,
        alertCount: point.alertCount,
      };
    });

  const events = [];
  let previousEmotion = null;
  let previousFaceCount = null;

  timeline.forEach((point) => {
    if (previousEmotion && previousEmotion !== point.dominantEmotion) {
      events.push({
        timestamp: point.timestamp,
        type: "emotion-shift",
        message: `${previousEmotion} -> ${point.dominantEmotion}`,
      });
    }

    if (point.alertCount > 0) {
      events.push({
        timestamp: point.timestamp,
        type: "alert",
        message: `${point.alertCount} alert trigger(s) detected`,
      });
    }

    if (previousFaceCount != null && Math.abs(point.faceCount - previousFaceCount) >= 2) {
      events.push({
        timestamp: point.timestamp,
        type: "face-count-change",
        message: `Face count changed from ${previousFaceCount} to ${point.faceCount}`,
      });
    }

    previousEmotion = point.dominantEmotion;
    previousFaceCount = point.faceCount;
  });

  const sortedRecords = [...records].sort((a, b) => safeTimestamp(a) - safeTimestamp(b));
  const startedAt = safeTimestamp(sortedRecords[0]);
  const endedAt = safeTimestamp(sortedRecords[sortedRecords.length - 1]);

  return {
    timeline,
    events,
    insights: computeBehaviorInsights(records),
    summary: {
      startedAt,
      endedAt,
      durationSeconds: Math.max(1, Math.round((endedAt - startedAt) / 1000)),
      totalFrames: records.length,
    },
  };
};

const broadcastEvent = (event, payload) => {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach((client) => client.write(data));
};

realtimeBus.on("face-data-saved", (payload) => {
  broadcastEvent("face-data", payload);
});

router.post("/face-data", faceController.saveFaceData);

router.post("/profiles/consent", async (req, res) => {
  try {
    const { profileId, profileName, accepted } = req.body;

    if (!profileName || typeof profileName !== "string") {
      return res.status(400).json({ error: "profileName is required" });
    }

    const normalizedProfileId = profileId || `profile-${Date.now()}`;

    const profile = await Profile.findOneAndUpdate(
      { profileId: normalizedProfileId },
      {
        $set: { name: profileName.trim() || "Anonymous" },
        $push: {
          consentHistory: {
            accepted: Boolean(accepted),
            acceptedAt: new Date(),
            userAgent: req.headers["user-agent"] || "",
            ip: req.ip || "",
          },
        },
      },
      { upsert: true, new: true }
    );

    broadcastEvent("profile-updated", {
      profileId: profile.profileId,
      name: profile.name,
    });

    res.status(201).json({
      profileId: profile.profileId,
      name: profile.name,
      consentCount: profile.consentHistory.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/profiles", async (_req, res) => {
  try {
    const profiles = await Profile.find({}, { profileId: 1, name: 1, _id: 0 }).sort({ updatedAt: -1 });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats/emotions", async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const stats = await FaceData.aggregate([
      { $match: filter },
      { $group: { _id: { $ifNull: ["$smoothedEmotion", "$emotion"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json(stats.map((item) => ({ _id: item._id || "unknown", count: item.count })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats/gender", async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const stats = await FaceData.aggregate([
      { $match: filter },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats/heatmap", async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const stats = await FaceData.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: { $ifNull: ["$timestamp", "$createdAt"] },
              },
            },
            hour: { $hour: { $ifNull: ["$timestamp", "$createdAt"] } },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1, "_id.hour": 1 } },
    ]);

    res.json(
      stats.map((item) => ({
        day: item._id.day,
        hour: item._id.hour,
        count: item.count,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats/insights/realtime", async (req, res) => {
  try {
    const { sessionId, profileId } = req.query;
    const minutes = Number(req.query.minutes || 3);

    const filter = {};
    if (sessionId) {
      filter.sessionId = sessionId;
    }
    if (profileId) {
      filter.profileId = profileId;
    }

    if (!sessionId) {
      const fromDate = new Date(Date.now() - minutes * 60 * 1000);
      filter.timestamp = { $gte: fromDate };
    }

    const records = await FaceData.find(filter)
      .sort({ timestamp: 1, createdAt: 1 })
      .limit(500)
      .lean();

    res.json({
      scope: sessionId ? "session" : "window",
      sessionId: sessionId || null,
      minutes: sessionId ? null : minutes,
      insights: computeBehaviorInsights(records),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/sessions", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);

    const sessions = await FaceData.aggregate([
      { $match: { sessionId: { $exists: true, $ne: null, $ne: "" } } },
      { $addFields: { ts: { $ifNull: ["$timestamp", "$createdAt"] } } },
      { $sort: { ts: 1 } },
      {
        $group: {
          _id: "$sessionId",
          startedAt: { $first: "$ts" },
          endedAt: { $last: "$ts" },
          totalFrames: { $sum: 1 },
          lastEmotion: { $last: { $ifNull: ["$smoothedEmotion", "$emotion"] } },
        },
      },
      { $sort: { endedAt: -1 } },
      { $limit: limit },
    ]);

    res.json(
      sessions.map((session) => ({
        sessionId: session._id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        totalFrames: session.totalFrames,
        lastEmotion: normalizeEmotion(session.lastEmotion),
        durationSeconds: Math.max(1, Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 1000)),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/sessions/:sessionId/playback", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit || 1500), 1), 5000);

    const records = await FaceData.find({ sessionId })
      .sort({ timestamp: 1, createdAt: 1 })
      .limit(limit)
      .lean();

    const playback = buildSessionPlayback(records);

    res.json({
      sessionId,
      ...playback,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats/profile/:profileId", async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    filter.profileId = req.params.profileId;

    const [total, emotions] = await Promise.all([
      FaceData.countDocuments(filter),
      FaceData.aggregate([
        { $match: filter },
        { $group: { _id: { $ifNull: ["$smoothedEmotion", "$emotion"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({ total, emotions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, ts: new Date().toISOString() })}\n\n`);
  sseClients.add(res);

  const keepAlive = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

router.get("/health", (_req, res) => {
  res.json({ status: "OK", message: "Face Detection API is running" });
});

module.exports = router;

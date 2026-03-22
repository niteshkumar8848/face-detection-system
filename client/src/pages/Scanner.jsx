import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import * as faceapi from "face-api.js";
import axios from "axios";
import { api } from "../config/api";

const ANALYSIS_INTERVAL_MS = 500;
const SMOOTHING_WINDOW = 5;
const NEGATIVE_EMOTIONS = new Set(["angry", "sad", "fearful", "disgusted"]);

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const getDominantEmotion = (expressions) => {
  if (!expressions) {
    return { emotion: "neutral", confidence: 0 };
  }

  const emotion = Object.keys(expressions).reduce((prev, curr) =>
    expressions[prev] > expressions[curr] ? prev : curr
  );

  return {
    emotion,
    confidence: Math.round((expressions[emotion] || 0) * 100),
  };
};

const getSmoothedEmotion = (history) => {
  const frequency = history.reduce((acc, emotion) => {
    acc[emotion] = (acc[emotion] || 0) + 1;
    return acc;
  }, {});

  return Object.keys(frequency).reduce((a, b) => (frequency[a] >= frequency[b] ? a : b), history[0] || "neutral");
};

const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const Scanner = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  const lastInsightsFetchRef = useRef(0);
  const isDetectingRef = useRef(false);
  const tracksRef = useRef(new Map());
  const nextTrackIdRef = useRef(1);
  const sessionRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("Camera is off.");
  const [lastResult, setLastResult] = useState(null);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [liveFaces, setLiveFaces] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [realtimeInsights, setRealtimeInsights] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [profileId, setProfileId] = useState(localStorage.getItem("faceai-profile-id") || "");

  useEffect(() => {
    const loadModels = async () => {
      try {
        setError("");
        const MODEL_URL = "/models";

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);

        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading models:", err);
        setError("Failed to load AI models. Please refresh and try again.");
      }
    };

    loadModels();
  }, []);

  const beginSession = useCallback((activeProfileId) => {
    sessionRef.current = {
      sessionId: generateSessionId(),
      profileId: activeProfileId || "",
      startedAt: Date.now(),
      totalFrames: 0,
      faceDetections: 0,
      emotionCounts: {},
      confidenceSum: 0,
      confidenceCount: 0,
      alerts: 0,
    };
    setSessionSummary(null);
    setAlerts([]);
    setRealtimeInsights(null);
  }, []);

  const finalizeSession = useCallback(() => {
    const session = sessionRef.current;
    if (!session) {
      return;
    }

    const durationSeconds = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));
    const emotions = Object.entries(session.emotionCounts);
    const dominantEmotion = emotions.length
      ? emotions.sort((a, b) => b[1] - a[1])[0][0]
      : "none";

    setSessionSummary({
      sessionId: session.sessionId,
      durationSeconds,
      totalFrames: session.totalFrames,
      faceDetections: session.faceDetections,
      dominantEmotion,
      avgConfidence: session.confidenceCount
        ? Math.round(session.confidenceSum / session.confidenceCount)
        : 0,
      alertsTriggered: session.alerts,
    });

    sessionRef.current = null;
  }, []);

  const stopAutoScan = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    setIsAutoScanning(false);
  }, []);

  const stopCamera = useCallback(() => {
    stopAutoScan();

    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    tracksRef.current.clear();
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setConsent(false);
    setLoading(false);
    setLastResult(null);
    setLiveFaces([]);
    setStatusMessage("Camera is off.");
    isDetectingRef.current = false;
    finalizeSession();
  }, [finalizeSession, stopAutoScan]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const registerConsent = useCallback(async () => {
    try {
      const res = await axios.post(api.consent, {
        profileId: profileId || undefined,
        profileName: "Guest User",
        accepted: true,
      });

      const activeProfileId = res.data.profileId;
      setProfileId(activeProfileId);
      localStorage.setItem("faceai-profile-id", activeProfileId);
      beginSession(activeProfileId);
    } catch (err) {
      console.error("Consent registration error:", err);
      beginSession(profileId);
    }
  }, [beginSession, profileId]);

  const fetchRealtimeInsights = useCallback(async (sessionId) => {
    if (!sessionId) {
      return;
    }

    try {
      const now = Date.now();
      if (now - lastInsightsFetchRef.current < 2000) {
        return;
      }
      lastInsightsFetchRef.current = now;

      const response = await axios.get(api.statsRealtimeInsights, {
        params: { sessionId },
      });

      setRealtimeInsights(response.data?.insights || null);
    } catch (err) {
      console.error("Realtime insights error:", err);
    }
  }, []);

  const startVideo = async () => {
    try {
      setError("");
      setStatusMessage("Starting camera...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setStatusMessage("Camera is ready. Initializing live analysis...");
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setConsent(false);
      setStatusMessage("Camera is off.");
      setError("Could not access webcam. Please allow camera permissions.");
    }
  };

  const drawOverlay = useCallback((faces) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.font = "16px Arial";

    faces.forEach((face) => {
      const { box } = face;
      ctx.strokeStyle = "#22c55e";
      ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      const tag = `ID ${face.trackId} | ${face.smoothedEmotion} (${face.confidence}%)`;
      ctx.fillStyle = "#0f172a";
      const textWidth = ctx.measureText(tag).width;
      ctx.fillRect(box.x, Math.max(0, box.y - 22), textWidth + 10, 20);
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(tag, box.x + 5, Math.max(14, box.y - 7));
    });
  }, []);

  const assignTrack = useCallback((centerPoint) => {
    const now = Date.now();
    let selectedId = null;
    let nearestDistance = Infinity;

    tracksRef.current.forEach((track, trackId) => {
      if (now - track.lastSeen > 5000) {
        tracksRef.current.delete(trackId);
        return;
      }

      const dist = distance(track.center, centerPoint);
      if (dist < nearestDistance && dist < 140) {
        nearestDistance = dist;
        selectedId = trackId;
      }
    });

    if (!selectedId) {
      selectedId = nextTrackIdRef.current;
      nextTrackIdRef.current += 1;
      tracksRef.current.set(selectedId, {
        center: centerPoint,
        lastSeen: now,
        emotionHistory: [],
        negativeStreak: 0,
      });
    }

    return selectedId;
  }, []);

  const detectFaces = useCallback(async () => {
    if (!modelsLoaded || !consent || !videoRef.current || isDetectingRef.current) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2 || video.paused || video.ended) {
      return;
    }

    isDetectingRef.current = true;
    setLoading(true);

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
        .withFaceExpressions()
        .withAgeAndGender();

      const session = sessionRef.current;
      if (session) {
        session.totalFrames += 1;
      }

      if (!detections.length) {
        drawOverlay([]);
        setLiveFaces([]);
        setStatusMessage("No face detected. Keep your face centered in the frame.");
        return;
      }

      const nowIso = new Date().toISOString();
      const annotatedFaces = detections.map((detection) => {
        const box = detection.detection.box;
        const center = {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
        };

        const trackId = assignTrack(center);
        const track = tracksRef.current.get(trackId);
        track.center = center;
        track.lastSeen = Date.now();

        const { emotion, confidence } = getDominantEmotion(detection.expressions);
        track.emotionHistory = [...track.emotionHistory, emotion].slice(-SMOOTHING_WINDOW);
        const smoothedEmotion = getSmoothedEmotion(track.emotionHistory);

        if (NEGATIVE_EMOTIONS.has(smoothedEmotion)) {
          track.negativeStreak += 1;
        } else {
          track.negativeStreak = 0;
        }

        const alertTriggered = track.negativeStreak >= 5;

        return {
          box,
          score: detection.detection.score,
          age: Math.round(detection.age),
          gender: detection.gender,
          emotion,
          smoothedEmotion,
          confidence,
          trackId,
          alertTriggered,
          timestamp: nowIso,
        };
      });

      annotatedFaces.sort((a, b) => b.score - a.score);
      const primaryFace = annotatedFaces[0];

      drawOverlay(annotatedFaces);
      setLiveFaces(
        annotatedFaces.map((face) => ({
          trackId: face.trackId,
          smoothedEmotion: face.smoothedEmotion,
          confidence: face.confidence,
        }))
      );
      setLastResult(primaryFace);

      if (session) {
        session.faceDetections += annotatedFaces.length;
        session.emotionCounts[primaryFace.smoothedEmotion] =
          (session.emotionCounts[primaryFace.smoothedEmotion] || 0) + 1;
        session.confidenceSum += primaryFace.confidence;
        session.confidenceCount += 1;
      }

      if (primaryFace.alertTriggered) {
        const alert = {
          id: `${primaryFace.trackId}-${Date.now()}`,
          message: `Alert: Track ${primaryFace.trackId} shows sustained ${primaryFace.smoothedEmotion}.`,
          ts: new Date().toLocaleTimeString(),
        };
        setAlerts((prev) => [alert, ...prev].slice(0, 5));
        if (session) {
          session.alerts += 1;
        }
      }

      setStatusMessage(
        `Live analysis active (${ANALYSIS_INTERVAL_MS / 1000}s). Faces: ${annotatedFaces.length}.`
      );

      await Promise.all(
        annotatedFaces.map((face) =>
          axios.post(api.faceData, {
            age: face.age,
            gender: face.gender,
            emotion: face.emotion,
            smoothedEmotion: face.smoothedEmotion,
            confidence: face.confidence,
            profileId: profileId || undefined,
            sessionId: session?.sessionId,
            trackId: face.trackId,
            alertTriggered: face.alertTriggered,
            timestamp: face.timestamp,
          })
        )
      );

      await fetchRealtimeInsights(session?.sessionId);
    } catch (err) {
      console.error("Detection error:", err);
      setError("Live detection failed temporarily. Retrying...");
    } finally {
      isDetectingRef.current = false;
      setLoading(false);
    }
  }, [assignTrack, consent, drawOverlay, fetchRealtimeInsights, modelsLoaded, profileId]);

  const startAutoScan = useCallback(() => {
    if (analysisIntervalRef.current) {
      return;
    }

    detectFaces();
    analysisIntervalRef.current = setInterval(detectFaces, ANALYSIS_INTERVAL_MS);
    setIsAutoScanning(true);
  }, [detectFaces]);

  useEffect(() => {
    if (consent && modelsLoaded) {
      startAutoScan();
      return;
    }

    stopAutoScan();
  }, [consent, modelsLoaded, startAutoScan, stopAutoScan]);

  const liveFaceSummary = useMemo(
    () =>
      liveFaces.map((face) => ({
        trackId: face.trackId,
        emotion: face.smoothedEmotion,
        confidence: face.confidence,
      })),
    [liveFaces]
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Realtime AI Face Scanner</h1>
        <p className="page-subtitle">Tracking | Emotion Inference | Session Analytics</p>
      </div>

      <div className="scanner-container">
        <div className="card">
          {!consent && (
            <div className="consent-box">
              <div className="consent-icon">[CAM]</div>
              <h2>Initialize Scanner</h2>
              <p style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                This app detects age, gender, and facial expressions every 0.5 seconds. Images are not stored.
              </p>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await registerConsent();
                  setConsent(true);
                  startVideo();
                }}
              >
                Start Camera
              </button>
            </div>
          )}

          {error && (
            <div className="error-message" style={{ marginBottom: "1rem" }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="video-container" style={{ display: consent ? "block" : "none" }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas
              ref={canvasRef}
              className="overlay-canvas"
              style={{ transform: "scaleX(-1)" }}
            />

            {!modelsLoaded && (
              <div className="video-overlay">
                <div style={{ textAlign: "center" }}>
                  <div
                    className="loading-spinner"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderWidth: "4px",
                      margin: "0 auto 1rem",
                    }}
                  ></div>
                  <p>Loading AI Models...</p>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {consent && (
              <button className="btn btn-danger" onClick={stopCamera}>
                Stop Camera
              </button>
            )}

            {consent && (
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                {loading ? "Analyzing current frame..." : statusMessage}
              </span>
            )}
          </div>

          {consent && (
            <p style={{ marginTop: "1rem", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Mode: {isAutoScanning ? "Continuous analysis (every 0.5 second)" : "Paused"}
            </p>
          )}

          {!!alerts.length && (
            <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem" }}>
              {alerts.map((alert) => (
                <div key={alert.id} className="error-message" style={{ background: "#78350f", borderColor: "#f59e0b", color: "#fde68a" }}>
                  <span>⚠️</span>
                  <span>
                    {alert.message} ({alert.ts})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Live Results</h3>
          </div>

          {lastResult ? (
            <div className="result-card">
              <div className="result-item">
                <span className="result-label">Track ID</span>
                <span className="result-value">#{lastResult.trackId}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Age</span>
                <span className="result-value">{lastResult.age} years</span>
              </div>
              <div className="result-item">
                <span className="result-label">Gender</span>
                <span className="result-value">{lastResult.gender}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Raw Emotion</span>
                <span className="result-value">{lastResult.emotion}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Smoothed Emotion</span>
                <span className="result-value">{lastResult.smoothedEmotion}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Confidence</span>
                <span className="result-value">{lastResult.confidence}%</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
              <p>No live result yet.</p>
              <p>Start camera and keep your face visible for 1-2 seconds.</p>
            </div>
          )}

          {!!liveFaceSummary.length && (
            <div style={{ marginTop: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Active Tracks</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {liveFaceSummary.map((face) => (
                  <span key={face.trackId} className="track-chip">
                    #{face.trackId} {face.emotion} ({face.confidence}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {realtimeInsights && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "1rem" }}>Behavioral Insights</h3>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value" style={{ textTransform: "capitalize" }}>
                {realtimeInsights.moodTrend}
              </div>
              <div className="stat-label">Mood Trend</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{realtimeInsights.engagementScore}</div>
              <div className="stat-label">Engagement Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{realtimeInsights.averageConfidence}%</div>
              <div className="stat-label">Avg Confidence</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ textTransform: "capitalize" }}>
                {realtimeInsights.dominantEmotion}
              </div>
              <div className="stat-label">Dominant Emotion</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{realtimeInsights.stressRisk ? "HIGH" : "LOW"}</div>
              <div className="stat-label">Stress Risk</div>
            </div>
          </div>
        </div>
      )}

      {sessionSummary && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "1rem" }}>Session Summary</h3>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{sessionSummary.durationSeconds}s</div>
              <div className="stat-label">Duration</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{sessionSummary.faceDetections}</div>
              <div className="stat-label">Faces Detected</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{sessionSummary.avgConfidence}%</div>
              <div className="stat-label">Avg Confidence</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ textTransform: "capitalize" }}>
                {sessionSummary.dominantEmotion}
              </div>
              <div className="stat-label">Dominant Emotion</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{sessionSummary.alertsTriggered}</div>
              <div className="stat-label">Alerts</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;

import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import axios from "axios";

const Scanner = () => {
  const videoRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setError("");
      const MODEL_URL = "/models";
      
      // Load all required models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      ]);

      setModelsLoaded(true);
      console.log("All Models Loaded Successfully");
    } catch (err) {
      console.error("Error loading models:", err);
      setError("Failed to load models. Please refresh the page.");
    }
  };

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing webcam:", err);
        setError("Could not access webcam. Please allow camera permissions.");
      });
  };

  const detectFace = async () => {
    if (!modelsLoaded) {
      alert("Models are still loading...");
      return;
    }

    if (!videoRef.current || !videoRef.current.srcObject) {
      alert("Please start the video first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceExpressions()
        .withAgeAndGender();

      if (!detection) {
        setError("No face detected. Please position your face in front of the camera.");
        setLoading(false);
        return;
      }

      // Get the dominant emotion
      const expressions = detection.expressions;
      const emotion = Object.keys(expressions).reduce((a, b) =>
        expressions[a] > expressions[b] ? a : b
      );

      const result = {
        age: Math.round(detection.age),
        gender: detection.gender,
        emotion: emotion,
        confidence: Math.round(expressions[emotion] * 100)
      };

      setLastResult(result);

      // Send data to server
      await axios.post("http://localhost:5000/api/face-data", {
        age: result.age,
        gender: result.gender,
        emotion: result.emotion
      });

      // alert(`Scan Complete!\nAge: ${result.age}\nGender: ${result.gender}\nEmotion: ${emotion} (${result.confidence}%)`);
    } catch (err) {
      console.error("Detection error:", err);
      setError("Error during face detection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Face Scanner</h1>
        <p className="page-subtitle">Real-time face detection with AI</p>
      </div>

      <div className="scanner-container">
        <div className="card">
          {!consent && (
            <div className="consent-box">
              <div className="consent-icon">📸</div>
              <h2>Welcome to FaceAI Scanner</h2>
              <p style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
                This app uses facial analytics to detect your age, gender, and emotions.
                No images are stored - only metadata is saved for analytics purposes.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setConsent(true);
                  startVideo();
                }}
              >
                ✓ Agree & Start Camera
              </button>
            </div>
          )}

          {error && (
            <div className="error-message">
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
            
            {!modelsLoaded && (
              <div className="video-overlay">
                <div style={{ textAlign: "center" }}>
                  <div className="loading-spinner" style={{ width: "40px", height: "40px", borderWidth: "4px", margin: "0 auto 1rem" }}></div>
                  <p>Loading AI Models...</p>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button 
              className="btn btn-primary"
              onClick={detectFace}
              disabled={!modelsLoaded || loading || !consent}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Scanning...
                </>
              ) : modelsLoaded ? (
                "🔍 Scan Face"
              ) : (
                "⏳ Loading Models..."
              )}
            </button>

            {consent && (
              <button 
                className="btn btn-danger"
                onClick={() => {
                  if (videoRef.current && videoRef.current.srcObject) {
                    videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                  }
                  setConsent(false);
                  setLastResult(null);
                }}
              >
                ⬛ Stop Camera
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Scan Results</h3>
          </div>
          
          {lastResult ? (
            <div className="result-card">
              <div className="result-item">
                <span className="result-label">Age</span>
                <span className="result-value">{lastResult.age} years</span>
              </div>
              <div className="result-item">
                <span className="result-label">Gender</span>
                <span className="result-value">{lastResult.gender}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Emotion</span>
                <span className="result-value">{lastResult.emotion}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Confidence</span>
                <span className="result-value">{lastResult.confidence}%</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
              <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>👤</p>
              <p>No scan results yet.</p>
              <p>Click "Scan Face" to detect.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;


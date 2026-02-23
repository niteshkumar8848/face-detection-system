import React, { useEffect, useState } from "react";
import axios from "axios";
import EmotionChart from "../components/EmotionChart";
import GenderChart from "../components/GenderChart";

const Dashboard = () => {
  const [emotionData, setEmotionData] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [emotionRes, genderRes] = await Promise.all([
        axios.get("http://localhost:5000/api/stats/emotions"),
        axios.get("http://localhost:5000/api/stats/gender")
      ]);
      setEmotionData(emotionRes.data);
      setGenderData(genderRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalScans = emotionData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics Dashboard</h1>
        <p className="page-subtitle">View face detection statistics and insights</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{totalScans}</div>
          <div className="stat-label">Total Scans</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{emotionData.length}</div>
          <div className="stat-label">Emotions Detected</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{genderData.length}</div>
          <div className="stat-label">Gender Categories</div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div className="loading-spinner" style={{ width: "40px", height: "40px", margin: "0 auto" }}></div>
          <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Loading statistics...</p>
        </div>
      ) : totalScans === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ fontSize: "4rem", marginBottom: "1rem" }}>📊</p>
          <h2 style={{ marginBottom: "0.5rem" }}>No Data Yet</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Start scanning faces to see statistics here!
          </p>
        </div>
      ) : (
        <div className="dashboard-grid">
          <div className="chart-container">
            <h3 className="chart-title">😊 Emotion Distribution</h3>
            <EmotionChart data={emotionData} />
          </div>
          <div className="chart-container">
            <h3 className="chart-title">👥 Gender Distribution</h3>
            <GenderChart data={genderData} />
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: "2rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>📋 Detailed Statistics</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
          <div>
            <h4 style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>Emotion Breakdown</h4>
            {emotionData.map((item) => (
              <div key={item._id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ textTransform: "capitalize" }}>{item._id || "Unknown"}</span>
                <span style={{ fontWeight: "bold", color: "var(--primary-color)" }}>{item.count}</span>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>Gender Breakdown</h4>
            {genderData.map((item) => (
              <div key={item._id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ textTransform: "capitalize" }}>{item._id || "Unknown"}</span>
                <span style={{ fontWeight: "bold", color: "var(--primary-color)" }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


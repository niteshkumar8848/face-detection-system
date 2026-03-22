import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import EmotionChart from "../components/EmotionChart";
import GenderChart from "../components/GenderChart";
import HeatmapGrid from "../components/HeatmapGrid";
import SessionPlaybackChart from "../components/SessionPlaybackChart";
import { api } from "../config/api";

const buildQuery = (filters) => {
  const params = new URLSearchParams();
  if (filters.profileId) params.append("profileId", filters.profileId);
  const query = params.toString();
  return query ? `?${query}` : "";
};

const Dashboard = () => {
  const [emotionData, setEmotionData] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [playbackData, setPlaybackData] = useState(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const eventSourceRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const query = buildQuery({});

      const [emotionRes, genderRes, heatmapRes, sessionsRes] = await Promise.all([
        axios.get(`${api.statsEmotions}${query}`),
        axios.get(`${api.statsGender}${query}`),
        axios.get(`${api.statsHeatmap}${query}`),
        axios.get(api.sessions),
      ]);

      setEmotionData(emotionRes.data);
      setGenderData(genderRes.data);
      setHeatmapData(heatmapRes.data);
      setSessions(sessionsRes.data || []);

      if (!selectedSessionId && sessionsRes.data?.length) {
        setSelectedSessionId(sessionsRes.data[0].sessionId);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const source = new EventSource(api.stream);
    eventSourceRef.current = source;

    source.addEventListener("face-data", () => {
      fetchData();
    });

    source.addEventListener("profile-updated", () => {
      fetchData();
    });

    return () => {
      source.close();
    };
  }, [fetchData]);

  useEffect(() => {
    const fetchPlayback = async () => {
      if (!selectedSessionId) {
        setPlaybackData(null);
        return;
      }

      try {
        setPlaybackLoading(true);
        const response = await axios.get(api.sessionPlayback(selectedSessionId), {
          params: { limit: 2000 },
        });
        setPlaybackData(response.data);
      } catch (err) {
        console.error("Error fetching playback data:", err);
      } finally {
        setPlaybackLoading(false);
      }
    };

    fetchPlayback();
  }, [selectedSessionId]);

  const totalScans = useMemo(
    () => emotionData.reduce((sum, item) => sum + item.count, 0),
    [emotionData]
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics Dashboard</h1>
        <p className="page-subtitle">Live stream analytics</p>
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
        <div className="stat-card">
          <div className="stat-value">{heatmapData.length}</div>
          <div className="stat-label">Heatmap Cells</div>
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
            Start scanning faces to see statistics here.
          </p>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="chart-container">
              <h3 className="chart-title">Emotion Distribution</h3>
              <EmotionChart data={emotionData} />
            </div>
            <div className="chart-container">
              <h3 className="chart-title">Gender Distribution</h3>
              <GenderChart data={genderData} />
            </div>
          </div>

          <div className="card" style={{ marginTop: "1.5rem" }}>
            <h3 className="chart-title">Activity Heatmap (Day x Hour)</h3>
            <HeatmapGrid cells={heatmapData} />
          </div>

          <div className="card" style={{ marginTop: "1.5rem" }}>
            <div className="card-header" style={{ marginBottom: "1rem" }}>
              <h3 className="chart-title">Session Playback Timeline</h3>
              <select
                className="input-control"
                style={{ maxWidth: "320px" }}
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                <option value="">Select Session</option>
                {sessions.map((session) => (
                  <option key={session.sessionId} value={session.sessionId}>
                    {session.sessionId} | {new Date(session.endedAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {playbackLoading ? (
              <p style={{ color: "var(--text-secondary)" }}>Loading playback...</p>
            ) : !playbackData?.timeline?.length ? (
              <p style={{ color: "var(--text-secondary)" }}>No playback data available.</p>
            ) : (
              <>
                <SessionPlaybackChart timeline={playbackData.timeline} />

                <div className="stats-row" style={{ marginTop: "1rem" }}>
                  <div className="stat-card">
                    <div className="stat-value">{playbackData.summary?.durationSeconds || 0}s</div>
                    <div className="stat-label">Session Duration</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{playbackData.summary?.totalFrames || 0}</div>
                    <div className="stat-label">Total Frames</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ textTransform: "capitalize" }}>
                      {playbackData.insights?.moodTrend || "stable"}
                    </div>
                    <div className="stat-label">Mood Trend</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{playbackData.insights?.engagementScore || 0}</div>
                    <div className="stat-label">Engagement</div>
                  </div>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Event Timeline</h4>
                  {!playbackData.events?.length ? (
                    <p style={{ color: "var(--text-secondary)" }}>No major events detected in this session.</p>
                  ) : (
                    <div style={{ display: "grid", gap: "0.4rem" }}>
                      {playbackData.events.slice(0, 20).map((event, index) => (
                        <div
                          key={`${event.timestamp}-${event.type}-${index}`}
                          style={{
                            border: "1px solid var(--line)",
                            background: "rgba(9, 22, 15, 0.6)",
                            padding: "0.45rem 0.6rem",
                            fontSize: "0.8rem",
                            color: "var(--text-dim)",
                          }}
                        >
                          [{new Date(event.timestamp).toLocaleTimeString()}] {event.type}: {event.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;

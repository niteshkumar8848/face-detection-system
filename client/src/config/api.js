const API_BASE =
  process.env.REACT_APP_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api";

export const api = {
  base: API_BASE,
  statsEmotions: `${API_BASE}/stats/emotions`,
  statsGender: `${API_BASE}/stats/gender`,
  statsHeatmap: `${API_BASE}/stats/heatmap`,
  statsRealtimeInsights: `${API_BASE}/stats/insights/realtime`,
  statsProfile: (profileId) => `${API_BASE}/stats/profile/${profileId}`,
  sessions: `${API_BASE}/sessions`,
  sessionPlayback: (sessionId) => `${API_BASE}/sessions/${sessionId}/playback`,
  profiles: `${API_BASE}/profiles`,
  consent: `${API_BASE}/profiles/consent`,
  faceData: `${API_BASE}/face-data`,
  stream: `${API_BASE}/stream`,
};

export default api;

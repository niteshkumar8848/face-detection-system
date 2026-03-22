const getIntensityColor = (value, max) => {
  if (!max) return "rgba(71, 85, 105, 0.25)";
  const ratio = Math.min(1, value / max);
  return `rgba(59, 130, 246, ${0.15 + ratio * 0.75})`;
};

const HeatmapGrid = ({ cells }) => {
  const hours = Array.from({ length: 24 }, (_, idx) => idx);
  const days = [...new Set(cells.map((cell) => cell.day))];
  const maxCount = cells.reduce((max, cell) => Math.max(max, cell.count), 0);

  const lookup = new Map(cells.map((cell) => [`${cell.day}-${cell.hour}`, cell.count]));

  if (!days.length) {
    return <p style={{ color: "var(--text-secondary)" }}>No heatmap data for selected range.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Day</th>
            {hours.map((hour) => (
              <th key={hour} style={{ padding: "0.35rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {hour}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day}>
              <td style={{ padding: "0.5rem", fontWeight: 600 }}>{day}</td>
              {hours.map((hour) => {
                const count = lookup.get(`${day}-${hour}`) || 0;
                return (
                  <td
                    key={`${day}-${hour}`}
                    title={`${day} ${hour}:00 - ${count} scans`}
                    style={{
                      width: "24px",
                      height: "24px",
                      border: "1px solid rgba(148, 163, 184, 0.25)",
                      backgroundColor: getIntensityColor(count, maxCount),
                      textAlign: "center",
                      fontSize: "0.7rem",
                      color: "#e2e8f0",
                    }}
                  >
                    {count > 0 ? count : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HeatmapGrid;

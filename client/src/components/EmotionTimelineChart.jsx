import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const EmotionTimelineChart = ({ points }) => {
  const chartData = {
    labels: points.map((point) => point.label),
    datasets: [
      {
        label: "Smoothed Confidence",
        data: points.map((point) => point.confidence),
        borderColor: "rgba(16, 185, 129, 1)",
        backgroundColor: "rgba(16, 185, 129, 0.25)",
        tension: 0.35,
        fill: true,
        pointRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#cbd5e1",
        },
      },
      tooltip: {
        callbacks: {
          afterLabel: (ctx) => {
            const item = points[ctx.dataIndex];
            return item ? `Emotion: ${item.emotion}` : "";
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8", maxTicksLimit: 10 },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: "#94a3b8" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
    },
  };

  return (
    <div style={{ height: "240px" }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default EmotionTimelineChart;

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

const SessionPlaybackChart = ({ timeline }) => {
  const labels = timeline.map((point) =>
    new Date(point.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: "Faces",
        data: timeline.map((point) => point.faceCount),
        borderColor: "rgba(40, 255, 138, 1)",
        backgroundColor: "rgba(40, 255, 138, 0.2)",
        pointRadius: 2,
        tension: 0.25,
      },
      {
        label: "Avg Confidence",
        data: timeline.map((point) => point.avgConfidence),
        borderColor: "rgba(120, 177, 144, 1)",
        backgroundColor: "rgba(120, 177, 144, 0.2)",
        pointRadius: 1,
        tension: 0.25,
        yAxisID: "confidence",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: "#78b190",
        },
      },
      tooltip: {
        callbacks: {
          afterBody: (items) => {
            const index = items?.[0]?.dataIndex;
            if (index == null) {
              return "";
            }
            return `Emotion: ${timeline[index]?.dominantEmotion || "unknown"}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#5d8d72",
          maxTicksLimit: 10,
        },
        grid: {
          color: "rgba(23, 60, 38, 0.4)",
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#5d8d72",
        },
        grid: {
          color: "rgba(23, 60, 38, 0.4)",
        },
      },
      confidence: {
        position: "right",
        beginAtZero: true,
        max: 100,
        ticks: {
          color: "#5d8d72",
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div style={{ height: "260px" }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default SessionPlaybackChart;

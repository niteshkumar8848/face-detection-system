import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

const GenderChart = ({ data }) => {
  const chartData = {
    labels: data.map(item => item._id || "Unknown"),
    datasets: [
      {
        data: data.map(item => item.count),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",  // Male - blue
          "rgba(236, 72, 153, 0.8)",  // Female - pink
        ],
        borderColor: [
          "rgba(59, 130, 246, 1)",
          "rgba(236, 72, 153, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#94a3b8",
          padding: 20,
          font: {
            size: 14,
          },
        },
      },
      title: {
        display: false,
      },
    },
  };

  return <Pie data={chartData} options={options} />;
};

export default GenderChart;


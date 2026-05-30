import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Explicitly register required ChartJS controllers and scales
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CrimeChart = ({ stats }) => {
  // Extract and sort stats descending by count
  const sortedStats = Object.entries(stats || {})
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const labels = sortedStats.map((item) => item.type);
  const counts = sortedStats.map((item) => item.count);

  const data = {
    labels,
    datasets: [
      {
        label: 'Crime Frequency',
        data: counts,
        backgroundColor: 'rgba(244, 63, 94, 0.65)', // Sleek rose color
        borderColor: '#f43f5e',
        borderWidth: 1.5,
        borderRadius: 6, // Rounded bars for a premium design feel!
        hoverBackgroundColor: '#e11d48',
        hoverBorderColor: '#e11d48',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend since there's only one dataset
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: {
          family: 'Outfit',
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          family: 'Plus Jakarta Sans',
          size: 13,
        },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false, // Clean look, no vertical grid lines
        },
        ticks: {
          color: '#94a3b8', // Slate 400
          font: {
            family: 'Plus Jakarta Sans',
            size: 11,
            weight: '500',
          },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)', // Subtle horizontal grid lines
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: 'Plus Jakarta Sans',
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div style={{ height: '320px', position: 'relative' }}>
      {sortedStats.length === 0 ? (
        <div style={{
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#64748b'
        }}>
          No statistics available.
        </div>
      ) : (
        <Bar data={data} options={options} />
      )}
    </div>
  );
};

export default CrimeChart;

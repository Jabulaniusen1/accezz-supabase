import React from 'react';
import { Bar } from 'react-chartjs-2';
import { ChartData } from '@/types/analytics';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ChartOptions
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface AnalyticsDashboardProps {
  chartData: ChartData;
}

const options: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#6b7280',
        font: {
          family: 'Inter'
        }
      }
    },
    tooltip: {
      backgroundColor: '#1f2937',
      titleFont: {
        family: 'Inter',
        size: 14
      },
      bodyFont: {
        family: 'Inter',
        size: 12
      },
      padding: 12,
      usePointStyle: true,
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        color: '#6b7280'
      }
    },
    y: {
      grid: {
        color: '#e5e7eb'
      },
      ticks: {
        color: '#6b7280'
      }
    }
  }
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ chartData }) => (
  <div className="h-full w-full">
    <Bar 
      data={chartData} 
      options={options}
    />
  </div>
);
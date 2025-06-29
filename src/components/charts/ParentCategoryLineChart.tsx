import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MonthlySpendingByParentCategory, AnalysisService } from '../../services/analysisApi';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ParentCategoryLineChartProps {
  year?: number;
}

const ParentCategoryLineChart: React.FC<ParentCategoryLineChartProps> = ({ year = new Date().getFullYear() }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spendingData, setSpendingData] = useState<MonthlySpendingByParentCategory | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await AnalysisService.getSpendingByParentCategoryPerMonth(year);
        setSpendingData(data);
      } catch (err) {
        console.error('Failed to fetch spending data:', err);
        setError('Failed to load spending data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!spendingData || !spendingData.categories.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No spending data available for {year}.</Typography>
      </Box>
    );
  }

  // Generate random colors for each category
  const generateColors = (count: number) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * 200);
      const g = Math.floor(Math.random() * 200);
      const b = Math.floor(Math.random() * 200);
      colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
    }
    return colors;
  };

  const backgroundColors = generateColors(spendingData.categories.length);

  const chartData = {
    labels: spendingData.months,
    datasets: spendingData.categories.map((category, index) => ({
      label: category.name,
      data: category.data, // Use actual values, not absolute values
      borderColor: backgroundColors[index],
      backgroundColor: backgroundColors[index].replace('0.7', '0.1'),
      borderWidth: 2,
      tension: 0.4,
      fill: false
    }))
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Monthly Spending by Category (${year})`,
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EUR'
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        // Allow negative values to show properly
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'EUR',
              maximumSignificantDigits: 3
            }).format(value as number);
          }
        }
      }
    }
  };

  return (
    <Box sx={{ height: 400, p: 2 }}>
      <Line data={chartData} options={options} />
    </Box>
  );
};

export default ParentCategoryLineChart;

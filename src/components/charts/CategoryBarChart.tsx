import React, { useEffect, useState } from 'react';
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
import { Bar } from 'react-chartjs-2';
import { Box, CircularProgress, Typography } from '@mui/material';
import { CategorySpendingForMonth, AnalysisService } from '../../services/analysisApi';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CategoryBarChartProps {
  parentId: number;
  month: number;
  year?: number;
  parentName?: string;
}

const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ 
  parentId, 
  month, 
  year = new Date().getFullYear(),
  parentName = 'Selected Category' 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spendingData, setSpendingData] = useState<CategorySpendingForMonth | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await AnalysisService.getSpendingByCategoryForMonth(parentId, month, year);
        setSpendingData(data);
      } catch (err) {
        console.error('Failed to fetch category spending data:', err);
        setError('Failed to load category spending data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (parentId) {
      fetchData();
    }
  }, [parentId, month, year]);

  if (!parentId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Please select a parent category to view detailed spending.</Typography>
      </Box>
    );
  }

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
        <Typography>No spending data available for the selected category and month.</Typography>
      </Box>
    );
  }

  // Get month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[month - 1];

  // Generate a color for each category
  const generateColors = (count: number) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 137.5) % 360; // Use golden ratio to distribute colors
      colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
    }
    return colors;
  };

  const backgroundColors = generateColors(spendingData.categories.length);

  const chartData = {
    labels: spendingData.categories.map(cat => cat.name),
    datasets: [
      {
        label: 'Spending',
        data: spendingData.categories.map(cat => Math.abs(cat.total)), // Absolute value for better visualization
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
        borderWidth: 1
      }
    ]
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Horizontal bar chart
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: `${parentName} Spending Breakdown - ${monthName} ${year}`,
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
            if (context.parsed.x !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EUR'
              }).format(context.parsed.x);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
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
      <Bar data={chartData} options={options} />
    </Box>
  );
};

export default CategoryBarChart;

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

  // Generate consistent colors based on category ID
  const generateColorForCategory = (id: number) => {
    // Use the ID as a seed for consistent color generation
    const hue = (id * 137.5) % 360; // Golden ratio to distribute colors nicely
    return `hsla(${hue}, 70%, 60%, 0.7)`;
  };

  const backgroundColors = spendingData.categories.map(category => 
    generateColorForCategory(category.id)
  );

  const chartData = {
    labels: spendingData.months,
    datasets: spendingData.categories.map((category, index) => ({
      label: category.name,
      data: category.data.map(value => Math.abs(value)), // Use absolute values
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
          title: function(tooltipItems) {
            // Display the month name
            return tooltipItems[0].label;
          },
          label: function(context) {
            // Get the original value (not the absolute one)
            const originalValue = spendingData.categories[context.datasetIndex].data[context.dataIndex];
            let displayLabel = context.dataset.label || '';
            if (displayLabel) {
              displayLabel += ': ';
            }
            // Format the amount as currency
            displayLabel += new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'EUR'
            }).format(Math.abs(originalValue));
            
            // Add a note if it's income (+) or expense (-)
            if (originalValue > 0) {
              displayLabel += ' (Income)';
            } else if (originalValue < 0) {
              displayLabel += ' (Expense)';
            }
            
            return displayLabel;
          }
        },
        // Make tooltip more visible with type-safe properties
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { top: 10, bottom: 10, left: 10, right: 10 },
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: {
      y: {
        // Since we're using absolute values, always start at zero
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
      <Line data={chartData} options={options} />
    </Box>
  );
};

export default ParentCategoryLineChart;

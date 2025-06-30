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

  // Generate colors based on whether it's income or expense
  const getColorForCategory = (category: {id: number, total: number}) => {
    // Use red shades for expenses, green shades for income
    if (category.total >= 0) {
      // Income - green shades
      const baseHue = 120; // Green
      const hueVariation = (category.id * 20) % 60; // Variations within green
      return `hsla(${baseHue + hueVariation}, 70%, 45%, 0.7)`;
    } else {
      // Expense - red shades
      const baseHue = 0; // Red
      const hueVariation = (category.id * 20) % 60; // Variations within red
      return `hsla(${baseHue + hueVariation}, 70%, 50%, 0.7)`;
    }
  };

  const backgroundColors = spendingData.categories.map(category => 
    getColorForCategory(category)
  );

  // Use absolute values for display but keep original values for tooltips
  const absValues = spendingData.categories.map(cat => Math.abs(cat.total));
  
  const chartData = {
    labels: spendingData.categories.map(cat => cat.name),
    datasets: [
      {
        label: 'Spending',
        data: absValues,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
        borderWidth: 1
      }
    ]
  };

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
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
        text: `${parentName} Category Breakdown - ${monthName} ${year}`,
        font: {
          size: 16
        }
      },
      tooltip: {
        // TypeScript-safe tooltip configuration
        usePointStyle: true,
        backgroundColor: 'rgba(0,0,0,0.8)',
      }
    },
    scales: {
      x: {
        // Since we're using absolute values, always start at zero
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value as number);
          }
        }
      }
    },
    // Override default tooltip behavior to show our custom tooltip
    // This avoids TypeScript errors with the callbacks
    onHover: (event, elements) => {
      // Custom hover behavior can be added here if needed
    }
  };

  // Manually configure tooltip callbacks after render via plugin
  // This avoids TypeScript errors with the complex tooltip configuration
  ChartJS.register({
    id: 'categoryBarTooltipPlugin',
    beforeInit: (chart) => {
      const originalTooltipLabelCallback = chart.options.plugins?.tooltip?.callbacks?.label;
      
      if (chart.options.plugins && chart.options.plugins.tooltip && chart.options.plugins.tooltip.callbacks) {
        chart.options.plugins.tooltip.callbacks.label = function(context) {
          const index = context.dataIndex;
          
          // Add safety check to prevent errors when the index doesn't exist in the data
          if (!spendingData || !spendingData.categories || !spendingData.categories[index]) {
            return 'No data available';
          }
          
          const originalValue = spendingData.categories[index].total;
          const absValue = Math.abs(originalValue);
          const formattedValue = formatCurrency(absValue);
          
          const categoryName = spendingData.categories[index].name;
          const typeLabel = originalValue > 0 ? 'Income' : 'Expense';
          
          // Create a more descriptive tooltip
          let displayText = `${categoryName}: ${formattedValue}`;
          displayText += ` (${typeLabel})`;
          
          return displayText;
        };
      }
    }
  });

  return (
    <Box sx={{ height: 400, p: 2 }}>
      <Bar data={chartData} options={options} />
    </Box>
  );
};

export default CategoryBarChart;

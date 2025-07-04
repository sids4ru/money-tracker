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
  ChartOptions,
  ChartData
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, CircularProgress, Typography, Divider } from '@mui/material';
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
  selectedMonth?: number; // Month number (1-12)
  showOnlyDailyChart?: boolean; // When true, only show daily spending chart
}

const ParentCategoryLineChart: React.FC<ParentCategoryLineChartProps> = ({ 
  year = new Date().getFullYear(),
  selectedMonth = new Date().getMonth() + 1, // Default to current month
  showOnlyDailyChart = false
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spendingData, setSpendingData] = useState<MonthlySpendingByParentCategory | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Pass the selected month to include daily data for that month
        const data = await AnalysisService.getSpendingByParentCategoryPerMonth(year, selectedMonth);
        setSpendingData(data);
      } catch (err) {
        console.error('Failed to fetch spending data:', err);
        setError('Failed to load spending data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, selectedMonth]);

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

  // Check if we have daily data for the selected month
  const hasDailyData = spendingData.categories.some(cat => 
    cat.dailyData && cat.dailyData.values.some(v => v !== 0)
  );

  // Generate consistent colors based on category ID
  const generateColorForCategory = (id: number) => {
    // Use the ID as a seed for consistent color generation
    const hue = (id * 137.5) % 360; // Golden ratio to distribute colors nicely
    return `hsla(${hue}, 70%, 60%, 0.7)`;
  };

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumSignificantDigits: 3
    }).format(value);
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
            displayLabel += formatCurrency(Math.abs(originalValue));
            
            // For the monthly chart, we'll keep the tooltip simple
            
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
            return formatCurrency(value as number);
          },
          // Limit the maximum number of ticks for better readability
          maxTicksLimit: 8,
          padding: 10
        }
      }
    }
  };

  // Generate chart data and options for daily spending if available
  let dailyChartData: ChartData<'line'> | undefined = undefined;
  let dailyOptions: ChartOptions<'line'> | undefined = undefined;
  
  if (hasDailyData) {
    // Get the month name for the selected month (adjust for 0-indexed array)
    const monthName = spendingData.months[selectedMonth - 1];
    
    // Prepare data for categories that have daily data
    const dailyDatasets = spendingData.categories
      .filter(category => 
        category.dailyData && 
        category.dailyData.values.some(v => v !== 0)
      )
      .map((category, index) => {
        const color = generateColorForCategory(category.id);
        return {
          label: category.name,
          data: category.dailyData!.values.map(value => Math.abs(value)),
          borderColor: color,
          backgroundColor: color.replace('0.7', '0.1'),
          borderWidth: 2,
          tension: 0.4,
          fill: false
        };
      });
    
    // Only create daily chart if we have data
    if (dailyDatasets.length > 0) {
      dailyChartData = {
        labels: spendingData.categories[0].dailyData!.days,
        datasets: dailyDatasets
      };
      
      dailyOptions = {
        ...options, // Inherit base options
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
          },
          title: {
            display: true,
            text: `Daily Spending for ${monthName} ${year}`,
            font: {
              size: 16
            }
          },
          tooltip: {
            callbacks: {
              title: function(tooltipItems: any) {
                // Display day of month
                return `Day ${tooltipItems[0].label}`;
              },
              label: function(context: any) {
                // Get category index
                const categoryIndex = spendingData.categories.findIndex(
                  cat => cat.name === context.dataset.label
                );
                
                if (categoryIndex === -1) {
                  return context.dataset.label;
                }
                
                // Get original value with sign
                const dayIndex = parseInt(context.label) - 1;
                const originalValue = spendingData.categories[categoryIndex].dailyData!.values[dayIndex];
                
                let displayLabel = context.dataset.label || '';
                if (displayLabel) {
                  displayLabel += ': ';
                }
                
                // Format the amount as currency
                displayLabel += formatCurrency(Math.abs(originalValue));
                
                // For the daily chart, we'll show expense/income type
                if (originalValue > 0) {
                  displayLabel += ' (Income)';
                } else if (originalValue < 0) {
                  displayLabel += ' (Expense)';
                }
                
                return displayLabel;
              }
            },
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
          x: {
            // Ensure proper alignment between grid lines and data points
            offset: true,
            grid: {
              offset: false
            },
            ticks: {
              align: 'center'
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value: any) {
                return formatCurrency(value);
              },
              // Limit the maximum number of ticks for better readability
              maxTicksLimit: 8,
              padding: 10
            }
          }
        }
      };
    }
  }

  return (
    <Box>
      {!showOnlyDailyChart && (
        <Box sx={{ height: 400, p: 2 }}>
          <Line data={chartData} options={options} />
        </Box>
      )}
      
      {dailyChartData && dailyOptions && (
        <Box mt={showOnlyDailyChart ? 0 : 4}>
          {!showOnlyDailyChart && <Divider sx={{ my: 2 }} />}
          <Box sx={{ height: 400, p: 2 }}>
            <Line data={dailyChartData} options={dailyOptions} />
          </Box>
        </Box>
      )}
      
      {showOnlyDailyChart && !dailyChartData && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No daily spending data available for {spendingData.months[selectedMonth - 1]} {year}.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default ParentCategoryLineChart;

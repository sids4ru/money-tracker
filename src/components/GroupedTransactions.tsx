import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid as MuiGrid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { Transaction } from '../types/Transaction';
import { CategoryService } from '../services/categoryApi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

// Create a wrapper around MuiGrid to make TypeScript happy
const Grid = MuiGrid as any;

interface GroupedTransactionsProps {
  transactions: Transaction[];
  isLoading: boolean;
}

interface MonthlyData {
  name: string; // month name
  month: number; // month number
  year: number; // year
  earnings: number;
  expenditures: number;
  savings: number;
  balance: number;
  categories: {
    [category: string]: number;
  };
}

interface CategoryEntry {
  name: string;
  value: number;
}

const GroupedTransactions: React.FC<GroupedTransactionsProps> = ({ transactions, isLoading }) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedView, setSelectedView] = useState<string>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const [transactionCategories, setTransactionCategories] = useState<{[key: string]: {name: string, id: number}}>({});
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];
  
  // Month names for display - moved outside effect to avoid recreation
  const monthNames = React.useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  // Load all categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await CategoryService.getAllCategories();
        if (response && Array.isArray(response)) {
          setCategories(response.map((cat: any) => ({ 
            id: cat.id || 0, 
            name: cat.name || 'Unknown'
          })));
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);

  // Load transaction categories
  useEffect(() => {
    const fetchTransactionCategories = async () => {
      const categoriesMap: {[key: string]: {name: string, id: number}} = {};
      
      // Process transactions in batches to avoid too many concurrent requests
      for (let i = 0; i < transactions.length; i += 10) {
        const batch = transactions.slice(i, i + 10);
        await Promise.all(batch.map(async (transaction) => {
          if (transaction.id) {
            try {
              const cats = await CategoryService.getCategoriesForTransaction(transaction.id);
              if (cats && cats.length > 0) {
                const catId = cats[0].id !== undefined ? cats[0].id : 0;
                categoriesMap[transaction.id] = { 
                  name: cats[0].name, 
                  id: catId 
                };
              }
            } catch (error) {
              console.error(`Failed to fetch categories for transaction ${transaction.id}:`, error);
            }
          }
        }));
      }
      
      setTransactionCategories(categoriesMap);
    };
    
    fetchTransactionCategories();
  }, [transactions]);

  // Process transactions data for charts
  useEffect(() => {
    // Skip if no transactions or categories are loaded
    if (transactions.length === 0) return;
    
    // Track years for filter dropdown
    const years = new Set<number>();
    
    // Group transactions by month
    const monthlyDataMap: { [key: string]: MonthlyData } = {};
    
    transactions.forEach(transaction => {
      // Parse date (format: DD/MM/YYYY)
      const dateParts = transaction.date.split('/');
      if (dateParts.length !== 3) return; // Skip invalid dates
      
      const month = parseInt(dateParts[1]) - 1; // 0-based month
      const year = parseInt(dateParts[2]);
      
      years.add(year);
      
      const monthKey = `${year}-${month}`;
      
      // Initialize month data if not exists
      if (!monthlyDataMap[monthKey]) {
        monthlyDataMap[monthKey] = {
          name: `${monthNames[month]} ${year}`,
          month,
          year,
          earnings: 0,
          expenditures: 0,
          savings: 0,
          balance: 0,
          categories: {}
        };
      }
      
      // Determine transaction amount
      const amount = transaction.debitAmount 
        ? -parseFloat(transaction.debitAmount.replace(/,/g, ''))
        : (transaction.creditAmount ? parseFloat(transaction.creditAmount.replace(/,/g, '')) : 0);
      
      // Get transaction category
      const categoryInfo = transaction.id ? transactionCategories[transaction.id] : undefined;
      const categoryName = categoryInfo ? categoryInfo.name : 'Uncategorized';
      
      // Update category total
      if (!monthlyDataMap[monthKey].categories[categoryName]) {
        monthlyDataMap[monthKey].categories[categoryName] = 0;
      }
      monthlyDataMap[monthKey].categories[categoryName] += amount;
      
      // Update monthly totals
      if (amount > 0) {
        monthlyDataMap[monthKey].earnings += amount;
      } else if (amount < 0) {
        monthlyDataMap[monthKey].expenditures += Math.abs(amount);
      }
      
      monthlyDataMap[monthKey].balance += amount;
    });
    
    // Convert to array and sort by date
    const monthlyDataArray = Object.values(monthlyDataMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    
    setMonthlyData(monthlyDataArray);
    
    const sortedYears = Array.from(years).sort();
    setYearOptions(sortedYears);
    
    // Default to most recent year if available, but only if we don't already have a valid year
    // This prevents an infinite loop by not updating selectedYear when it's already valid
    if (years.size > 0 && !sortedYears.includes(selectedYear)) {
      const maxYear = Math.max(...sortedYears);
      setSelectedYear(maxYear);
    }
  // Remove selectedYear and yearOptions from dependencies to prevent infinite updates
  }, [transactions, transactionCategories, monthNames]);

  const handleViewChange = (event: SelectChangeEvent) => {
    setSelectedView(event.target.value);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(Number(event.target.value));
  };
  
  // Filter data by selected year
  const filteredData = monthlyData.filter(data => data.year === selectedYear);
  
  // Prepare data for category distribution chart
  const prepareCategoryData = (): CategoryEntry[] => {
    const categoryTotals: {[key: string]: number} = {};
    
    filteredData.forEach(month => {
      Object.entries(month.categories).forEach(([category, amount]) => {
        if (!categoryTotals[category]) {
          categoryTotals[category] = 0;
        }
        // Only count negative values (expenses) for category distribution
        categoryTotals[category] += amount < 0 ? Math.abs(amount) : 0;
      });
    });
    
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Take top 8 categories for clarity
  };
  
  const categoryData = prepareCategoryData();
  
  // Calculate summary statistics
  const totalEarnings = filteredData.reduce((sum, month) => sum + month.earnings, 0);
  const totalExpenditures = filteredData.reduce((sum, month) => sum + month.expenditures, 0);
  const totalBalance = filteredData.reduce((sum, month) => sum + month.balance, 0);
  
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">Loading transactions...</Typography>
      </Paper>
    );
  }
  
  if (!transactions.length) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">No transactions available. Please import your transactions first.</Typography>
      </Paper>
    );
  }

  // Format money values
  const formatCurrency = (value: number) => {
    return `€${value.toFixed(2)}`;
  };
  
  // Custom label for pie chart
  const renderPieLabel = (props: any) => {
    const { name, percent } = props;
    if (!percent) return null;
    return `${name}: ${(percent * 100).toFixed(0)}%`;
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* View selection controls */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>View</InputLabel>
            <Select
              value={selectedView}
              label="View"
              onChange={handleViewChange}
            >
              <MenuItem value="monthly">Monthly Overview</MenuItem>
              <MenuItem value="category">Category Distribution</MenuItem>
              <MenuItem value="trend">Spending Trend</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              label="Year"
              onChange={handleYearChange}
            >
              {yearOptions.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Income</Typography>
              <Typography variant="h4" color="success.main">{formatCurrency(totalEarnings)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Expenses</Typography>
              <Typography variant="h4" color="error.main">{formatCurrency(totalExpenditures)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Net Balance</Typography>
              <Typography variant="h4" color={totalBalance >= 0 ? 'success.main' : 'error.main'}>
                {formatCurrency(totalBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Charts based on selected view */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ height: 500 }}>
          {selectedView === 'monthly' && (
            <>
              <Typography variant="h6" gutterBottom>Monthly Income and Expenses ({selectedYear})</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={filteredData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar name="Income" dataKey="earnings" fill="#82ca9d" />
                  <Bar name="Expenses" dataKey="expenditures" fill="#ff8042" />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
          
          {selectedView === 'category' && (
            <>
              <Typography variant="h6" gutterBottom>Category Distribution ({selectedYear})</Typography>
              <Grid container>
                <Grid item xs={12} md={7}>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderPieLabel}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Box sx={{ mt: 5 }}>
                    {categoryData.map((entry, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box 
                          sx={{ 
                            width: 16, 
                            height: 16, 
                            bgcolor: COLORS[index % COLORS.length], 
                            mr: 1,
                            borderRadius: '2px' 
                          }} 
                        />
                        <Typography variant="body2">
                          {entry.name}: {formatCurrency(entry.value)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </>
          )}
          
          {selectedView === 'trend' && (
            <>
              <Typography variant="h6" gutterBottom>Spending Trend ({selectedYear})</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    name="Balance" 
                    dataKey="balance" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3} 
                  />
                  <Line 
                    type="monotone" 
                    name="Expenses" 
                    dataKey="expenditures" 
                    stroke="#ff7300" 
                    strokeWidth={2} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default GroupedTransactions;

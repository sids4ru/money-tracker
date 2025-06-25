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
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler
} from 'chart.js';
import { Bar as BarChart, Pie as PieChart, Line as LineChart } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler
);

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
  openingBalance: number;
  categories: {
    [category: string]: number;
  };
}

interface CategoryEntry {
  name: string;
  value: number;
  id?: number;
  parentId?: number | null;
  subcategories?: CategoryEntry[];
}

interface ParentCategoryWithSubcategories {
  parentName: string;
  parentId: number;
  total: number;
  subcategories: {name: string, value: number}[];
}

const GroupedTransactions: React.FC<GroupedTransactionsProps> = ({ transactions, isLoading }) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categories, setCategories] = useState<{id: number, name: string, parent_id?: number | null}[]>([]);
  const [selectedView, setSelectedView] = useState<string>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(-1); // -1 means all months
  const [categoryHierarchy, setCategoryHierarchy] = useState<{[key: number]: {id: number, name: string, parent_id?: number | null, children: number[]}}>({}); 
  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const [monthOptions, setMonthOptions] = useState<{value: number, label: string}[]>([]);
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
          // Store all categories with their parent_id
          setCategories(response.map((cat: any) => ({ 
            id: cat.id || 0, 
            name: cat.name || 'Uncategorized',
            parent_id: cat.parent_id
          })));
          
          // Build category hierarchy - organize parent-child relationships
          const hierarchy: {[key: number]: {id: number, name: string, parent_id?: number | null, children: number[]}} = {};
          
          // First pass: create entries for all categories
          response.forEach((cat: any) => {
            if (cat.id) {
              hierarchy[cat.id] = {
                id: cat.id,
                name: cat.name || 'Uncategorized',
                parent_id: cat.parent_id,
                children: []
              };
            }
          });
          
          // Second pass: populate children arrays
          response.forEach((cat: any) => {
            if (cat.id && cat.parent_id && hierarchy[cat.parent_id]) {
              hierarchy[cat.parent_id].children.push(cat.id);
            }
          });
          
          setCategoryHierarchy(hierarchy);
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
      
      // First get all available categories to have the complete data
      try {
        const allCategories = await CategoryService.getAllCategories();
        console.log("All categories loaded:", allCategories.length);
        
        // Process transactions in batches to avoid too many concurrent requests
        for (let i = 0; i < transactions.length; i += 10) {
          const batch = transactions.slice(i, i + 10);
          await Promise.all(batch.map(async (transaction) => {
            if (transaction.id) {
              try {
                const cats = await CategoryService.getCategoriesForTransaction(transaction.id);
                if (cats && cats.length > 0) {
                  const catId = cats[0].id !== undefined ? cats[0].id : 0;
                  
                  // Find the full category object to check if it's a parent or child
                  const fullCategory = allCategories.find(c => c.id === catId);
                  
                  // Use the category we found or fallback to the basic one
                  categoriesMap[transaction.id] = { 
                    name: fullCategory?.name || cats[0].name || 'Uncategorized', 
                    id: catId 
                  };
                  
                  console.log(`Transaction ${transaction.id} assigned to category: ${fullCategory?.name || cats[0].name}, ID: ${catId}`);
                }
              } catch (error) {
                console.error(`Failed to fetch categories for transaction ${transaction.id}:`, error);
              }
            }
          }));
        }
      } catch (error) {
        console.error('Error during category loading:', error);
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
        // Find previous month's closing balance to use as opening balance
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const prevMonthKey = `${prevYear}-${prevMonth}`;
        const prevMonthData = monthlyDataMap[prevMonthKey];
        const openingBalance = prevMonthData ? prevMonthData.balance : 0;
        
        monthlyDataMap[monthKey] = {
          name: `${monthNames[month]} ${year}`,
          month,
          year,
          earnings: 0,
          expenditures: 0,
          savings: 0,
          balance: openingBalance,
          openingBalance: openingBalance,
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
      
      // Handle special categories
      const isSavingsCategory = categoryName.toLowerCase().includes('saving') || 
                                categoryName.toLowerCase().includes('investment') ||
                                categoryName.toLowerCase().includes('deposit') ||
                                categoryName.toLowerCase().includes('trading') ||
                                categoryName.toLowerCase().includes('etoro') ||
                                categoryName.toLowerCase().includes('revolut');
      
      // Update category total
      if (!monthlyDataMap[monthKey].categories[categoryName]) {
        monthlyDataMap[monthKey].categories[categoryName] = 0;
      }
      monthlyDataMap[monthKey].categories[categoryName] += amount;
      
      // Update monthly totals with proper classification
      if (amount > 0) {
        monthlyDataMap[monthKey].earnings += amount;
      } else if (amount < 0) {
        // If it's a savings category, treat differently from regular expenses
        if (isSavingsCategory) {
          monthlyDataMap[monthKey].savings += Math.abs(amount);
        } else {
          monthlyDataMap[monthKey].expenditures += Math.abs(amount);
        }
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

  // Generate available months based on filtered data
  useEffect(() => {
    const availableMonths = new Set<number>();
    monthlyData
      .filter(data => data.year === selectedYear)
      .forEach(data => {
        availableMonths.add(data.month);
      });
    
    const monthOptionsList = Array.from(availableMonths).sort().map(month => ({
      value: month,
      label: monthNames[month]
    }));
    
    // Add "All Months" option
    monthOptionsList.unshift({ value: -1, label: "All Months" });
    
    setMonthOptions(monthOptionsList);
    
    // Reset selected month if not available in the new year
    if (!availableMonths.has(selectedMonth) && selectedMonth !== -1) {
      setSelectedMonth(-1);
    }
  }, [selectedYear, monthlyData, monthNames, selectedMonth]);

  const handleViewChange = (event: SelectChangeEvent) => {
    setSelectedView(event.target.value);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(Number(event.target.value));
  };
  
  const handleMonthChange = (event: SelectChangeEvent<number>) => {
    setSelectedMonth(Number(event.target.value));
  };
  
  // Filter data by selected year
  const yearData = monthlyData.filter(data => data.year === selectedYear);

  // Get the selected month data and previous 2 months if available
  const getMonthsData = () => {
    if (selectedMonth === -1) {
      // If "All Months" selected, get the most recent 3 months
      return yearData
        .sort((a, b) => b.month - a.month)  // Sort by most recent first
        .slice(0, 3);                       // Take most recent 3
    } else {
      // Find the index of the selected month in the sorted array
      const sortedMonths = yearData.sort((a, b) => a.month - b.month);
      const selectedMonthIndex = sortedMonths.findIndex(m => m.month === selectedMonth);
      
      if (selectedMonthIndex !== -1) {
        // Get up to 3 months - the selected month and up to 2 previous
        const startIndex = Math.max(0, selectedMonthIndex - 2);
        return sortedMonths.slice(startIndex, selectedMonthIndex + 1);
      } else {
        // Fallback if selected month not found
        return [];
      }
    }
  };

  // Filter data by selected year and month if specific month is selected
  const filteredData = yearData.filter(data => {
    if (selectedMonth === -1) {
      return true; // All months for the year
    } else {
      return data.month === selectedMonth;
    }
  });
  
  // Data for the three months view
  const monthsToShow = getMonthsData().reverse(); // Show in chronological order
  
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
      .sort((a, b) => b.value - a.value);
  };
  
  const categoryData = prepareCategoryData();
  
  // Calculate summary statistics
  const totalEarnings = filteredData.reduce((sum, month) => sum + month.earnings, 0);
  const totalExpenditures = filteredData.reduce((sum, month) => sum + month.expenditures, 0);
  const totalSavings = filteredData.reduce((sum, month) => sum + month.savings, 0);
  const totalBalance = filteredData.reduce((sum, month) => sum + month.balance, 0);
  const initialBalance = filteredData.length > 0 ? filteredData[0].openingBalance : 0;
  
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
  
  // Map for converting Unknown category names to more descriptive labels
  const getCategoryDisplayName = (name: string): string => {
    if (name === 'Unknown') {
      return 'Miscellaneous';
    }
    return name;
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
              <MenuItem value="savings">Savings Analysis</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={selectedView === 'category' ? 4 : 6}>
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
        
        {selectedView === 'category' && (
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={handleMonthChange}
              >
                {monthOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
      </Grid>
      
      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Income</Typography>
              <Typography variant="h4" color="success.main">{formatCurrency(totalEarnings)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Expenses</Typography>
              <Typography variant="h4" color="error.main">{formatCurrency(totalExpenditures)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Savings</Typography>
              <Typography variant="h4" color="info.main">{formatCurrency(totalSavings)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Net Balance</Typography>
              <Typography variant="h4" color={totalBalance >= 0 ? 'success.main' : 'error.main'}>
                {formatCurrency(totalBalance)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Opening: {formatCurrency(initialBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Charts based on selected view */}
      <Paper sx={{ p: 3, boxShadow: '0 3px 10px rgba(0,0,0,0.08)' }}>
        <Box sx={{ height: 500 }}>
          {selectedView === 'monthly' && (
            <>
              <Typography variant="h6" gutterBottom fontWeight="bold">Monthly Income and Expenses ({selectedYear})</Typography>
              <Box sx={{ height: '100%', width: '100%' }}>
                <BarChart
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45
                        }
                      },
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => formatCurrency(Number(value))
                        }
                      }
                    },
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw as number)}`;
                          }
                        }
                      }
                    }
                  }}
                  data={{
                    labels: filteredData.map(item => item.name),
                    datasets: [
                      {
                        label: 'Income',
                        data: filteredData.map(item => item.earnings),
                        backgroundColor: '#82ca9d',
                      },
                      {
                        label: 'Expenses',
                        data: filteredData.map(item => item.expenditures),
                        backgroundColor: '#ff8042',
                      },
                      {
                        label: 'Savings',
                        data: filteredData.map(item => item.savings),
                        backgroundColor: '#8884d8',
                      },
                      {
                        label: 'Opening Balance',
                        data: filteredData.map(item => item.openingBalance),
                        backgroundColor: '#82b1ff',
                      },
                    ],
                  }}
                />
              </Box>
            </>
          )}
          
          {selectedView === 'category' && (
            <>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Category Distribution ({selectedYear}{selectedMonth !== -1 ? ` - ${monthNames[selectedMonth]}` : ''})
              </Typography>

              {monthsToShow.length === 0 ? (
                <Typography variant="body1">No data available for the selected month(s).</Typography>
              ) : (
                monthsToShow.map((monthData, monthIndex) => {
                  // Process month's category data to organize by parent categories
                  const processMonthCategories = (): {
                    parentCategories: CategoryEntry[],
                    categoryBreakdown: ParentCategoryWithSubcategories[]
                  } => {
                    // Extract parent categories from the categoryHierarchy
                    const rootCategories = Object.values(categoryHierarchy)
                      .filter(cat => !cat.parent_id) // Only root categories
                      .sort((a, b) => a.id - b.id);    // Sort by ID for stability
                    
                    // Create a mapping for parent categories based on actual data
                    const PARENT_CATEGORIES: {[key: string]: {id: number, name: string}} = {};
                    
                    // Find the main category types (income, expenses, savings) from actual data
                    // or create defaults if they don't exist
                    const findCatByName = (name: string): {id: number, name: string, parent_id?: number | null, children?: number[]} | undefined => {
                      return rootCategories.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
                    };
                    
                    const EARNINGS_CAT = findCatByName('earning') || findCatByName('income') || 
                                       { id: 1, name: "Earnings" };
                    const EXPENDITURES_CAT = findCatByName('expenditure') || findCatByName('expense') || 
                                            { id: 2, name: "Expenditures" };
                    const SAVINGS_CAT = findCatByName('saving') || findCatByName('investment') || 
                                       { id: 3, name: "Savings" };
                    
                    // Use the found categories or fallbacks
                    PARENT_CATEGORIES['EARNINGS'] = { 
                      id: EARNINGS_CAT.id, 
                      name: EARNINGS_CAT.name 
                    };
                    PARENT_CATEGORIES['EXPENDITURES'] = { 
                      id: EXPENDITURES_CAT.id, 
                      name: EXPENDITURES_CAT.name 
                    };
                    PARENT_CATEGORIES['SAVINGS'] = { 
                      id: SAVINGS_CAT.id, 
                      name: SAVINGS_CAT.name 
                    };

                    // Initialize mapping structures
                    const categoryNameToId: {[name: string]: number} = {};
                    const categoryIdToName: {[id: number]: string} = {};
                    const categoryParentMap: {[id: number]: number | null} = {};
                    
                    // Pre-populate with parent categories to avoid "Unknown" labels
                    Object.values(PARENT_CATEGORIES).forEach(cat => {
                      categoryIdToName[cat.id] = cat.name;
                    });
    
                    // Map all known categories from database
                    categories.forEach(cat => {
                      if (cat.id) {
                        categoryNameToId[cat.name] = cat.id;
                        categoryIdToName[cat.id] = cat.name;
                        categoryParentMap[cat.id] = cat.parent_id || null;
                      }
                    });

                    // Build dynamic category mappings based on the actual categories
                    const categoryMappings: {[key: string]: number} = {};
                    
                    // Helper function to categorize by name pattern
                    const categorizeByName = (categoryName: string): number => {
                      const lowerName = categoryName.toLowerCase();
                      
                      // Check for keywords that indicate a category type
                      if (lowerName.includes('salary') || lowerName.includes('income') || 
                          lowerName.includes('earnings') || lowerName.includes('revenue')) {
                        return PARENT_CATEGORIES.EARNINGS.id;
                      }
                      
                      if (lowerName.includes('saving') || lowerName.includes('investment') || 
                          lowerName.includes('deposit') || lowerName.includes('etoro') ||
                          lowerName.includes('revolut') || lowerName.includes('trading')) {
                        return PARENT_CATEGORIES.SAVINGS.id;
                      }
                      
                      // Default to expenditures for negative amounts or if we can't determine
                      return PARENT_CATEGORIES.EXPENDITURES.id;
                    };
                    
                    // Map subcategories based on their parent in the hierarchy
                    Object.entries(categoryHierarchy).forEach(([catIdStr, catInfo]) => {
                      const parentId = catInfo.parent_id;
                      if (parentId) {
                        // If it has a parent, map it to that parent's ID
                        categoryMappings[catInfo.name] = parentId;
                      } else {
                        // For root categories, try to map to one of our main parent categories
                        categoryMappings[catInfo.name] = categorizeByName(catInfo.name);
                      }
                    });
                    
                    // Add common category names for better auto-categorization
                    const commonCategoryMappings: {[key: string]: number} = {
                      // Expenditure categories
                      "Grocery": PARENT_CATEGORIES.EXPENDITURES.id,
                      "Utilities": PARENT_CATEGORIES.EXPENDITURES.id,
                      "Entertainment": PARENT_CATEGORIES.EXPENDITURES.id,
                      "School": PARENT_CATEGORIES.EXPENDITURES.id,
                      "Others": PARENT_CATEGORIES.EXPENDITURES.id,
                      "Rent": PARENT_CATEGORIES.EXPENDITURES.id,
                      "Shopping": PARENT_CATEGORIES.EXPENDITURES.id,
                      "Transport": PARENT_CATEGORIES.EXPENDITURES.id,
                      "Food": PARENT_CATEGORIES.EXPENDITURES.id,
                      
                      // Savings categories
                      "Revolut": PARENT_CATEGORIES.SAVINGS.id,
                      "Holiday": PARENT_CATEGORIES.SAVINGS.id,
                      "Recurring Deposits": PARENT_CATEGORIES.SAVINGS.id,
                      "Fixed Deposits": PARENT_CATEGORIES.SAVINGS.id,
                      "eToro": PARENT_CATEGORIES.SAVINGS.id,
                      "Investments": PARENT_CATEGORIES.SAVINGS.id,
                      
                      // Earnings categories
                      "Salary": PARENT_CATEGORIES.EARNINGS.id,
                      "Income": PARENT_CATEGORIES.EARNINGS.id,
                      "Bonus": PARENT_CATEGORIES.EARNINGS.id
                    };
                    
                    // Add common mappings if they don't already exist
                    Object.entries(commonCategoryMappings).forEach(([name, parentId]) => {
                      // Only add if we don't already have this category
                      if (!categoryMappings[name]) {
                        categoryMappings[name] = parentId;
                      }
                    });
                                
                    // Step 2: Group expenses by parent category
                    const parentCategoryTotals: {[parentId: number]: number} = {};
                    // Track uncategorized separately
                    const uncategorizedTotal = {value: 0};
                    const categoryToParentId: {[catId: number]: number} = {};
                    const childCategories: {[parentId: number]: {[childId: number]: number}} = {};
                                
                    // Map of financial terms to descriptive category names for replacing "Unknown" labels
                    const financialTermsMap: {[term: string]: string} = {
                      "transfer": "Transfers",
                      "online": "Online Payments",
                      "card": "Card Payments",
                      "payment": "Regular Payments",
                      "direct debit": "Direct Debits",
                      "standing order": "Standing Orders",
                      "cash": "Cash Withdrawals",
                      "fee": "Bank Fees",
                      "interest": "Interest",
                      "grocery": "Groceries",
                      "food": "Food & Dining",
                      "restaurant": "Restaurants",
                      "uber": "Transport",
                      "transport": "Transportation",
                      "rent": "Housing/Rent",
                      "salary": "Income/Salary",
                      "subscription": "Subscriptions",
                      "utility": "Utilities",
                      "tax": "Taxes",
                      "insurance": "Insurance"
                    };
              
                    // Process all transaction categories and group them appropriately
                    Object.entries(monthData.categories).forEach(([categoryName, amount]) => {
                      const absAmount = Math.abs(amount);
                      
                      // Determine the parent category for this transaction
                      let parentId = -1; // Default to uncategorized
                      
                      // Try to find a mapping for this category name
                      if (categoryMappings[categoryName] !== undefined) {
                        parentId = categoryMappings[categoryName];
                      } else {
                        // Try case-insensitive matching
                        const lowerCategoryName = categoryName.toLowerCase();
                        for (const [knownCategory, mappedParentId] of Object.entries(categoryMappings)) {
                          if (lowerCategoryName.includes(knownCategory.toLowerCase()) || 
                              knownCategory.toLowerCase().includes(lowerCategoryName)) {
                            parentId = mappedParentId;
                            break;
                          }
                        }
                        
                        if (parentId === -1) {
                          // Determine parent by transaction type (credit vs debit)
                          if (amount > 0) {
                            parentId = PARENT_CATEGORIES.EARNINGS.id;
                          } else {
                            // Classify as expenditure if not known
                            parentId = PARENT_CATEGORIES.EXPENDITURES.id;
                          }
                        }
                      }
                      
                      // Create a synthetic category ID for this transaction category if needed
                      let catId = categoryNameToId[categoryName];
                      if (catId === undefined) {
                        // Create a synthetic ID
                        catId = 1000 + Object.keys(categoryNameToId).length;
                        categoryNameToId[categoryName] = catId;
                        
                        // Try to create a more descriptive name if this is "Unknown"
                        if (categoryName === 'Unknown') {
                          let betterName = 'Miscellaneous';
                          // Check transaction description for known terms
                          for (const [term, descriptiveName] of Object.entries(financialTermsMap)) {
                            if (categoryName.toLowerCase().includes(term)) {
                              betterName = descriptiveName;
                              break;
                            }
                          }
                          categoryIdToName[catId] = betterName;
                        } else {
                          categoryIdToName[catId] = categoryName;
                        }
                        
                        categoryParentMap[catId] = parentId;
                      }
                      
                      // Now process the transaction with proper parent/child relationship
                      // Track child -> parent relationship
                      categoryToParentId[catId] = parentId;
                      
                      // Add to child categories for this parent
                      if (!childCategories[parentId]) {
                        childCategories[parentId] = {};
                      }
                      if (!childCategories[parentId][catId]) {
                        childCategories[parentId][catId] = 0;
                      }
                      childCategories[parentId][catId] += absAmount;
                      
                      // Add to parent total
                      if (!parentCategoryTotals[parentId]) {
                        parentCategoryTotals[parentId] = 0;
                      }
                      parentCategoryTotals[parentId] += absAmount;
                    });
                                
                    // Convert to arrays for charts - this creates actual CategoryEntry[] for visualization
                    const chartCategories: CategoryEntry[] = Object.entries(parentCategoryTotals).map(([idStr, value]) => {
                      const id = parseInt(idStr);
                      const name = id === -1 ? 'Uncategorized' : categoryIdToName[id] || 'Miscellaneous';
                      return { id, name, value };
                    }).sort((a, b) => b.value - a.value);
                    
                    // Process subcategories for each parent
                    const breakdown: ParentCategoryWithSubcategories[] = [];
                    
                    Object.entries(childCategories).forEach(([parentIdStr, children]) => {
                      const parentId = parseInt(parentIdStr);
                      const parentName = categoryIdToName[parentId] || 'Miscellaneous';
                      
                      const subcats = Object.entries(children).map(([childIdStr, value]) => {
                        const childId = parseInt(childIdStr);
                        const childName = categoryIdToName[childId] || 'Miscellaneous';
                        return { name: childName, value };
                      }).sort((a, b) => b.value - a.value);
                      
                      if (subcats.length > 0) {
                        breakdown.push({
                          parentId,
                          parentName,
                          total: parentCategoryTotals[parentId] || 0,
                          subcategories: subcats
                        });
                      }
                    });
                    
                    // Add direct expenses (not from subcategories) as "Other" in each parent
                    breakdown.forEach(parent => {
                      const subcatTotal = parent.subcategories.reduce((sum, cat) => sum + cat.value, 0);
                      const directExpenses = parent.total - subcatTotal;
                      
                      if (directExpenses > 0) {
                        parent.subcategories.push({
                          name: 'Direct Expenses',
                          value: directExpenses
                        });
                      }
                    });
                    
                    return {
                      parentCategories: chartCategories,
                      categoryBreakdown: breakdown.sort((a, b) => b.total - a.total)
                    };
                  };
                  
                  const { parentCategories, categoryBreakdown } = processMonthCategories();

                  return (
                    <Box key={monthIndex} sx={{ mb: 8 }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        {monthData.name}
                      </Typography>

                      {/* Monthly summary cards */}
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                          <Card>
                            <CardContent>
                              <Typography variant="body1" color="text.secondary">Income</Typography>
                              <Typography variant="h6" color="success.main">{formatCurrency(monthData.earnings)}</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Card>
                            <CardContent>
                              <Typography variant="body1" color="text.secondary">Expenses</Typography>
                              <Typography variant="h6" color="error.main">{formatCurrency(monthData.expenditures)}</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Card>
                            <CardContent>
                              <Typography variant="body1" color="text.secondary">Savings</Typography>
                              <Typography variant="h6" color="info.main">{formatCurrency(monthData.savings)}</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>

                      {/* Parent Categories Pie Chart */}
                      <Paper sx={{ p: 3, mb: 4 }}>
                        <Typography variant="h6" align="center" gutterBottom>
                          Parent Category Breakdown
                        </Typography>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={7}>
                            {parentCategories.length > 0 ? (
                              <Box sx={{ height: 300, overflowY: 'auto', p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                                <Typography variant="h6" gutterBottom align="center">Visual Breakdown</Typography>
                                {parentCategories.map((category, idx) => (
                                  <Box 
                                    key={`chart-${monthIndex}-${idx}`}
                                    sx={{ 
                                      mb: 2,
                                      p: 1.5,
                                      borderRadius: 1,
                                      bgcolor: 'rgba(0,0,0,0.02)'
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Box 
                                          sx={{ 
                                            width: 16, 
                                            height: 16, 
                                            bgcolor: COLORS[idx % COLORS.length], 
                                            mr: 1,
                                            borderRadius: 1 
                                          }} 
                                        />
                                        <Typography variant="subtitle1"><b>{category.name}</b></Typography>
                                      </Box>
                                      <Typography variant="subtitle1" fontWeight="bold">
                                        {formatCurrency(category.value || 0)}
                                      </Typography>
                                    </Box>
                                    
                                    <Box 
                                      sx={{ 
                                        width: '100%', 
                                        height: 10, 
                                        bgcolor: 'rgba(0,0,0,0.05)',
                                        borderRadius: 5,
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <Box 
                                        sx={{ 
                                          width: `${(category.value / parentCategories.reduce((sum, c) => sum + (c.value || 0), 0) * 100).toFixed(0)}%`, 
                                          height: '100%',
                                          bgcolor: COLORS[idx % COLORS.length],
                                          transition: 'width 1s ease-in-out'
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                  No expense data available
                                </Typography>
                              </Box>
                            )}
                          </Grid>
                          <Grid item xs={12} md={5}>
                            <Typography variant="subtitle1" gutterBottom>Parent Categories</Typography>
                            <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
                              {parentCategories.map((cat, idx) => (
                                <Box 
                                  key={`legend-${monthIndex}-${idx}`} 
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    mb: 1,
                                    p: 0.5,
                                    borderRadius: 1,
                                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box 
                                      sx={{ 
                                        width: 16, 
                                        height: 16, 
                                        bgcolor: COLORS[idx % COLORS.length], 
                                        mr: 1,
                                        borderRadius: 1 
                                      }} 
                                    />
                                    <Typography variant="body2">{cat.name}</Typography>
                                  </Box>
                                  <Typography variant="body2" fontWeight="bold">
                                    {formatCurrency(cat.value)}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>

                      {/* Subcategory Bar Charts */}
                      {categoryBreakdown.length > 0 && (
                        <Box>
                          <Typography variant="h6" sx={{ mt: 4, mb: 3 }}>
                            Subcategory Breakdowns
                          </Typography>
                          
                          <Grid container spacing={3}>
                            {categoryBreakdown.slice(0, 6).map((parentData, parentIdx) => (
                              <Grid item xs={12} md={6} key={`parent-${monthIndex}-${parentIdx}`}>
                                <Paper sx={{ p: 2, height: '100%' }}>
                                  <Typography 
                                    variant="subtitle1" 
                                    align="center" 
                                    gutterBottom
                                    sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center' 
                                    }}
                                  >
                                    <Box 
                                      sx={{ 
                                        width: 12, 
                                        height: 12, 
                                        bgcolor: COLORS[parentIdx % COLORS.length], 
                                        mr: 1,
                                        display: 'inline-block',
                                        borderRadius: 1 
                                      }} 
                                    />
                                    {parentData.parentName} ({formatCurrency(parentData.total)})
                                  </Typography>
                                  
                                  <Box sx={{ width: '100%', height: 200 }}>
                                    <BarChart
                                      options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        indexAxis: 'y',
                                        scales: {
                                          x: {
                                            beginAtZero: true,
                                            ticks: {
                                              callback: (value) => formatCurrency(Number(value))
                                            }
                                          },
                                          y: {
                                            ticks: {
                                              font: {
                                                size: 12
                                              }
                                            }
                                          }
                                        },
                                        plugins: {
                                          tooltip: {
                                            callbacks: {
                                              label: function(context) {
                                                return `Amount: ${formatCurrency(context.raw as number)}`;
                                              }
                                            }
                                          }
                                        }
                                      }}
                                      data={{
                                        labels: parentData.subcategories.sort((a, b) => b.value - a.value).map(cat => cat.name),
                                        datasets: [
                                          {
                                            label: 'Amount',
                                            data: parentData.subcategories.sort((a, b) => b.value - a.value).map(cat => cat.value),
                                            backgroundColor: COLORS[parentIdx % COLORS.length],
                                            barPercentage: 0.8,
                                          }
                                        ]
                                      }}
                                    />
                                  </Box>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )}
                    </Box>
                  );
                })
              )}
            </>
          )}
          
          {selectedView === 'trend' && (
            <>
              <Typography variant="h6" gutterBottom>Spending Trend ({selectedYear})</Typography>
              <Box sx={{ height: '100%', width: '100%' }}>
                <LineChart
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45
                        }
                      },
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => formatCurrency(Number(value))
                        }
                      }
                    },
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw as number)}`;
                          }
                        }
                      }
                    }
                  }}
                  data={{
                    labels: filteredData.map(item => item.name),
                    datasets: [
                      {
                        label: 'Balance',
                        data: filteredData.map(item => item.balance),
                        borderColor: '#8884d8',
                        backgroundColor: 'rgba(136, 132, 216, 0.3)',
                        fill: true,
                        tension: 0.1,
                      },
                      {
                        label: 'Income',
                        data: filteredData.map(item => item.earnings),
                        borderColor: '#82ca9d',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.1,
                      },
                      {
                        label: 'Expenses',
                        data: filteredData.map(item => item.expenditures),
                        borderColor: '#ff7300',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.1,
                      },
                      {
                        label: 'Savings',
                        data: filteredData.map(item => item.savings),
                        borderColor: '#00C49F',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.1,
                      },
                    ]
                  }}
                />
              </Box>
            </>
          )}
          
          {selectedView === 'savings' && (
            <>
              <Typography variant="h6" gutterBottom>Savings Analysis ({selectedYear})</Typography>
              <Grid container>
                <Grid item xs={12} md={6}>
                  <Box sx={{ height: 400, width: '100%' }}>
                            <PieChart
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  tooltip: {
                                    callbacks: {
                                      label: function(context) {
                                        const dataLabel = context.label;
                                        const value = context.raw as number;
                                        const percentage = ((value / totalExpenditures) * 100).toFixed(1);
                                        return `${dataLabel}: ${formatCurrency(value)} (${percentage}%)`;
                                      }
                                    }
                                  },
                                  legend: {
                                    position: 'bottom',
                                    labels: {
                                      boxWidth: 15,
                                      padding: 10
                                    }
                                  }
                                }
                              }}
                      data={{
                        labels: ['Expenses', 'Savings', 'Remaining Income'],
                        datasets: [
                          {
                            data: [
                              totalExpenditures,
                              totalSavings,
                              Math.max(0, totalEarnings - totalExpenditures - totalSavings)
                            ],
                            backgroundColor: [
                              '#ff8042', 
                              '#00C49F', 
                              '#82ca9d'
                            ],
                            hoverOffset: 4
                          }
                        ]
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mt: 3, p: 2 }}>
                    <Typography variant="h6" gutterBottom>Savings Overview</Typography>
                    <Typography variant="body1" paragraph>
                      Total Income: {formatCurrency(totalEarnings)}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      Total Expenses: {formatCurrency(totalExpenditures)} 
                      ({((totalExpenditures / totalEarnings) * 100).toFixed(1)}% of income)
                    </Typography>
                    <Typography variant="body1" paragraph>
                      Total Savings: {formatCurrency(totalSavings)} 
                      ({((totalSavings / totalEarnings) * 100).toFixed(1)}% of income)
                    </Typography>
                    <Typography variant="body1" paragraph>
                      Remaining/Unallocated: {formatCurrency(Math.max(0, totalEarnings - totalExpenditures - totalSavings))}
                      ({((Math.max(0, totalEarnings - totalExpenditures - totalSavings) / totalEarnings) * 100).toFixed(1)}% of income)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      * Savings represents money deliberately set aside or invested, not simply unspent income.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default GroupedTransactions;

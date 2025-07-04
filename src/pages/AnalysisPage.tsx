import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Divider,
  Box,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import ParentCategoryLineChart from '../components/charts/ParentCategoryLineChart';
import CategoryBarChart from '../components/charts/CategoryBarChart';
import { CategoryService, ParentCategory } from '../services/categoryApi';

const AnalysisPage: React.FC = () => {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1); // 1-based month
  const [selectedParentCategory, setSelectedParentCategory] = useState<number | null>(null);
  const [parentCategoryName, setParentCategoryName] = useState<string>('');
  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Get the current year and generate years list (current year and 4 previous)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    const fetchParentCategories = async () => {
      setLoading(true);
      try {
        const categories = await CategoryService.getAllParentCategories();
        setParentCategories(categories);
        // If there are categories and no selection yet, select the first one
        if (categories.length > 0 && !selectedParentCategory) {
          setSelectedParentCategory(categories[0].id!);
          setParentCategoryName(categories[0].name);
        }
      } catch (error) {
        console.error('Error fetching parent categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParentCategories();
  }, []);

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setYear(event.target.value as number);
  };

  const handleMonthChange = (event: SelectChangeEvent<number>) => {
    setMonth(event.target.value as number);
  };

  const handleParentCategoryChange = (event: SelectChangeEvent<number>) => {
    const categoryId = event.target.value as number;
    setSelectedParentCategory(categoryId);
    
    // Find the category name
    const category = parentCategories.find(cat => cat.id === categoryId);
    if (category) {
      setParentCategoryName(category.name);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Spending Analysis
      </Typography>
      
      {/* Year selector for line chart */}
      <Paper sx={{ p: 3, mb: 4, overflow: 'visible' }}>
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={3} 
          alignItems={{ xs: 'stretch', md: 'center' }} 
          sx={{ mb: 2 }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Monthly Spending by Category</Typography>
          </Box>
          <Box sx={{ minWidth: 120 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="monthly-year-select-label">Year</InputLabel>
              <Select
                labelId="monthly-year-select-label"
                id="monthly-year-select"
                value={year}
                label="Year"
                onChange={handleYearChange}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
        
        {/* Parent category spending line chart */}
        <Card variant="outlined" sx={{ mb: 2, overflow: 'visible' }}>
          <CardContent sx={{ overflow: 'visible' }}>
            <ParentCategoryLineChart year={year} />
          </CardContent>
        </Card>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          This chart shows the total spending for each parent category over the months of the selected year.
        </Typography>
      </Paper>
      
      <Divider sx={{ my: 4 }} />
      
      {/* Category breakdown section */}
      <Paper sx={{ p: 3, overflow: 'visible' }}>
        <Typography variant="h6" gutterBottom>
          Category Breakdown
        </Typography>
        
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 3 }}>
          {/* Month selector */}
          <Box sx={{ minWidth: 200 }}>
            <FormControl fullWidth>
              <InputLabel id="month-select-label">Month</InputLabel>
              <Select
                labelId="month-select-label"
                id="month-select"
                value={month}
                label="Month"
                onChange={handleMonthChange}
              >
                {monthNames.map((name, index) => (
                  <MenuItem key={index} value={index + 1}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          {/* Parent category selector */}
          <Box sx={{ flexGrow: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="parent-category-select-label">Parent Category</InputLabel>
              <Select
                labelId="parent-category-select-label"
                id="parent-category-select"
                value={selectedParentCategory || ''}
                label="Parent Category"
                onChange={handleParentCategoryChange}
                displayEmpty={!selectedParentCategory}
              >
                {parentCategories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
        
        {/* Category spending bar chart */}
        <Card variant="outlined" sx={{ overflow: 'visible' }}>
          <CardContent sx={{ overflow: 'visible' }}>
            {selectedParentCategory ? (
              <CategoryBarChart 
                parentId={selectedParentCategory} 
                month={month} 
                year={year}
                parentName={parentCategoryName}
              />
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Please select a parent category to view detailed spending.</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          This chart breaks down spending within the selected parent category for the chosen month and year.
        </Typography>
      </Paper>
      
      <Divider sx={{ my: 4 }} />
      
      {/* Daily spending chart section */}
      <Paper sx={{ p: 3, overflow: 'visible' }}>
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={3} 
          alignItems={{ xs: 'stretch', md: 'center' }} 
          sx={{ mb: 2 }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Daily Spending Analysis</Typography>
          </Box>
          <Box sx={{ minWidth: 200 }}>
            <FormControl fullWidth>
              <InputLabel id="daily-chart-month-select-label">Month</InputLabel>
              <Select
                labelId="daily-chart-month-select-label"
                id="daily-chart-month-select"
                value={month} 
                label="Month"
                onChange={handleMonthChange}
              >
                {monthNames.map((name, index) => (
                  <MenuItem key={index} value={index + 1}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ minWidth: 120 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="year-select-label">Year</InputLabel>
              <Select
                labelId="year-select-label"
                id="year-select"
                value={year}
                label="Year"
                onChange={handleYearChange}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
        
        <Card variant="outlined" sx={{ overflow: 'visible' }}>
          <CardContent sx={{ overflow: 'visible' }}>
            {/* Only render the daily chart part */}
            <Box sx={{ height: 400, p: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This chart shows the daily spending for each parent category in {monthNames[month - 1]} {year}.
              </Typography>
              <ParentCategoryLineChart year={year} selectedMonth={month} showOnlyDailyChart={true} />
            </Box>
          </CardContent>
        </Card>
      </Paper>
    </Container>
  );
};

export default AnalysisPage;

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
import CumulativeParentCategoryLineChart from '../components/charts/CumulativeParentCategoryLineChart';

const CumulativePage: React.FC = () => {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1); // 1-based month

  // Get the current year and generate years list (current year and 4 previous)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setYear(event.target.value as number);
  };

  const handleMonthChange = (event: SelectChangeEvent<number>) => {
    setMonth(event.target.value as number);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 12 }}>
      <Typography variant="h4" gutterBottom>
        Cumulative Spending Analysis
      </Typography>
      
      {/* Year selector for line chart */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={3} 
          alignItems={{ xs: 'stretch', md: 'center' }} 
          sx={{ mb: 2 }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Cumulative Monthly Spending by Category</Typography>
          </Box>
          <Box sx={{ minWidth: 120 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="cumulative-monthly-year-select-label">Year</InputLabel>
              <Select
                labelId="cumulative-monthly-year-select-label"
                id="cumulative-monthly-year-select"
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
        
        {/* Parent category spending line chart - cumulative */}
        <Card variant="outlined" sx={{ mb: 2, overflow: 'visible' }}>
          <CardContent sx={{ overflow: 'visible' }}>
            <CumulativeParentCategoryLineChart year={year} />
          </CardContent>
        </Card>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          This chart shows the cumulative spending for each parent category over the months of the selected year. 
          Each month adds to the previous total, creating a running total view of your expenses.
        </Typography>
      </Paper>
      
      <Divider sx={{ my: 4 }} />
      
      {/* Daily spending chart section */}
      <Paper sx={{ p: 3, pb: 10 }}>
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={3} 
          alignItems={{ xs: 'stretch', md: 'center' }} 
          sx={{ mb: 2 }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Cumulative Daily Spending Analysis</Typography>
          </Box>
          <Box sx={{ minWidth: 200 }}>
            <FormControl fullWidth>
              <InputLabel id="cumulative-daily-chart-month-select-label">Month</InputLabel>
              <Select
                labelId="cumulative-daily-chart-month-select-label"
                id="cumulative-daily-chart-month-select"
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
              <InputLabel id="cumulative-year-select-label">Year</InputLabel>
              <Select
                labelId="cumulative-year-select-label"
                id="cumulative-year-select"
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
            {/* Only render the daily chart part - cumulative */}
            <Box sx={{ height: 400, p: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This chart shows the cumulative daily spending for each parent category in {monthNames[month - 1]} {year}.
                Each day adds to the previous total, showing how your spending accumulates throughout the month.
              </Typography>
              <CumulativeParentCategoryLineChart year={year} selectedMonth={month} showOnlyDailyChart={true} />
            </Box>
          </CardContent>
        </Card>
      </Paper>
    </Container>
  );
};

export default CumulativePage;

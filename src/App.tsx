import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar, Typography, Container, Tabs, Tab } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TransactionsPage from './pages/TransactionsPage';
import GroupedTransactionsPage from './pages/GroupedTransactionsPage';
import SettingsPage from './pages/SettingsPage';

// Create a theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

// Navigation tabs component
const NavigationTabs = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  return (
    <Tabs 
      value={currentPath} 
      indicatorColor="secondary" 
      textColor="inherit"
      sx={{ 
        '& .MuiTab-root': { 
          color: 'white',
          opacity: 0.7 
        },
        '& .Mui-selected': { 
          color: 'white',
          opacity: 1 
        }
      }}
    >
      <Tab label="All Transactions" value="/" component={Link} to="/" />
      <Tab label="Grouped View" value="/grouped" component={Link} to="/grouped" />
      <Tab label="Settings" value="/settings" component={Link} to="/settings" />
    </Tabs>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AppBar position="static">
            <Toolbar>
              <AccountBalanceIcon sx={{ mr: 2 }} />
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Finance Tracker
              </Typography>
            </Toolbar>
            <Box sx={{ px: 2, pb: 1 }}>
              <NavigationTabs />
            </Box>
          </AppBar>
          
          <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
            <Routes>
              <Route path="/" element={<TransactionsPage />} />
              <Route path="/grouped" element={<GroupedTransactionsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Box>
          
          <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: (theme) => theme.palette.grey[200] }}>
            <Container maxWidth="sm">
              <Typography variant="body2" color="text.secondary" align="center">
                {'Finance Tracker © '}
                {new Date().getFullYear()}
              </Typography>
            </Container>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;

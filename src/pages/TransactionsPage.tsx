import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Stack, 
  Button, 
  Divider,
  Snackbar,
  Alert,
  CircularProgress 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import TransactionList from '../components/TransactionList';
import ImportCSV from '../components/ImportCSV';
import { TransactionService } from '../services/api';
import { Transaction } from '../types/Transaction';

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizeResult, setCategorizeResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await TransactionService.getAllTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleImportComplete = () => {
    loadTransactions();
    setShowImport(false);
  };

  // Function to auto-categorize uncategorized transactions
  const handleAutoCategorize = async () => {
    setIsCategorizing(true);
    setCategorizeResult(null);
    
    try {
      const result = await TransactionService.autoCategorizeTransactions();
      setCategorizeResult({
        success: true,
        message: `Successfully categorized ${result.categorized} transactions.`
      });
      
      // Reload the transactions to see the updated categories
      await loadTransactions();
    } catch (error) {
      console.error('Error during auto-categorization:', error);
      setCategorizeResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to auto-categorize transactions'
      });
    } finally {
      setIsCategorizing(false);
    }
  };

  // Function to close the result message
  const handleCloseMessage = () => {
    setCategorizeResult(null);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" component="h1">
            Transactions
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="success"
              startIcon={isCategorizing ? <CircularProgress size={20} color="inherit" /> : <AutoFixHighIcon />}
              onClick={handleAutoCategorize}
              disabled={isCategorizing}
            >
              Auto-categorize
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowImport(prev => !prev)}
            >
              {showImport ? 'Hide Import' : 'Import Transactions'}
            </Button>
          </Stack>
        </Stack>

        {showImport && (
          <Box sx={{ mb: 3 }}>
            <ImportCSV onImportComplete={handleImportComplete} />
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <TransactionList 
            transactions={transactions} 
            isLoading={isLoading} 
            onUpdate={loadTransactions} // Pass the loadTransactions function to refresh data
          />
        </Box>
      </Paper>

      {/* Summary statistics could go here */}
      <Paper sx={{ p: 3 }}>
        {/* Show success or error message for categorization */}
        <Snackbar 
          open={categorizeResult !== null} 
          autoHideDuration={6000} 
          onClose={handleCloseMessage}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseMessage} 
            severity={categorizeResult?.success ? "success" : "error"}
            sx={{ width: '100%' }}
          >
            {categorizeResult?.message}
          </Alert>
        </Snackbar>
        <Typography variant="h6" component="h2" gutterBottom>
          Summary
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} divider={<Divider orientation="vertical" flexItem />}>
          <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total Transactions
            </Typography>
            <Typography variant="h4">
              {transactions.length}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total Debits
            </Typography>
            <Typography variant="h4" color="error.main">
              €{transactions
                .filter(t => t.debitAmount)
                .reduce((sum, t) => sum + parseFloat(t.debitAmount!.replace(/,/g, '')), 0)
                .toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total Credits
            </Typography>
            <Typography variant="h4" color="success.main">
              €{transactions
                .filter(t => t.creditAmount)
                .reduce((sum, t) => sum + parseFloat(t.creditAmount!.replace(/,/g, '')), 0)
                .toFixed(2)}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
};

export default TransactionsPage;

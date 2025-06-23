import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Stack, Button, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TransactionList from '../components/TransactionList';
import ImportCSV from '../components/ImportCSV';
import { TransactionService } from '../services/api';
import { Transaction } from '../types/Transaction';

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" component="h1">
            Transactions
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowImport(prev => !prev)}
          >
            {showImport ? 'Hide Import' : 'Import Transactions'}
          </Button>
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
          />
        </Box>
      </Paper>

      {/* Summary statistics could go here */}
      <Paper sx={{ p: 3 }}>
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

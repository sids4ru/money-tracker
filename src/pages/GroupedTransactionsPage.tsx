import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Stack } from '@mui/material';
import GroupedTransactions from '../components/GroupedTransactions';
import { TransactionService } from '../services/api';
import { Transaction } from '../types/Transaction';

const GroupedTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" component="h1">
            Transactions Analysis
          </Typography>
        </Stack>

        <Box sx={{ mt: 2 }}>
          <GroupedTransactions 
            transactions={transactions} 
            isLoading={isLoading} 
          />
        </Box>
      </Paper>
    </Container>
  );
};

export default GroupedTransactionsPage;

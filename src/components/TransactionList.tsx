import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  Typography,
  LinearProgress,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Transaction } from '../types/Transaction';

type Order = 'asc' | 'desc';

interface TableColumn {
  id: keyof Transaction | 'amount';
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
}

const columns: TableColumn[] = [
  { id: 'date', label: 'Date', minWidth: 100 },
  { id: 'description', label: 'Description', minWidth: 170 },
  { 
    id: 'amount', 
    label: 'Amount', 
    minWidth: 120, 
    align: 'right',
    format: (row: Transaction) => {
      const amount = row.debitAmount 
        ? `-${row.debitAmount}` 
        : (row.creditAmount || '0');
      return `€${amount}`;
    }
  },
  { 
    id: 'balance', 
    label: 'Balance', 
    minWidth: 120, 
    align: 'right',
    format: (value: string) => `€${value}`
  },
  { 
    id: 'transactionType', 
    label: 'Type', 
    minWidth: 100 
  }
];

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, isLoading }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof Transaction | 'amount'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    // Filter transactions based on search query
    const filtered = transactions.filter(transaction => {
      const searchLower = searchQuery.toLowerCase();
      if (searchQuery === '') return true;
      
      return (
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.date.toLowerCase().includes(searchLower) ||
        transaction.transactionType.toLowerCase().includes(searchLower) ||
        (transaction.debitAmount && transaction.debitAmount.includes(searchQuery)) ||
        (transaction.creditAmount && transaction.creditAmount.includes(searchQuery))
      );
    });

    // Sort the filtered transactions
    const sorted = [...filtered].sort((a, b) => {
      let comparison: number = 0;
      
      if (orderBy === 'amount') {
        const aAmount = parseFloat(a.debitAmount || '0') || parseFloat(a.creditAmount || '0');
        const bAmount = parseFloat(b.debitAmount || '0') || parseFloat(b.creditAmount || '0');
        comparison = aAmount - bAmount;
      } else if (orderBy === 'date') {
        // Format date from dd/mm/yyyy to yyyy-mm-dd for proper comparison
        const aParts = a.date.split('/');
        const bParts = b.date.split('/');
        const aDate = new Date(`${aParts[2]}-${aParts[1]}-${aParts[0]}`);
        const bDate = new Date(`${bParts[2]}-${bParts[1]}-${bParts[0]}`);
        comparison = aDate.getTime() - bDate.getTime();
      } else if (orderBy === 'balance') {
        // Parse balance to number, removing currency symbol and commas
        const aBalance = parseFloat(a.balance?.replace(/,/g, '') || '0');
        const bBalance = parseFloat(b.balance?.replace(/,/g, '') || '0');
        comparison = aBalance - bBalance;
      } else {
        const aValue = String(a[orderBy] || '').toLowerCase();
        const bValue = String(b[orderBy] || '').toLowerCase();
        comparison = aValue.localeCompare(bValue);
      }
      
      return order === 'desc' ? -comparison : comparison;
    });

    setFilteredTransactions(sorted);
  }, [transactions, searchQuery, order, orderBy]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleRequestSort = (property: keyof Transaction | 'amount') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const getTransactionAmount = (transaction: Transaction) => {
    if (transaction.debitAmount) {
      return -parseFloat(transaction.debitAmount.replace(/,/g, '') || '0');
    } else if (transaction.creditAmount) {
      return parseFloat(transaction.creditAmount.replace(/,/g, '') || '0');
    }
    return 0;
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {isLoading ? (
        <LinearProgress />
      ) : filteredTransactions.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {transactions.length === 0 
              ? 'No transactions found. Import a CSV file to see your transactions.' 
              : 'No transactions match your search criteria.'}
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
            <Table stickyHeader aria-label="transactions table">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      style={{ minWidth: column.minWidth }}
                      sortDirection={orderBy === column.id ? order : false}
                    >
                      <TableSortLabel
                        active={orderBy === column.id}
                        direction={orderBy === column.id ? order : 'asc'}
                        onClick={() => handleRequestSort(column.id)}
                      >
                        {column.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((transaction, index) => {
                    const amount = getTransactionAmount(transaction);
                    
                    return (
                      <TableRow hover tabIndex={-1} key={transaction.id || index}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell align="right" sx={{ 
                          color: amount < 0 ? 'error.main' : (amount > 0 ? 'success.main' : 'inherit') 
                        }}>
                          {amount < 0
                            ? `-€${Math.abs(amount).toFixed(2)}`
                            : `€${amount.toFixed(2)}`
                          }
                        </TableCell>
                        <TableCell align="right">€{parseFloat(transaction.balance?.replace(/,/g, '') || '0').toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={transaction.transactionType} 
                            size="small"
                            color={transaction.transactionType === 'Credit' ? 'success' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredTransactions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Paper>
  );
};

export default TransactionList;

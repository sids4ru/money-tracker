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
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CategoryIcon from '@mui/icons-material/Category';
import DeleteIcon from '@mui/icons-material/Delete';
import { Transaction, CategoryInfo } from '../types/Transaction';
import CategoryAssignmentDialog from './CategoryAssignmentDialog';
import { CategoryService } from '../services/categoryApi';
import { TransactionService } from '../services/api';

type Order = 'asc' | 'desc';

interface TableColumn {
  id: keyof Transaction | 'amount' | 'actions' | 'category';
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
    minWidth: 80
  },
  {
    id: 'category', 
    label: 'Category', 
    minWidth: 150 
  },
  {
    id: 'actions',
    label: 'Actions',
    minWidth: 120,
    align: 'center'
  }
];

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  onUpdate?: () => void; // Add callback for updates
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, isLoading, onUpdate }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof Transaction | 'amount' | 'category'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionCategories, setTransactionCategories] = useState<{[key: string]: string[]}>({});
  const [categoryCache, setCategoryCache] = useState<{[key: string]: CategoryInfo}>({});

  // Load transaction categories
  useEffect(() => {
    const fetchCategories = async () => {
      const categoriesMap: {[key: string]: string[]} = {};
      
      // Process transactions in batches to avoid too many concurrent requests
      for (let i = 0; i < transactions.length; i += 10) {
        const batch = transactions.slice(i, i + 10);
        await Promise.all(batch.map(async (transaction) => {
          if (transaction.id) {
              try {
                // Debug - check if this is the problematic transaction
                const isSavingsTransaction = transaction.description && 
                  (transaction.description.includes("SAVING") || transaction.description1?.includes("SAVING"));
                
                // Get categories for this transaction from transaction_categories table
                const cats = await CategoryService.getCategoriesForTransaction(transaction.id);
                
                // Debug log for saving transactions
                if (isSavingsTransaction) {
                  console.log(`SAVING Transaction ${transaction.id}:`, transaction.description1 || transaction.description);
                  console.log(`Categories found:`, cats);
                  console.log(`Transaction groupingStatus:`, transaction.groupingStatus);
                  console.log(`Transaction categoryId:`, transaction.categoryId);
                }
                
                if (cats && cats.length > 0) {
                  // Store category info in cache for later use
                  cats.forEach(cat => {
                    if (cat.id) {
                      setCategoryCache(prev => ({
                        ...prev,
                        [cat.id]: cat
                      }));
                    }
                  });

                  // Store the category names
                  categoriesMap[transaction.id] = cats.map(cat => {
                    // If there's a parent name, display it as "Parent > Category"
                    if (cat.parentName) {
                      return `${cat.parentName} > ${cat.name}`;
                    }
                    return cat.name;
                  });
                } 
                // If a transaction has categoryId or groupingStatus but no categories were found
                else if (transaction.categoryId || transaction.groupingStatus === 'manual' || 
                         transaction.groupingStatus === 'auto') {
                  console.log(`WARNING: Transaction ${transaction.id} has categoryId/groupingStatus but no categories found!`);
                  
                  // For transactions that have a groupingStatus or categoryId but no categories returned,
                  // try to manually add a placeholder category based on description
                  if (isSavingsTransaction) {
                    console.log(`Creating placeholder category for saving transaction: ${transaction.id}`);
                    categoriesMap[transaction.id] = ["saving -> recurring deposit"];
                  }
                }
            } catch (error) {
              console.error(`Failed to fetch category for transaction ${transaction.id}:`, error);
            }
          }
        }));
      }
      
      setTransactionCategories(categoriesMap);
    };
    
    fetchCategories();
  }, [transactions]);

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
      } else if (orderBy === 'category') {
        const aCategories = a.id && transactionCategories[a.id] ? transactionCategories[a.id].join(', ') : '';
        const bCategories = b.id && transactionCategories[b.id] ? transactionCategories[b.id].join(', ') : '';
        comparison = aCategories.localeCompare(bCategories);
      } else {
        const aValue = String(a[orderBy] || '').toLowerCase();
        const bValue = String(b[orderBy] || '').toLowerCase();
        comparison = aValue.localeCompare(bValue);
      }
      
      return order === 'desc' ? -comparison : comparison;
    });

    setFilteredTransactions(sorted);
  }, [transactions, searchQuery, order, orderBy, transactionCategories]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleRequestSort = (property: keyof Transaction | 'amount' | 'actions' | 'category') => {
    if (property === 'actions') return; // We don't sort by actions column
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

  const handleOpenCategoryDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setCategoryDialogOpen(true);
  };
  
  const handleCloseCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setSelectedTransaction(null);
  };
  
  const handleOpenDeleteDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedTransaction(null);
  };
  
  const handleDeleteTransaction = async () => {
    if (!selectedTransaction || !selectedTransaction.id) return;
    
    try {
      await TransactionService.deleteTransaction(selectedTransaction.id);
      
      // Close the dialog
      setDeleteDialogOpen(false);
      setSelectedTransaction(null);
      
      // Trigger data refresh
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };
  
  const handleAssignCategory = async (transactionId: number, categoryId: number, applyToSimilar: boolean) => {
    try {
      console.log(`Assigning category ${categoryId} to transaction ${transactionId} (applyToSimilar: ${applyToSimilar})`);
      
      // First update the local UI immediately for better user feedback
      const category = await CategoryService.getCategory(categoryId);
      if (category) {
        console.log(`Got category details: ${JSON.stringify(category)}`);
        
        // Get the parent category name if available
        let displayName = category.name;
        if (category.parent_id) {
          try {
            const parentCategory = await CategoryService.getParentCategory(category.parent_id);
            if (parentCategory) {
              displayName = `${parentCategory.name} > ${category.name}`;
            }
          } catch (err) {
            console.error('Error getting parent category:', err);
          }
        }
        
        setTransactionCategories(prev => ({
          ...prev,
          [transactionId]: [displayName]
        }));
      }
      
      // Then send the update to the server
      const result = await CategoryService.assignTransactionToCategory(transactionId, categoryId, applyToSimilar);
      console.log(`Assignment result: ${JSON.stringify(result)}`);
      
      // Perform a full data refresh to ensure everything is updated
      if (onUpdate) {
        console.log('Triggering full data refresh after manual category update');
        onUpdate();
      } else {
        console.log('No onUpdate callback provided, refreshing categories manually');
        // If no onUpdate callback is provided, force-refresh categories for this transaction
        const updatedCats = await CategoryService.getCategoriesForTransaction(transactionId);
        console.log(`Got updated categories: ${JSON.stringify(updatedCats)}`);
        if (updatedCats && updatedCats.length > 0) {
          // Update cache with new categories
          updatedCats.forEach(cat => {
            setCategoryCache(prev => ({
              ...prev,
              [cat.id]: cat
            }));
          });
          
          const catNames = updatedCats.map(cat => {
            // If there's a parent name, display it as "Parent > Category"
            if (cat.parentName) {
              return `${cat.parentName} > ${cat.name}`;
            }
            return cat.name;
          });
          
          setTransactionCategories(prev => ({
            ...prev,
            [transactionId]: catNames
          }));
        } else {
          console.log('Warning: No categories returned after assignment');
        }
      }
    } catch (error) {
      console.error('Error assigning category:', error);
      // Revert the optimistic UI update on error
      if (onUpdate) {
        onUpdate();
      }
    }
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
          <TableContainer>
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
                    const categoryNames = transaction.id && transactionCategories[transaction.id] 
                      ? transactionCategories[transaction.id] 
                      : [];
                    
                    // Remove background color based on grouping status since it's not working properly
                    return (
                      <TableRow 
                        hover 
                        tabIndex={-1} 
                        key={transaction.id || index}
                      >
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
                        <TableCell>
                          {categoryNames.length > 0 ? (
                            categoryNames.map((name, i) => (
                              <Chip 
                                key={i}
                                size="small"
                                label={name}
                                sx={{ mr: 0.5, mb: 0.5 }}
                                color="primary"
                                variant="outlined"
                              />
                            ))
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Not categorized
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <Tooltip title="Assign to Category">
                              <IconButton 
                                size="small" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCategoryDialog(transaction);
                                }}
                                color="primary"
                                sx={{ mx: 0.5 }}
                              >
                                <CategoryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Delete Transaction">
                              <IconButton 
                                size="small" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeleteDialog(transaction);
                                }}
                                color="error"
                                sx={{ mx: 0.5 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
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
      
      <CategoryAssignmentDialog
        open={categoryDialogOpen}
        transaction={selectedTransaction}
        onClose={handleCloseCategoryDialog}
        onAssign={handleAssignCategory}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Delete Transaction
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this transaction? This action will remove the transaction 
            and all of its category assignments. This action cannot be undone.
          </DialogContentText>
          {selectedTransaction && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Transaction Details:</Typography>
              <Typography variant="body2">Date: {selectedTransaction.date}</Typography>
              <Typography variant="body2">Description: {selectedTransaction.description}</Typography>
              <Typography variant="body2" sx={{ 
                color: getTransactionAmount(selectedTransaction) < 0 ? 'error.main' : 'success.main'
              }}>
                Amount: {getTransactionAmount(selectedTransaction) < 0
                  ? `-€${Math.abs(getTransactionAmount(selectedTransaction)).toFixed(2)}`
                  : `€${getTransactionAmount(selectedTransaction).toFixed(2)}`
                }
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteTransaction} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TransactionList;

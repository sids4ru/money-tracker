import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Transaction } from '../types/Transaction';
import { categories, getCategoryById } from '../utils/transactionCategories';

interface GroupedTransactionsProps {
  transactions: Transaction[];
  isLoading: boolean;
}

interface CategoryGroup {
  categoryId: string;
  transactions: Transaction[];
  totalAmount: number;
  subCategories?: { [key: string]: CategoryGroup };
}

const GroupedTransactions: React.FC<GroupedTransactionsProps> = ({ transactions, isLoading }) => {
  // Group transactions by main categories (earnings, expenditures, savings)
  const getGroupedTransactions = () => {
    const groupedData: { [key: string]: CategoryGroup } = {};
    
    // Initialize main categories
    ['earnings', 'expenditures', 'savings'].forEach(catId => {
      groupedData[catId] = {
        categoryId: catId,
        transactions: [],
        totalAmount: 0,
        subCategories: {}
      };
    });
    
    // Process all transactions
    transactions.forEach(transaction => {
      // Determine transaction amount
      const amount = transaction.debitAmount 
        ? -parseFloat(transaction.debitAmount.replace(/,/g, ''))
        : (transaction.creditAmount ? parseFloat(transaction.creditAmount.replace(/,/g, '')) : 0);
      
      // Simple categorization based on credit vs debit
      let mainCategoryId = 'expenditures';
      let subCategoryId = 'expenditure_other';
      
      if (amount > 0) { // Credit/incoming money
        mainCategoryId = 'earnings';
        subCategoryId = 'earnings';
      } else { // Debit/outgoing money
        // Check for specific categories based on description
        const desc = [
          transaction.description,
          transaction.description1, 
          transaction.description2, 
          transaction.description3
        ].filter(Boolean).join(' ');
        
        // Check for grocery stores
        if (/tesco|aldi|lidl|supermarket|grocery/i.test(desc)) {
          subCategoryId = 'grocery';
        }
        // Check for entertainment
        else if (/restaurant|cinema|theater|pub|bar/i.test(desc)) {
          subCategoryId = 'entertainment';
        }
        // Check for travel
        else if (/ticket|flight|train|bus|taxi|uber|hotel/i.test(desc)) {
          subCategoryId = 'travel';
        }
        // Check for savings
        else if (/saving|deposit|investment/i.test(desc)) {
          mainCategoryId = 'savings';
          subCategoryId = 'savings_other';
          
          // Check for specific savings types
          if (/fixed deposit|fd|term deposit/i.test(desc)) {
            subCategoryId = 'fd';
          } else if (/recurring deposit|rd/i.test(desc)) {
            subCategoryId = 'rd';
          }
        }
        // Check for trading
        else if (/trading|stocks|shares|broker/i.test(desc)) {
          mainCategoryId = 'savings';
          subCategoryId = 'trading_other';
          
          // Check for specific trading platforms
          if (/etoro|e-toro/i.test(desc)) {
            subCategoryId = 'etoro';
          } else if (/trading 121|trading121/i.test(desc)) {
            subCategoryId = 'trading121';
          }
        }
      }
      
      // Add to main category
      groupedData[mainCategoryId].transactions.push(transaction);
      groupedData[mainCategoryId].totalAmount += amount;
      
      // Add to subcategory
      if (!groupedData[mainCategoryId].subCategories![subCategoryId]) {
        groupedData[mainCategoryId].subCategories![subCategoryId] = {
          categoryId: subCategoryId,
          transactions: [],
          totalAmount: 0
        };
      }
      
      groupedData[mainCategoryId].subCategories![subCategoryId].transactions.push(transaction);
      groupedData[mainCategoryId].subCategories![subCategoryId].totalAmount += amount;
    });
    
    return groupedData;
  };
  
  const groupedTransactions = getGroupedTransactions();
  
  const formatAmount = (amount: number) => {
    return `€${Math.abs(amount).toFixed(2)}`;
  };
  
  const getCategoryName = (id: string) => {
    const category = getCategoryById(id);
    return category ? category.name : id;
  };
  
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
  
  return (
    <Box sx={{ mb: 4 }}>
      {['earnings', 'expenditures', 'savings'].map((categoryId) => {
        const group = groupedTransactions[categoryId];
        const isPositive = categoryId === 'earnings';
        
        return (
          <Accordion key={categoryId} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{getCategoryName(categoryId)}</Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: group.totalAmount >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 'bold'
                  }}
                >
                  {formatAmount(group.totalAmount)}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Divider sx={{ mb: 2 }} />
              
              {Object.values(group.subCategories || {}).map((subGroup) => (
                <Accordion key={subGroup.categoryId} sx={{ mb: 1, boxShadow: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">{getCategoryName(subGroup.categoryId)}</Typography>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          color: subGroup.totalAmount >= 0 ? 'success.main' : 'error.main',
                          fontWeight: 'bold'
                        }}
                      >
                        {formatAmount(subGroup.totalAmount)}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {subGroup.transactions.map((transaction, index) => {
                        const amount = transaction.debitAmount 
                          ? -parseFloat(transaction.debitAmount.replace(/,/g, ''))
                          : (transaction.creditAmount ? parseFloat(transaction.creditAmount.replace(/,/g, '')) : 0);
                        
                        return (
                          <ListItem 
                            key={transaction.id || index}
                            divider={index < subGroup.transactions.length - 1}
                          >
                            <ListItemText 
                              primary={
                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                  <Typography variant="body2">{transaction.date} - {transaction.description}</Typography>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: amount >= 0 ? 'success.main' : 'error.main',
                                      fontWeight: 'medium'
                                    }}
                                  >
                                    {formatAmount(amount)}
                                  </Typography>
                                </Stack>
                              }
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default GroupedTransactions;

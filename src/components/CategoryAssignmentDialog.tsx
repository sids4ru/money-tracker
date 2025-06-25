import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  FormControlLabel, 
  Checkbox, 
  CircularProgress,
  Typography,
  Collapse,
  IconButton,
  ListItemButton,
  Box
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { CategoryService, Category } from '../services/categoryApi';
import { Transaction } from '../types/Transaction';

interface CategoryAssignmentDialogProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onAssign: (transactionId: number, categoryId: number, applyToSimilar: boolean) => Promise<void>;
}

const CategoryAssignmentDialog: React.FC<CategoryAssignmentDialogProps> = ({ 
  open, 
  transaction, 
  onClose, 
  onAssign
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [applyToSimilar, setApplyToSimilar] = useState(true); // Set to true by default
  const [assigning, setAssigning] = useState(false);
  
  // Load categories when dialog opens
  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);
  
  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await CategoryService.getAllCategories();
      setCategories(data);
      
      // Initialize expansion state
      const initialExpanded: Record<number, boolean> = {};
      data.forEach(category => {
        if (category.id) {
          initialExpanded[category.id] = false;
        }
      });
      setExpanded(initialExpanded);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleExpand = (categoryId: number) => {
    setExpanded(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  const handleAssign = async (categoryId: number) => {
    if (!transaction || !transaction.id) return;
    
    setAssigning(true);
    
    try {
      await onAssign(transaction.id, categoryId, applyToSimilar);
      onClose();
    } catch (error) {
      console.error('Error assigning category:', error);
    } finally {
      setAssigning(false);
    }
  };
  
  const renderCategoryList = (categoryList: Category[], isSubcategory = false) => {
    return categoryList.map(category => {
      if (!category.id) return null;
      
      const hasChildren = category.children && category.children.length > 0;
      
      return (
        <React.Fragment key={category.id}>
          <ListItem
            disablePadding
            sx={{ 
              pl: isSubcategory ? 4 : 0,
              pr: 2
            }}
          >
            <ListItemButton 
              onClick={() => handleAssign(category.id!)}
              disabled={assigning}
              dense
            >
              <ListItemText 
                primary={category.name} 
                secondary={category.description}
              />
            </ListItemButton>
            
            {hasChildren && (
              <IconButton
                edge="end"
                aria-label="expand"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(category.id!);
                }}
              >
                {expanded[category.id!] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </ListItem>
          
          {hasChildren && (
            <Collapse in={expanded[category.id!]} timeout="auto" unmountOnExit>
              <List disablePadding>
                {renderCategoryList(category.children!, true)}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    });
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Assign Transaction to Category
      </DialogTitle>
      {transaction && (
        <Box sx={{ px: 3, pb: 1, mt: -1 }}>
          <Typography variant="subtitle2" color="textSecondary">
            {transaction.description} - {transaction.creditAmount ? `€${transaction.creditAmount}` : `-€${transaction.debitAmount}`}
          </Typography>
          {transaction.groupingStatus && transaction.groupingStatus !== 'none' && (
            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
              Note: This transaction already has a category assigned. Selecting a new category will replace the existing one.
            </Typography>
          )}
        </Box>
      )}
      <DialogContent>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <CircularProgress />
          </div>
        ) : (
          <>
            <FormControlLabel 
              control={
                <Checkbox 
                  checked={applyToSimilar}
                  onChange={(e) => setApplyToSimilar(e.target.checked)}
                  color="primary" 
                />
              }
              label="Apply to similar transactions" 
              sx={{ mb: 2 }}
            />
            
            <List sx={{ width: '100%' }}>
              {renderCategoryList(categories)}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={assigning}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryAssignmentDialog;

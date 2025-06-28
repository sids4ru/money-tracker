import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Tabs, 
  Tab, 
  List, 
  ListItem,
  ListItemText,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  SelectChangeEvent,
  Card,
  CardHeader,
  CardContent,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Category, ParentCategory, CategoryService, TransactionSimilarityPattern } from '../services/categoryApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

interface ParentCategoryFormData {
  name: string;
  description: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  parent_id: number | null;
}

interface PatternFormData {
  pattern_type: string;
  pattern_value: string;
  parent_category_id: number | null;
  category_id: number | null;
  confidence_score: number;
}

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const [patterns, setPatterns] = useState<TransactionSimilarityPattern[]>([]);
  
  // Category management state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    parent_id: null
  });
  
  // Parent category management state
  const [parentCategoryDialogOpen, setParentCategoryDialogOpen] = useState(false);
  const [editingParentCategory, setEditingParentCategory] = useState<ParentCategory | null>(null);
  const [parentCategoryFormData, setParentCategoryFormData] = useState<ParentCategoryFormData>({
    name: '',
    description: ''
  });
  
  // Pattern management state
  const [patternDialogOpen, setPatternDialogOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<TransactionSimilarityPattern | null>(null);
  const [patternFormData, setPatternFormData] = useState<PatternFormData>({
    pattern_type: 'exact',
    pattern_value: '',
    parent_category_id: null,
    category_id: null,
    confidence_score: 1.0
  });
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const fetchedCategories = await CategoryService.getAllCategories();
      console.log("Fetched categories:", fetchedCategories);
      setParentCategories(fetchedCategories);
      
      // In a real implementation, we would also fetch patterns here
      // const fetchedPatterns = await CategoryService.getAllPatterns();
      // setPatterns(fetchedPatterns);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load data. Please try again.');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Parent category handling
  const handleOpenParentCategoryDialog = (parentCategory?: ParentCategory) => {
    if (parentCategory) {
      // Editing existing parent category
      setEditingParentCategory(parentCategory);
      setParentCategoryFormData({
        name: parentCategory.name,
        description: parentCategory.description || ''
      });
    } else {
      // Creating new parent category
      setEditingParentCategory(null);
      setParentCategoryFormData({
        name: '',
        description: ''
      });
    }
    setParentCategoryDialogOpen(true);
  };

  const handleCloseParentCategoryDialog = () => {
    setParentCategoryDialogOpen(false);
    setError(null);
  };

  const handleParentCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParentCategoryFormData({
      ...parentCategoryFormData,
      [name]: value
    });
  };

  const handleSubmitParentCategory = async () => {
    try {
      if (!parentCategoryFormData.name.trim()) {
        setError('Parent category name is required.');
        return;
      }

      if (editingParentCategory) {
        // Update existing parent category
        await CategoryService.updateParentCategory(editingParentCategory.id!, parentCategoryFormData);
        setSuccess(`Parent category "${parentCategoryFormData.name}" updated successfully.`);
      } else {
        // Create new parent category
        await CategoryService.createParentCategory(parentCategoryFormData);
        setSuccess(`Parent category "${parentCategoryFormData.name}" created successfully.`);
      }

      // Close dialog and refresh data
      setParentCategoryDialogOpen(false);
      fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    }
  };

  const handleDeleteParentCategory = async (parentCategory: ParentCategory) => {
    if (window.confirm(`Are you sure you want to delete the parent category "${parentCategory.name}"? This will also delete all its subcategories.`)) {
      try {
        await CategoryService.deleteParentCategory(parentCategory.id!);
        setSuccess(`Parent category "${parentCategory.name}" deleted successfully.`);
        fetchData();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete parent category. It may have subcategories.');
      }
    }
  };
  
  // Category handling
  const handleOpenCategoryDialog = (category?: Category, parentId?: number) => {
    if (category) {
      // Editing existing category
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
        description: category.description || '',
        parent_id: category.parent_id || null
      });
    } else {
      // Creating new category
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        description: '',
        parent_id: parentId || null
      });
    }
    setCategoryDialogOpen(true);
  };

  const handleCloseCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setError(null);
  };

  const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCategoryFormData({
      ...categoryFormData,
      [name]: value
    });
  };

  const handleCategorySelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setCategoryFormData({
      ...categoryFormData,
      [name]: value === "" ? null : Number(value)
    });
  };

  const handleSubmitCategory = async () => {
    try {
      if (!categoryFormData.name.trim()) {
        setError('Category name is required.');
        return;
      }

      if (editingCategory) {
        // Update existing category
        await CategoryService.updateCategory(editingCategory.id!, categoryFormData);
        setSuccess(`Category "${categoryFormData.name}" updated successfully.`);
      } else {
        // Create new category
        await CategoryService.createCategory(categoryFormData);
        setSuccess(`Category "${categoryFormData.name}" created successfully.`);
      }

      // Close dialog and refresh categories
      setCategoryDialogOpen(false);
      fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (window.confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      try {
        await CategoryService.deleteCategory(category.id!);
        setSuccess(`Category "${category.name}" deleted successfully.`);
        fetchData();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete category.');
      }
    }
  };
  
  // Pattern handling
  const handleOpenPatternDialog = (pattern?: TransactionSimilarityPattern) => {
    if (pattern) {
      // Editing existing pattern
      setEditingPattern(pattern);
      setPatternFormData({
        pattern_type: pattern.pattern_type,
        pattern_value: pattern.pattern_value,
        parent_category_id: pattern.parent_category_id || null,
        category_id: pattern.category_id || null,
        confidence_score: pattern.confidence_score || 1.0
      });
    } else {
      // Creating new pattern
      setEditingPattern(null);
      setPatternFormData({
        pattern_type: 'exact',
        pattern_value: '',
        parent_category_id: null,
        category_id: null,
        confidence_score: 1.0
      });
    }
    setPatternDialogOpen(true);
  };

  const handleClosePatternDialog = () => {
    setPatternDialogOpen(false);
    setError(null);
  };

  const handlePatternInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // For number fields, convert to number
    if (name === 'confidence_score') {
      setPatternFormData({
        ...patternFormData,
        [name]: parseFloat(value)
      });
    } else {
      setPatternFormData({
        ...patternFormData,
        [name]: value
      });
    }
  };

  const handlePatternSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setPatternFormData({
      ...patternFormData,
      [name]: value === "" ? null : 
              (name === 'pattern_type' ? value : Number(value))
    });
  };

  const handleSubmitPattern = async () => {
    try {
      if (!patternFormData.pattern_value.trim()) {
        setError('Pattern value is required.');
        return;
      }
      
      // Ensure at least one of parent_category_id or category_id is provided
      if (!patternFormData.parent_category_id && !patternFormData.category_id) {
        setError('Either a parent category or category must be selected.');
        return;
      }

      if (editingPattern) {
        // Update existing pattern
        await CategoryService.updateTransactionSimilarityPattern(
          editingPattern.id!, 
          patternFormData
        );
        setSuccess(`Pattern updated successfully.`);
      } else {
        // Create new pattern
        await CategoryService.createTransactionSimilarityPattern(patternFormData);
        setSuccess(`Pattern created successfully.`);
      }

      // Close dialog and refresh data
      setPatternDialogOpen(false);
      fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    }
  };

  const handleDeletePattern = async (pattern: TransactionSimilarityPattern) => {
    if (window.confirm(`Are you sure you want to delete this pattern?`)) {
      try {
        await CategoryService.deleteTransactionSimilarityPattern(pattern.id!);
        setSuccess(`Pattern deleted successfully.`);
        fetchData();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete pattern.');
      }
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
          <Tab label="Category Management" {...a11yProps(0)} />
          <Tab label="Transaction Patterns" {...a11yProps(1)} />
        </Tabs>
      </Box>
      
      {/* Category Management Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Parent Categories & Categories</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenParentCategoryDialog()}
          >
            Add Parent Category
          </Button>
        </Box>
        
        {/* Parent Categories and their child categories */}
        {parentCategories.map(parentCategory => (
          <Card key={parentCategory.id} sx={{ mb: 3 }}>
            <CardHeader
              title={parentCategory.name}
              subheader={parentCategory.description || 'No description'}
              action={
                <Box>
                  <IconButton 
                    aria-label="edit" 
                    onClick={() => handleOpenParentCategoryDialog(parentCategory)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    aria-label="delete"
                    onClick={() => handleDeleteParentCategory(parentCategory)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1">Categories</Typography>
                <Button 
                  size="small" 
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenCategoryDialog(undefined, parentCategory.id)}
                >
                  Add Category
                </Button>
              </Box>
              
              <List dense>
                {parentCategory.children && parentCategory.children.map(category => (
                  <ListItem 
                    key={category.id}
                    secondaryAction={
                      <Box>
                        <IconButton 
                          edge="end" 
                          aria-label="edit"
                          size="small"
                          onClick={() => handleOpenCategoryDialog(category)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          size="small"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText 
                      primary={category.name} 
                      secondary={category.description || 'No description'} 
                    />
                  </ListItem>
                ))}
                {(!parentCategory.children || parentCategory.children.length === 0) && (
                  <ListItem>
                    <ListItemText primary="No categories yet" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        ))}
        
        {parentCategories.length === 0 && (
          <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
            No parent categories found. Start by adding a parent category.
          </Typography>
        )}
      </TabPanel>
      
      {/* Transaction Patterns Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Transaction Similarity Patterns</Typography>
          <Button 
            variant="contained" 
            startIcon={<FilterListIcon />}
            onClick={() => handleOpenPatternDialog()}
          >
            Add Pattern
          </Button>
        </Box>
        
        <Grid container spacing={2}>
          {patterns.map(pattern => (
            <Grid key={pattern.id} sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
              <Card sx={{ mb: 2 }}>
                <CardHeader
                  title={`${pattern.pattern_type}: ${pattern.pattern_value}`}
                  subheader={`Confidence: ${pattern.confidence_score}, Used: ${pattern.usage_count || 0} times`}
                  action={
                    <Box>
                      <IconButton 
                        aria-label="edit" 
                        size="small"
                        onClick={() => handleOpenPatternDialog(pattern)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        aria-label="delete" 
                        size="small"
                        onClick={() => handleDeletePattern(pattern)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {pattern.parent_category_id && `Parent Category ID: ${pattern.parent_category_id}`}
                    {pattern.category_id && `Category ID: ${pattern.category_id}`}
                    {!pattern.parent_category_id && !pattern.category_id && 'No category assigned'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        {patterns.length === 0 && (
          <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
            No transaction patterns found. Start by adding a pattern.
          </Typography>
        )}
      </TabPanel>
      
      {/* Parent Category Dialog */}
      <Dialog open={parentCategoryDialogOpen} onClose={handleCloseParentCategoryDialog}>
        <DialogTitle>
          {editingParentCategory ? `Edit Parent Category: ${editingParentCategory.name}` : 'Add New Parent Category'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Parent Category Name"
            type="text"
            fullWidth
            variant="outlined"
            value={parentCategoryFormData.name}
            onChange={handleParentCategoryInputChange}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            margin="dense"
            name="description"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={parentCategoryFormData.description}
            onChange={handleParentCategoryInputChange}
            sx={{ mb: 2 }}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseParentCategoryDialog}>Cancel</Button>
          <Button onClick={handleSubmitParentCategory} variant="contained">
            {editingParentCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={handleCloseCategoryDialog}>
        <DialogTitle>
          {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Category'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Category Name"
            type="text"
            fullWidth
            variant="outlined"
            value={categoryFormData.name}
            onChange={handleCategoryInputChange}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            margin="dense"
            name="description"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={categoryFormData.description}
            onChange={handleCategoryInputChange}
            sx={{ mb: 2 }}
            multiline
            rows={2}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel id="parent-category-label">Parent Category</InputLabel>
            <Select
              labelId="parent-category-label"
              name="parent_id"
              value={categoryFormData.parent_id === null ? "" : categoryFormData.parent_id.toString()}
              onChange={handleCategorySelectChange}
              label="Parent Category"
              required
            >
              {parentCategories.map(parentCategory => (
                <MenuItem key={parentCategory.id} value={parentCategory.id!.toString()}>
                  {parentCategory.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryDialog}>Cancel</Button>
          <Button onClick={handleSubmitCategory} variant="contained">
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Pattern Dialog */}
      <Dialog open={patternDialogOpen} onClose={handleClosePatternDialog}>
        <DialogTitle>
          {editingPattern ? `Edit Pattern` : 'Add New Pattern'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth variant="outlined" sx={{ mb: 2, mt: 1 }}>
            <InputLabel id="pattern-type-label">Pattern Type</InputLabel>
            <Select
              labelId="pattern-type-label"
              name="pattern_type"
              value={patternFormData.pattern_type}
              onChange={handlePatternSelectChange}
              label="Pattern Type"
            >
              <MenuItem value="exact">Exact Match</MenuItem>
              <MenuItem value="contains">Contains</MenuItem>
              <MenuItem value="starts_with">Starts With</MenuItem>
              <MenuItem value="regex">Regular Expression</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            name="pattern_value"
            label="Pattern Value"
            type="text"
            fullWidth
            variant="outlined"
            value={patternFormData.pattern_value}
            onChange={handlePatternInputChange}
            sx={{ mb: 2 }}
            required
          />
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="parent-category-id-label">Parent Category</InputLabel>
            <Select
              labelId="parent-category-id-label"
              name="parent_category_id"
              value={patternFormData.parent_category_id === null ? "" : patternFormData.parent_category_id.toString()}
              onChange={handlePatternSelectChange}
              label="Parent Category"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {parentCategories.map(parentCategory => (
                <MenuItem key={parentCategory.id} value={parentCategory.id!.toString()}>
                  {parentCategory.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="category-id-label">Specific Category</InputLabel>
            <Select
              labelId="category-id-label"
              name="category_id"
              value={patternFormData.category_id === null ? "" : patternFormData.category_id.toString()}
              onChange={handlePatternSelectChange}
              label="Specific Category"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {parentCategories.flatMap(parentCategory => 
                parentCategory.children || []
              ).map(category => (
                <MenuItem key={category.id} value={category.id!.toString()}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            name="confidence_score"
            label="Confidence Score (0.0 - 1.0)"
            type="number"
            fullWidth
            variant="outlined"
            value={patternFormData.confidence_score}
            onChange={handlePatternInputChange}
            inputProps={{ min: 0, max: 1, step: 0.1 }}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePatternDialog}>Cancel</Button>
          <Button onClick={handleSubmitPattern} variant="contained">
            {editingPattern ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

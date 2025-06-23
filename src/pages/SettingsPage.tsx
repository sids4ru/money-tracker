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
  SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Category, CategoryService } from '../services/categoryApi';

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

interface CategoryFormData {
  name: string;
  description: string;
  parent_id: number | null;
}

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    parent_id: null
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const fetchedCategories = await CategoryService.getAllCategories();
      console.log("Fetched categories:", fetchedCategories);
      
      // Process the categories to flatten the hierarchy if needed
      const processedCategories: Category[] = [];
      fetchedCategories.forEach(category => {
        processedCategories.push(category);
        if (category.children && Array.isArray(category.children)) {
          category.children.forEach(child => {
            processedCategories.push(child);
          });
        }
      });
      
      setCategories(processedCategories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setError('Failed to load categories. Please try again.');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      // Editing existing category
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        parent_id: category.parent_id || null
      });
    } else {
      // Creating new category
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        parent_id: null
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value === "" ? null : Number(value)
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        setError('Category name is required.');
        return;
      }

      if (editingCategory) {
        // Update existing category
        await CategoryService.updateCategory(editingCategory.id!, formData);
        setSuccess(`Category "${formData.name}" updated successfully.`);
      } else {
        // Create new category
        await CategoryService.createCategory(formData);
        setSuccess(`Category "${formData.name}" created successfully.`);
      }

      // Close dialog and refresh categories
      setDialogOpen(false);
      fetchCategories();
      
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
        fetchCategories();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete category. It may have subcategories.');
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
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Categories and Subcategories</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Category
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Main Categories */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>Main Categories</Typography>
            <List>
              {categories
                .filter(category => !category.parent_id)
                .map(category => (
                  <ListItem 
                    key={category.id}
                    secondaryAction={
                      <Box>
                        <IconButton 
                          edge="end" 
                          aria-label="edit" 
                          onClick={() => handleOpenDialog(category)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          <DeleteIcon />
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
            </List>
          </Box>
          
          {/* Subcategories */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>Subcategories</Typography>
            {categories
              .filter(category => !category.parent_id)
              .map(parentCategory => (
                <Box key={parentCategory.id} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2">{parentCategory.name}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <List dense>
                    {categories
                      .filter(category => category.parent_id === parentCategory.id)
                      .map(subcategory => (
                        <ListItem 
                          key={subcategory.id}
                          secondaryAction={
                            <Box>
                              <IconButton 
                                edge="end" 
                                aria-label="edit"
                                size="small"
                                onClick={() => handleOpenDialog(subcategory)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                edge="end" 
                                aria-label="delete"
                                size="small"
                                onClick={() => handleDeleteCategory(subcategory)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          }
                        >
                          <ListItemText 
                            primary={subcategory.name} 
                            secondary={subcategory.description || 'No description'} 
                          />
                        </ListItem>
                      ))}
                    <ListItem>
                      <Button 
                        size="small" 
                        startIcon={<AddIcon />}
                        onClick={() => {
                          // Create a new empty form for subcategory, only setting the parent_id
                          setEditingCategory(null); // Important: set to null since it's a new category
                          setFormData({
                            name: '',
                            description: '',
                            parent_id: parentCategory.id ?? null
                          });
                          setDialogOpen(true);
                        }}
                      >
                        Add Subcategory
                      </Button>
                    </ListItem>
                  </List>
                </Box>
              ))}
          </Box>
        </Box>
      </TabPanel>
      
      {/* Category Form Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
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
            value={formData.name}
            onChange={handleInputChange}
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
            value={formData.description}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
            multiline
            rows={2}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel id="parent-category-label">Parent Category (optional)</InputLabel>
            <Select
              labelId="parent-category-label"
              name="parent_id"
              value={formData.parent_id === null ? "" : formData.parent_id.toString()}
              onChange={handleSelectChange}
              label="Parent Category (optional)"
            >
              <MenuItem value="">
                <em>None (Top-level category)</em>
              </MenuItem>
              {categories
                .filter(category => !category.parent_id)
                .filter(category => category.id !== editingCategory?.id) // Prevent circular references
                .map(category => (
                  <MenuItem key={category.id} value={category.id!.toString()}>
                    {category.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

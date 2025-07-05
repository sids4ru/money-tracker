import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert, 
  Snackbar,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { TransactionService } from '../services/api';

interface ImportCSVProps {
  onImportComplete: () => void;
}

interface ImporterOption {
  name: string;
  code: string;
  description: string;
  supportedFileTypes: string[];
}

const ImportCSV: React.FC<ImportCSVProps> = ({ onImportComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [autoApplyCategories, setAutoApplyCategories] = useState(true);
  const [importers, setImporters] = useState<ImporterOption[]>([]);
  const [selectedImporter, setSelectedImporter] = useState<string>('');
  const [isLoadingImporters, setIsLoadingImporters] = useState(true);
  
  // Fetch available importers when component mounts
  useEffect(() => {
    const fetchImporters = async () => {
      try {
        setIsLoadingImporters(true);
        let importerOptions: ImporterOption[] = [];
        
        try {
          importerOptions = await TransactionService.getAvailableImporters();
        } catch (error) {
          console.warn('Could not fetch importers from API, using default importer', error);
          // If API fails, use default AIB importer
          importerOptions = [];
        }
        
        // If no importers returned from API, add a default AIB importer
        if (importerOptions.length === 0) {
          const defaultImporter: ImporterOption = {
            name: 'AIB Bank',
            code: 'aib-importer',
            description: 'Allied Irish Bank CSV exports',
            supportedFileTypes: ['.csv']
          };
          importerOptions = [defaultImporter];
          console.log('Using default importer:', defaultImporter);
        }
        
        setImporters(importerOptions);
        
        // Set default importer
        if (importerOptions.length > 0) {
          setSelectedImporter(importerOptions[0].code);
        }
      } catch (err) {
        console.error('Error setting up importers:', err);
        setError('Failed to load available importers');
      } finally {
        setIsLoadingImporters(false);
      }
    };
    
    fetchImporters();
  }, []);
  
  const handleFileChange = async (file: File) => {
    if (!file) return;
    
    // Check file extension against supported types for selected importer
    const importer = importers.find(imp => imp.code === selectedImporter);
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (importer && !importer.supportedFileTypes.includes(extension)) {
      setError(`Selected importer only supports ${importer.supportedFileTypes.join(', ')} files`);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Import the file with the selected importer
      const result = await TransactionService.importFromFile(file, selectedImporter, autoApplyCategories);
      
      // Show success message
      setSuccess(`Successfully imported ${result.added} transactions. ${result.duplicates} duplicates were skipped.`);
      
      // Notify the parent component that import is complete
      onImportComplete();
    } catch (err) {
      console.error('Error importing transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(null);
    setError(null);
  };

  // Get supported file extensions for the selected importer
  const getSupportedFileTypes = () => {
    const importer = importers.find(imp => imp.code === selectedImporter);
    return importer?.supportedFileTypes.join(',') || '.csv';
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Paper
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          bgcolor: isDragging ? 'action.hover' : 'background.paper',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {/* Importer selection dropdown */}
        <FormControl 
          sx={{ mb: 2, minWidth: 200, display: 'block' }} 
          onClick={(e) => e.stopPropagation()}
          disabled={isLoadingImporters || isLoading}
        >
          <InputLabel id="importer-select-label">Bank/Format</InputLabel>
          <Select
            labelId="importer-select-label"
            id="importer-select"
            value={selectedImporter}
            label="Bank/Format"
            onChange={(e) => setSelectedImporter(e.target.value)}
            fullWidth
          >
            {importers.map((importer) => (
              <MenuItem key={importer.code} value={importer.code}>
                {importer.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Auto-categorization checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={autoApplyCategories}
              onChange={(e) => setAutoApplyCategories(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              color="primary"
              disabled={isLoading}
            />
          }
          label="Auto-apply categories to imported transactions"
          sx={{ mb: 2, display: 'block' }}
        />
        
        {/* File input and upload UI */}
        <input
          type="file"
          id="file-input"
          accept={getSupportedFileTypes()}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={isLoading || importers.length === 0}
        />
        <UploadFileIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" component="div" gutterBottom>
          Drag & Drop File Here
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          or click to browse files
        </Typography>
        <Button
          variant="contained"
          component="span"
          disabled={isLoading || importers.length === 0}
          sx={{ mt: 2 }}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Select File'}
        </Button>
        
        {/* Selected importer info */}
        {selectedImporter && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Using: {importers.find(imp => imp.code === selectedImporter)?.name}
            {importers.find(imp => imp.code === selectedImporter)?.description && (
              <Typography variant="caption" display="block">
                {importers.find(imp => imp.code === selectedImporter)?.description}
              </Typography>
            )}
          </Typography>
        )}
      </Paper>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!success} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ImportCSV;

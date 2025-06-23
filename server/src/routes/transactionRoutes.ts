import express from 'express';
import multer from 'multer';
import path from 'path';
import * as transactionController from '../controllers/transactionController';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store uploaded files in the uploads directory
    const uploadsDir = path.join(__dirname, '../../uploads');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to avoid overwriting
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `transaction-import-${uniqueSuffix}${extension}`);
  }
});

// File filter to allow only CSV files
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Create uploads directory if it doesn't exist
import fs from 'fs';
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Route to get all transactions
router.get('/', transactionController.getAllTransactions);

// Route to search transactions
router.get('/search', transactionController.searchTransactions);

// Route to get a specific transaction by ID
router.get('/:id', transactionController.getTransactionById);

// Route to create a new transaction
router.post('/', transactionController.createTransaction);

// Route to update an existing transaction
router.put('/:id', transactionController.updateTransaction);

// Route to delete a transaction
router.delete('/:id', transactionController.deleteTransaction);

// Route to import transactions from CSV file
router.post('/import', upload.single('file'), transactionController.importTransactionsFromCSV);

export default router;

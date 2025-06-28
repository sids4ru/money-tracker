import express from 'express';
import { CategoryController } from '../controllers/categoryController';

const router = express.Router();

// Parent Category routes
router.get('/parent', CategoryController.getAllParentCategories);
router.post('/parent', CategoryController.createParentCategory);
router.get('/parent/:id', CategoryController.getParentCategory);
router.put('/parent/:id', CategoryController.updateParentCategory);
router.delete('/parent/:id', CategoryController.deleteParentCategory);

// Category routes
router.get('/', CategoryController.getAllCategories);
router.post('/', CategoryController.createCategory);
router.get('/:id', CategoryController.getCategory);
router.put('/:id', CategoryController.updateCategory);
router.delete('/:id', CategoryController.deleteCategory);

// Transaction Similarity Pattern routes
router.get('/patterns', CategoryController.getAllTransactionSimilarityPatterns);
router.post('/pattern', CategoryController.createTransactionSimilarityPattern);
router.get('/pattern/:id', CategoryController.getTransactionSimilarityPattern);
router.put('/pattern/:id', CategoryController.updateTransactionSimilarityPattern);
router.delete('/pattern/:id', CategoryController.deleteTransactionSimilarityPattern);

// Transaction-Category relationship routes
router.get('/transaction/:transactionId', CategoryController.getTransactionCategories);
router.post('/transaction/:transactionId', CategoryController.assignTransactionCategory);
router.delete('/transaction/:transactionId/category/:categoryId', CategoryController.removeTransactionCategory);

export default router;

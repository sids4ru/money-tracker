import express from 'express';
import { CategoryController } from '../controllers/categoryController';

const router = express.Router();

// Category routes
router.get('/', CategoryController.getAllCategories);
router.post('/', CategoryController.createCategory);
router.get('/:id', CategoryController.getCategory);
router.put('/:id', CategoryController.updateCategory);
router.delete('/:id', CategoryController.deleteCategory);

// Transaction-Category relationship routes
router.get('/transaction/:transactionId', CategoryController.getTransactionCategories);
router.post('/transaction/:transactionId', CategoryController.assignTransactionCategory);
router.delete('/transaction/:transactionId/category/:categoryId', CategoryController.removeTransactionCategory);

export default router;

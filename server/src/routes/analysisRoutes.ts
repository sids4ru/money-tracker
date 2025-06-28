import express from 'express';
import * as analysisController from '../controllers/analysisController';

const router = express.Router();

// Route to get spending by parent category per month for a year
router.get('/spending/parent-categories', analysisController.getSpendingByParentCategoryPerMonth);

// Route to get spending by category within a parent category for a specific month
router.get('/spending/parent-categories/:parentId/categories', analysisController.getSpendingByCategoryForMonth);

export default router;

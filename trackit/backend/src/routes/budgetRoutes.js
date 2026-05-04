const express = require('express');
const {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  getBudgetAlerts
} = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getBudgets)
  .post(createBudget);

router.get('/alerts', getBudgetAlerts);

router.route('/:id')
  .put(updateBudget)
  .delete(deleteBudget);

module.exports = router;
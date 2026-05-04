const express = require('express');
const {
  getDashboardSummary,
  getSpendingTrends,
  getCashFlow
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardSummary);
router.get('/trends', getSpendingTrends);
router.get('/cashflow', getCashFlow);

module.exports = router;
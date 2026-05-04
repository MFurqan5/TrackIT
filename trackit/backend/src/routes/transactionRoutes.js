const express = require('express');
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  getTransactionSummary
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const { uploadReceipt } = require('../middleware/upload');
const { exportCSV, exportExcel, exportPDF } = require('../controllers/exportController');
const { createRecurring, getRecurring, updateRecurring, deleteRecurring } = require('../controllers/recurringController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Transaction CRUD
router.route('/')
  .get(getTransactions)
  .post(uploadReceipt, createTransaction);

router.get('/export/csv', exportCSV);
router.get('/export/excel', exportExcel);
router.get('/export/pdf', exportPDF);
router.post('/recurring', createRecurring);
router.get('/recurring', getRecurring);
router.put('/recurring/:id', updateRecurring);
router.delete('/recurring/:id', deleteRecurring);

router.get('/summary', getTransactionSummary);
router.post('/bulk-delete', bulkDeleteTransactions);

router.route('/:id')
  .get(getTransactionById)
  .put(updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
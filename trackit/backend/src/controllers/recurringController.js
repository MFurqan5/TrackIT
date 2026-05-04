const getRecurringTransactions = async (req, res) => {
  res.status(200).json({ success: true, data: [] });
};

const createRecurringTransaction = async (req, res) => {
  res.status(201).json({ success: true, data: {} });
};

const updateRecurringTransaction = async (req, res) => {
  res.status(200).json({ success: true, data: {} });
};

const deleteRecurringTransaction = async (req, res) => {
  res.status(200).json({ success: true, data: {} });
};

const processRecurringTransaction = async (req, res) => {
  res.status(200).json({ success: true, data: {} });
};

module.exports = {
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  processRecurringTransaction
};
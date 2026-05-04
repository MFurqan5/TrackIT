const { exportToCSV, exportToExcel, exportToPDF } = require('../services/exportService');
const { sendError } = require('../utils/response');

// Export to CSV
const exportCSV = async (req, res) => {
  try {
    const { startDate, endDate, category, type } = req.query;
    const filters = {};
    
    if (startDate) filters.date = { $gte: new Date(startDate) };
    if (endDate) filters.date = { ...filters.date, $lte: new Date(endDate) };
    if (category) filters.category = category;
    if (type) filters.type = type;
    
    const csv = await exportToCSV(req.user._id, filters);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.csv`);
    res.send(csv);
    
  } catch (error) {
    console.error('Export CSV error:', error);
    sendError(res, 'Failed to export CSV', 500, error);
  }
};

// Export to Excel
const exportExcel = async (req, res) => {
  try {
    const { startDate, endDate, category, type } = req.query;
    const filters = {};
    
    if (startDate) filters.date = { $gte: new Date(startDate) };
    if (endDate) filters.date = { ...filters.date, $lte: new Date(endDate) };
    if (category) filters.category = category;
    if (type) filters.type = type;
    
    const workbook = await exportToExcel(req.user._id, filters);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Export Excel error:', error);
    sendError(res, 'Failed to export Excel', 500, error);
  }
};

// Export to PDF
const exportPDF = async (req, res) => {
  try {
    const { startDate, endDate, category, type } = req.query;
    const filters = {};
    
    if (startDate) filters.date = { $gte: new Date(startDate) };
    if (endDate) filters.date = { ...filters.date, $lte: new Date(endDate) };
    if (category) filters.category = category;
    if (type) filters.type = type;
    
    const doc = await exportToPDF(req.user._id, filters);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.pdf`);
    
    doc.pipe(res);
    doc.end();
    
  } catch (error) {
    console.error('Export PDF error:', error);
    sendError(res, 'Failed to export PDF', 500, error);
  }
};

module.exports = { exportCSV, exportExcel, exportPDF };
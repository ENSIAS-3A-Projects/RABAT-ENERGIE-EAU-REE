const express = require('express');
const ReportsController = require('../controllers/ReportsController');
const { verifyToken } = require('../middlewares/authJwt');

const router = express.Router();

router.get('/monthly', verifyToken, ReportsController.getMonthlyReport);
router.get('/yearly-comparison', verifyToken, ReportsController.getYearlyComparison);
router.get('/monthly.pdf', verifyToken, ReportsController.getMonthlyReportPdf);
router.get('/trends', verifyToken, ReportsController.getTrends);
router.get('/trends.pdf', verifyToken, ReportsController.getTrendsPdf);

module.exports = router;



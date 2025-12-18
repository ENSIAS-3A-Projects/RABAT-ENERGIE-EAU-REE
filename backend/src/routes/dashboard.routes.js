const express = require('express');
const DashboardController = require('../controllers/DashboardController');
const { verifyToken } = require('../middlewares/authJwt');

const router = express.Router();

router.get('/stats', verifyToken, DashboardController.getStats);

module.exports = router;






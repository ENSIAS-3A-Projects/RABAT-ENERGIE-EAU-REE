const express = require('express');
const MobileController = require('../controllers/MobileController');
const { verifyToken } = require('../middlewares/authJwt');

const router = express.Router();

// Endpoints pour l'application mobile
router.get('/tournees', verifyToken, MobileController.getTournees);
router.post('/releves', verifyToken, MobileController.createReleveMobile);

module.exports = router;






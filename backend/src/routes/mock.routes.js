const express = require('express');
const MockFacturationController = require('../controllers/MockFacturationController');
const { verifyToken } = require('../middlewares/authJwt');

const router = express.Router();

// Endpoint mock pour simuler le SI Facturation
router.post('/facturation/consommations', verifyToken, MockFacturationController.sendConsommation);

module.exports = router;





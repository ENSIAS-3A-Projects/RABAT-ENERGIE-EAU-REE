const express = require('express');
const AIController = require('../controllers/AIController');
const { verifyToken } = require('../middlewares/authJwt');

const router = express.Router();

// Endpoint pour les requêtes en langage naturel
router.post('/query', verifyToken, AIController.processNaturalLanguageQuery);

module.exports = router;


const express = require('express');
const IntegrationController = require('../controllers/IntegrationController');
const { verifyToken } = require('../middlewares/authJwt');

const router = express.Router();

// Endpoints simulant les échanges ERP / mobile
router.post('/erp/clients', verifyToken, IntegrationController.importClients);
router.post('/erp/agents', verifyToken, IntegrationController.importAgents);
router.get('/mobile/tournees', verifyToken, IntegrationController.listTournees);

module.exports = router;






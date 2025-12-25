const express = require('express');
const ClientController = require('../controllers/ClientController');
const { verifyToken } = require('../middlewares/authJwt');

const router = express.Router();

router.get('/', verifyToken, ClientController.listClients);

module.exports = router;






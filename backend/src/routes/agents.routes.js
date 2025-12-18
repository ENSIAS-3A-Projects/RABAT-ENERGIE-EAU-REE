const express = require('express');
const AgentController = require('../controllers/AgentController');
const { verifyToken } = require('../middlewares/authJwt');

const router = express.Router();

router.get('/', verifyToken, AgentController.listAgents);
router.patch('/:id/affectation', verifyToken, AgentController.updateAffectation);

module.exports = router;





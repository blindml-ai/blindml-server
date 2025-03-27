const express = require('express');
const router = express.Router();
const LogController= require('../controllers/LogController');
const logController = new LogController()

router.post('/last', logController.postLogLast);

module.exports = router;

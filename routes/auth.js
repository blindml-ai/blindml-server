var express = require('express');
var router = express.Router();
const AuthController = require('../controllers/AuthController');
const authController = new AuthController();

router.post('/verify_token', authController.postVerifyToken);
router.post('/container/verify_access', authController.postContainerVerifyAccess)

module.exports = router;


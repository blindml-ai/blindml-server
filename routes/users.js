const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const userController = new UserController()

router.get('/signin', userController.getSignIn);
router.post('/signin',userController.postSignIn);
router.get('/register', userController.getRegister);
router.post('/register', userController.postRegister);
router.get('/signout', userController.getSignOut);

router.get('/myapi', userController.getMyApi)
router.post('/myapi/regenerate', userController.postMyApiRegenerate)



module.exports = router;

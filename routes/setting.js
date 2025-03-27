const express = require('express');
const router = express.Router();
const SettingController = require('../controllers/SettingController');
const settingController = new SettingController();

router.get('/general', settingController.getGeneral);
router.post('/env', settingController.postEnv)


module.exports = router;

var express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
var router = express.Router();
const ProxyController = require('../controllers/ProxyController');
const proxyController = new ProxyController();

router.post('/cm/:container_id/init', proxyController.postConcreteMLInit);
router.post('/cm/:container_id/predict', upload.fields([{ name: 'EncryptedData' }, { name: 'EvaluationKey' }]), proxyController.postConcreteMLPredict);
router.post('/cm/:container_id/reset', proxyController.postConcreteMLReset);

module.exports = router;


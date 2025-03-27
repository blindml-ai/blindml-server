var express = require('express');
var router = express.Router();
var IndexController = require('../controllers/IndexController')
var indexController = new IndexController();

/* GET home page. */
router.get('/', indexController.getMain);
router.get('/openmodels', indexController.getOpenModels)
router.get('/health', (req, res) => {
    res.status(200).send('OK');
});

module.exports = router;


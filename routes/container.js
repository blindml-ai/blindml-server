var express = require('express');
var router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // 파일이 임시로 저장될 경로
const ContainerController = require('../controllers/ContainerController')
const containerController = new ContainerController();

router.get('/getusers', containerController.getUsersForAutoComplete);
router.get('/create', containerController.getCreate);
router.post('/create', upload.array('modelFiles'), containerController.postCreate);
router.post('/status', containerController.postStatus)
router.post('/subscribe', containerController.postSubscribe)
router.get('/detail/id=:container_id', containerController.getContainerDetail);
router.get('/edit/id=:container_id', containerController.getContainerEdit);
router.post('/start/id=:container_id', containerController.postStartContainer);
router.post('/stop/id=:container_id', containerController.postStopContainer);
router.post('/delete/id=:container_id', containerController.postRemoveContainer);

module.exports = router;


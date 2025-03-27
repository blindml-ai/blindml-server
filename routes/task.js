const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/TaskController');
const taskController = new TaskController();

router.get('/create', taskController.createTask);

module.exports = router;
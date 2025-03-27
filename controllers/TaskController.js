const connectRabbitMQ = require('../config/rabbitmq');

class TaskController {
    constructor() {

    }

    createTask = async (req, res) => {
        try {
            const {taskName, priority} = req.body;
            const {channel} = await connectRabbitMQ();

            const message = JSON.stringify({taskName, priority, createdAt: Date.now()});

            // 메시지 전송 (우선순위 포함)
            channel.sendToQueue("task-queue", Buffer.from(message), {persistent: true, priority});

            console.log(`Task sent to queue: ${message}`);
            res.json({success: true, message: "Task queued successfully"});
        } catch (error) {
            console.error("Error sending task to queue:", error);
            res.status(500).json({success: false, message: "Failed to queue task"});
        }
    }



};

module.exports = TaskController
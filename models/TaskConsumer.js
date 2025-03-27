const connectRabbitMQ = require('../config/rabbitmq');

// Task 처리 함수
async function processTask(task) {
    console.log(`✅ Processing task: ${task.taskName}`);
    return new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 대기 후 완료
}

// Consumer 실행
async function startConsumer() {
    const { channel } = await connectRabbitMQ();
    console.log("RabbitMQ Consumer waiting for tasks...");

    channel.consume("task-queue", async (msg) => {
        if (msg !== null) {
            const task = JSON.parse(msg.content.toString());

            try {
                await processTask(task);
                channel.ack(msg); // 메시지 정상 처리 후 삭제
                console.log(`✅ Task completed: ${task.taskName}`);
            } catch (error) {
                console.error(`❌ Task failed: ${error.message}`);
                channel.nack(msg, false, false); // 실패 시 메시지 재처리 안함 (DLQ 사용 가능)
            }
        }
    }, { noAck: false });
}

// Consumer 실행
startConsumer();

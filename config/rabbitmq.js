
const amqp = require('amqplib');

let connection = null;
let channel = null;
let connecting = null;

const connectRabbitMQ = async () => {
    if (connection && channel) {
        return { connection, channel };
    }

    if (connecting) {
        return connecting;
    }

    connecting = (async () => {
        const url = process.env.RABBITMQ_URL ||
            'amqp://guest:guest@localhost:5672';

        const newConnection = await amqp.connect(url);

        try {
            const newChannel = await newConnection.createChannel();

            await newChannel.assertQueue('task-queue', {
                durable: true,
                maxPriority: 10
            });

            connection = newConnection;
            channel = newChannel;

            connection.on('error', (err) => {
                console.error('RabbitMQ connection error:', err.message);
            });

            connection.on('close', () => {
                console.log('RabbitMQ connection closed');
                connection = null;
                channel = null;
            });

            channel.on('error', (err) => {
                console.error('RabbitMQ channel error:', err.message);
            });

            channel.on('close', () => {
                channel = null;
            });

            console.log('RabbitMQ connected successfully');

            return { connection, channel };
        } catch (error) {
            await newConnection.close().catch(() => {});
            throw error;
        }
    })();

    try {
        return await connecting;
    } catch (error) {
        console.error('RabbitMQ connection failed:', error.message);
        throw error;
    } finally {
        connecting = null;
    }
};

module.exports = connectRabbitMQ;


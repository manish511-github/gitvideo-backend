import { Kafka, Producer, Consumer, logLevel } from "kafkajs";
import { ENV } from "@/config/env";
import { logger } from "@/config/logger";
import { AppError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";

export class KafkaService {
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;
    private isProducerConnected: boolean = false;
    private isConsumerConnected: boolean = false;

    constructor() {
        // Use different brokers based on environment
        const brokers = ENV.NODE_ENV === 'development' 
            ? ENV.KAFKA_BROKERS_EXTERNAL.split(",") 
            : ENV.KAFKA_BROKERS.split(",");

        this.kafka = new Kafka({
            clientId: ENV.KAFKA_CLIENT_ID,
            brokers,
            logLevel: logLevel.ERROR, // Adjust log level as needed
            retry: {
                initialRetryTime: 300,
                retries: 8,
                maxRetryTime: 30000
            }
        });

        this.producer = this.kafka.producer({
            allowAutoTopicCreation: true,
            transactionTimeout: 30000
        });

        this.consumer = this.kafka.consumer({
            groupId: ENV.KAFKA_GROUP_ID,
            heartbeatInterval: 3000,
            sessionTimeout: 10000,
            maxBytesPerPartition: 1048576 // 1MB
        });
    }

    /**
     * Connects the Kafka Producer
     */
    async connectProducer(): Promise<void> {
        if (this.isProducerConnected) return;

        try {
            await this.producer.connect();
            this.isProducerConnected = true;
            logger.info({
                message: "Kafka Producer connected successfully",
                context: "KafkaService.connectProducer",
                brokers: this.kafka.brokers.map(b => b.host + ':' + b.port)
            });
        } catch (error) {
            this.isProducerConnected = false;
            logger.error({
                message: "Failed to connect Kafka Producer",
                context: "KafkaService.connectProducer",
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined
            });
            throw new AppError("Failed to connect Kafka Producer", 500, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Disconnects the Kafka Producer
     */
    async disconnectProducer(): Promise<void> {
        try {
            if (this.isProducerConnected) {
                await this.producer.disconnect();
                this.isProducerConnected = false;
                logger.info({
                    message: "Kafka Producer disconnected successfully",
                    context: "KafkaService.disconnectProducer"
                });
            }
        } catch (error) {
            logger.error({
                message: "Failed to disconnect Kafka Producer",
                context: "KafkaService.disconnectProducer",
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    }

    /**
     * Sends a message to a Kafka topic
     */
    async sendMessage(topic: string, messages: any): Promise<void> {
        try {
            if (!this.isProducerConnected) {
                await this.connectProducer();
            }

            await this.producer.send({
                topic,
                messages: [{
                    value: JSON.stringify(messages),
                    timestamp: Date.now().toString()
                }]
            });

            logger.debug({
                message: `Message sent to Kafka topic ${topic}`,
                context: "KafkaService.sendMessage",
                topic,
                messageSize: JSON.stringify(messages).length
            });
        } catch (error) {
            logger.error({
                message: `Failed to send message to Kafka topic ${topic}`,
                context: "KafkaService.sendMessage",
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
                topic
            });
            throw new AppError("Failed to send Kafka message", 500, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Starts consuming messages from a Kafka topic
     */
    async consumeMessages(topic: string, callback: (message: any) => Promise<void>): Promise<void> {
        try {
            if (!this.isConsumerConnected) {
                await this.consumer.connect();
                this.isConsumerConnected = true;
            }

            await this.consumer.subscribe({ topic, fromBeginning: true });

            await this.consumer.run({
                autoCommit: true,
                autoCommitInterval: 5000,
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        if (message.value) {
                            const parsedMessage = JSON.parse(message.value.toString());
                            await callback(parsedMessage);
                            logger.debug({
                                message: `Message processed from topic ${topic}`,
                                context: "KafkaService.consumeMessages",
                                topic,
                                partition,
                                offset: message.offset,
                                messageSize: message.value.length
                            });
                        }
                    } catch (error) {
                        logger.error({
                            message: `Error processing Kafka message from topic ${topic}`,
                            context: "KafkaService.consumeMessages",
                            error: error instanceof Error ? error.message : "Unknown error",
                            stack: error instanceof Error ? error.stack : undefined,
                            topic,
                            partition,
                            offset: message.offset
                        });
                    }
                }
            });

            logger.info({
                message: `Kafka Consumer subscribed to topic ${topic}`,
                context: "KafkaService.consumeMessages",
                topic
            });
        } catch (error) {
            this.isConsumerConnected = false;
            logger.error({
                message: `Failed to consume messages from Kafka topic ${topic}`,
                context: "KafkaService.consumeMessages",
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
                topic
            });
            throw new AppError("Failed to consume Kafka message", 500, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Disconnects the Kafka Consumer
     */
    async disconnectConsumer(): Promise<void> {
        try {
            if (this.isConsumerConnected) {
                await this.consumer.disconnect();
                this.isConsumerConnected = false;
                logger.info({
                    message: "Kafka Consumer disconnected successfully",
                    context: "KafkaService.disconnectConsumer"
                });
            }
        } catch (error) {
            logger.error({
                message: "Failed to disconnect Kafka Consumer",
                context: "KafkaService.disconnectConsumer",
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        await this.disconnectProducer();
        await this.disconnectConsumer();
    }
}
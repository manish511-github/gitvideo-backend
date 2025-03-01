import { Kafka, Producer, Consumer } from "kafkajs";
import { ENV } from "@/config/env";
import { logger } from "@/config/logger";
import { AppError } from "@/utils/appError";
import { ErrorCode } from "@/utils/errorCodes";

export class KafkaService {
    private kafka : Kafka;
    private producer : Producer;
    private consumer : Consumer;
    constructor () {
        this.kafka = new Kafka({
            clientId : ENV.KAFKA_CLIENT_ID,
            brokers : ENV.KAFKA_BROKERS.split(","),
            
        });
        this.producer = this.kafka.producer();
        this.consumer = this.kafka.consumer({groupId: ENV.KAFKA_GROUP_ID})

    }
    /**
     * Connects the Kafka Producer
     */
    async connectProducer(): Promise<void> {
        try {
            await this.producer.connect();
            logger.info({
                message: "Kafka Producer connected sucessfully",
                context: "KafkaService.connectProducer",

            });
        } catch (error) {
            logger.error({
                message: "Failed to connect Kafka",
                context: "KafkaService.connectProducer",
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw new AppError("Failed to connect Kafka Producer", 500, ErrorCode.INTERNAL_SERVER_ERROR);
        }

    }
    /**
     * Sends a message to a Kafka topic
     */
    async sendMessage(topic: string, messages: any): Promise<void> {

        try {
            await this.producer.connect()
            await this.producer.send({
                topic,
                messages : [{value: JSON.stringify(messages)}]
            })
            
            logger.info({
                message: `Message sent to Kafka topic ${topic}`,
                context: "KafkaService.sendMessage",
                data: messages,
            });
        } catch (error) {
            logger.error({
                message: `Failed to send message to Kafka topic ${topic}`,
                context: "KafkaService.sendMessage",
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw new AppError("Failed to send Kafka message", 500, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

     /**
     * Starts consuming messages from a Kafka topic
     */
    async consumeMessages(topic: string, callback: (message: any) => void): Promise<void> {
        try{
            await this.consumer.connect();
            await this.consumer.subscribe({ topic, fromBeginning: true});
            await this.consumer.run({
                eachMessage: async ({message}) => {
                    if (message.value) {
                        const parsedMessage = JSON.parse(message.value.toString());
                        callback(parsedMessage);
                        logger.info({
                            message: `Message consumed from Kafka topic ${topic}`,
                            context: "KafkaService.consumeMessages",
                            data: parsedMessage,
                        });
                    }
                }
            })
            logger.info({
                message: `Kafka Consumer subscribed to topic ${topic}`,
                context: "KafkaService.consumeMessages",
            });

        } catch (error) {
            logger.error({
                message: `Failed to consume messages from Kafka topic ${topic}`,
                context: "KafkaService.consumeMessages",
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw new AppError("Failed to consume Kafka message", 500, ErrorCode.INTERNAL_SERVER_ERROR);
            
        }

    }

    
}
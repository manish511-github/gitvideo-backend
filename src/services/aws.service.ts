import AWS from 'aws-sdk';
import { PrismaClient } from "@prisma/client";
import { ENV } from "@/config/env";
import { AppError } from "@/utils/appError";
import { logger } from "@/config/logger";
import { ErrorCode } from "@/utils/errorCodes";
import { timeStamp } from 'console';


export class AwsService {
    private s3: AWS.S3;
    private sqs: AWS.SQS;
    
    constructor() {
        this.s3 = new AWS.S3({
        endpoint: process.env.AWS_S3_ENDPOINT || 'http://localhost:4566', // LocalStack S3 endpoint for local dev
        s3ForcePathStyle: true,
        accessKeyId: ENV.AWS_ACCESS_KEY_ID,
        secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
        });

        this.sqs = new AWS.SQS({
            endpoint : process.env.AWS_SQS_ENDPOINT || 'http://localhost:4566',
            region: ENV.AWS_REGION,
            accessKeyId: ENV.AWS_ACCESS_KEY_ID,
            secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
        })
    }
    async generatePresignedUrl(fileName: string, fileType: string): Promise<string> {
        try {
            const params = {
                Bucket: ENV.AWS_BUCKET_NAME,
                Key: fileName,
                ContentType: fileType,
                Expires: 60 * 60 * 24 * 365 * 10,
            };
            const uploadUrl = await this.s3.getSignedUrlPromise("putObject", params);
            logger.info({
                message: "Presigned URL generated successfully",
                context: "AwsService.generatePresignedUrl",
            });
            return uploadUrl;
        } catch (error) {
            logger.error({
                message: "Failed to generate presigned URL",
                context: "AwsService.generatePresignedUrl",
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw new AppError("Failed to generate presigned URL", 500, ErrorCode.INTERNAL_SERVER_ERROR);
        }
    
  
    }
    async sendUploadNotification(event : string, fileName: string, fileType: string, commitId: string) :Promise<void>{
        try {
            const messageBody = JSON.stringify({
                event,
                fileName,
                fileType,
                commitId,
                timestamp: new Date().toISOString(),
            });

            const params : AWS.SQS.SendMessageRequest = {
                QueueUrl: ENV.AWS_SQS_QUEUE_URL,
                MessageBody :messageBody
            }
            await this.sqs.sendMessage(params).promise()
            logger.info({
                message: "Notification sent to SQS",
                context: "S3Service.sendUploadNotification",
                details: { event, fileName, fileType },
            })

        }catch (error)
        {
            logger.error({
                message: "Failed to send SQS notification",
                context: "S3Service.sendUploadNotification",
                error: error instanceof Error ? error.message : "Unknown error",
            })
        }
    }
}
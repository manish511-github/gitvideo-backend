import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { ApiResponse } from "@/utils/apiResponse";
import { AppError } from '@/utils/appError';
import { Request, Response } from 'express';
import { redisService } from '@/services/redis.service';
import { logger } from '@/config/logger';
import { KafkaService } from '@/services/kafka.service';

interface CommitMetadataMessage {
    commitId: string;
    metaData: any;
    video_id?: string; // Optional, might be useful for logging or further processing
    status?: string;
    timestamp?: string;
}

export class MetadataController {
    constructor(
        private kafkaService: KafkaService = new KafkaService(),
    ) {
        this.initializeKafkaListener().catch(error => {
            logger.error('Failed to initialize Kafka Listener for Metadata:', error);
        });
    }

    saveCommitMetadata = async (req: Request, res: Response): Promise<void> => {
        try {
            const { commitId, metaData } = req.body;

            if (!commitId || !metaData) {
                throw new AppError("commitId and metaData are required", 400);
            }

            const existingCommit = await prisma.commit.findUnique({
                where: { commitId: commitId },
            });

            if (!existingCommit) {
                throw new AppError(`Commit with ID ${commitId} not found`, 404);
            }

            const createdMetadata = await prisma.commitMetaData.create({
                data: {
                    commitId: existingCommit.id,
                    metaData: metaData,
                },
            });

            ApiResponse.success(res, "Commit Metadata Saved Successfully", createdMetadata);

        } catch (error) {
            handleError(res, error);
        }
    };

    /**
     * Fetch metadata for a specific commit ID
     */
    getCommitMetadata = async (req: Request, res: Response): Promise<void> => {
        try {
            const { commitId } = req.params;

            if (!commitId) {
                throw new AppError("commitId is required", 400);
            }

            const cachedMetadata = await redisService.get(`commit:metadata:${commitId}`);

            if (cachedMetadata) {
                logger.info(`Fetched metadata for commit ${commitId} from cache`);
                ApiResponse.success(res, "Commit Metadata Fetched Successfully", JSON.parse(cachedMetadata));
                return;
            }

            const commitMetadata = await prisma.commitMetaData.findUnique({
                where: { commitId: Number(commitId) },
                include: {
                    commit: true, // Optionally include commit details
                },
            });

            if (!commitMetadata) {
                ApiResponse.error(res, `Metadata not found for commit ID ${commitId}`, 404);
                return;
            }

            await redisService.set(`commit:metadata:${commitId}`, JSON.stringify(commitMetadata));
            ApiResponse.success(res, "Commit Metadata Fetched Successfully", commitMetadata);

        } catch (error) {
            handleError(res, error);
        }
    };

    async initializeKafkaListener(): Promise<void> {
        try {
            await this.kafkaService.consumeMessages("video.metadata.results", async (message: any) => {
                try {
                    logger.info(`[KafkaListener - video.metadata.results] Received message:`, message);

                    const commitMetadataMessage: CommitMetadataMessage = message;
                    const { commitId, metaData } = commitMetadataMessage;
                    debugger
                    if (commitId && metaData) {
                        const existingCommit = await prisma.commit.findUnique({
                            where: { commitId: commitId },
                        });

                        if (existingCommit) {
                            const existingCommitMetadata = await prisma.commitMetaData.findUnique({
                                where: { commitId: existingCommit.id },
                            });

                            if (existingCommitMetadata) {
                                // Update existing metadata
                                const updatedMetadata = await prisma.commitMetaData.update({
                                    where: { commitId: existingCommit.id },
                                    data: { metaData: metaData },
                                });
                                logger.info(`[KafkaListener - video.metadata.results] Metadata updated for commit: ${commitId}`, updatedMetadata);
                            } else {
                                // Create new metadata
                                const createdMetadata = await prisma.commitMetaData.create({
                                    data: {
                                        commitId: existingCommit.id,
                                        metaData: metaData,
                                    },
                                });
                                logger.info(`[KafkaListener - video.metadata.results] Metadata saved for commit: ${commitId}`, createdMetadata);
                            }
                        } else {
                            logger.warn(`[KafkaListener - video.metadata.results] Commit with ID ${commitId} not found, cannot save metadata.`);
                        }
                    } else {
                        logger.warn('[KafkaListener - video.metadata.results] Received incomplete commit metadata message.');
                    }
                } catch (error) {
                    logger.error('[KafkaListener - video.metadata.results] Error processing Kafka message:', error);
                }
            });
            logger.info('Kafka consumer for commit metadata started successfully');

        } catch (error) {
            logger.error('Failed to initialize Kafka listener for commit metadata:', error);
            throw error;
        }
    }
}

function handleError(res: Response, error: any) {
    if (error instanceof AppError) {
        ApiResponse.error(res, error.message, error.statusCode);
    } else {
        ApiResponse.error(res, "Internal server error", 500, error);
    }
}
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { ApiResponse } from "@/utils/apiResponse";
import { AppError } from '@/utils/appError';
import { AwsService } from '@/services/aws.service'; 
import { ErrorHandler } from "@/utils/errorHandler";
import { uploadFile } from './upload.controller';
import { Request, Response } from 'express';
import { int } from 'aws-sdk/clients/datapipeline';
import { v4 as uuidv4 } from 'uuid';
import { connect } from 'http2';
import { CommitService } from '@/services/commit.service';
import {redisService} from '@/services/redis.service';
import {logger} from '@/config/logger'
import { KafkaService } from '@/services/kafka.service';
import { float } from 'aws-sdk/clients/cloudfront';

interface VideoProcessedMessage {
    commit_id : string,
    playlist : string
}
export class CommitController{
    constructor(
        private commitService: CommitService,
        private kafkaService: KafkaService = new KafkaService() // Default instance

    ) {
        this.initializeKafkaListener().catch(error =>{
            logger.error('Failed to intialize Kafka Listener:',error)
        })
    }
    createCommit = async (req : Request, res: Response) :Promise<void> =>{
        try {
            const {videoId, branchId, description, changes} = req.body;
            // Fetch the latest commit
            const latestCommit = await prisma.commit.findFirst({
                where: {videoId},
                orderBy: {createdAt: 'desc'},
            });

            //Create a new Commit
            const commitData: any = {
                  commitId: `c-${Date.now()}`,
                  description,
                  changes,
                  branch: { connect: { id: branchId } },
                  video: { connect: { id: videoId } },
                  parentCommit: latestCommit ? { connect: { id: latestCommit.id } } : undefined,

                }


              const commit = await prisma.commit.create({
                data: commitData,
              })
              await this.commitService.sendCommitCreated(commit);

              ApiResponse.success(res, "Commit Created Sucessfully",commit);

        } catch (error) {
            handleError(res,error)

            
        }
    }
    /**
     * Fetch a specific commit by ID
     */
    getCommit = async (req : Request, res: Response) : Promise<void> => {
        
        try {
            const {id} = req.params;
            const cachedCommit = await redisService.get(`commit:${id}`);

            //Check Redis cache first
            if (cachedCommit) {
                logger.info("Fethced from cache")
                ApiResponse.success(res,"Commit Fetched Successfully ",JSON.parse(cachedCommit))
                return;
            }

            //Fetch from database
            const commit = await prisma.commit.findUnique({ where : {id: Number(id) } } )
            if (!commit) {
                ApiResponse.error(res, "Commit not found", 404);
            }
            
            await redisService.set(`commit:${id}`,commit);
            ApiResponse.success(res,"Commit Fetched Sucessfuly",commit)
        } catch (error) {
            handleError(res,error)

        }
    }

    updatePlaylistUrl = async (commitId: string, playlistUrl: string, duration: float): Promise<void> => {
        logger.info(`[updatePlaylistUrl] Request received`, { commitId, playlistUrl });
        try {
            if (!commitId || !playlistUrl) {
                logger.warn(`[updatePlaylistUrl] Missing required fields`, { commitId, playlistUrl });
                throw new AppError("commitId and playlistUrl are required", 400);
            }

            await prisma.commit.update({
                where: { commitId },
                data: { playlistUrl: playlistUrl,
                        duration: duration
                 },
            });
            
            logger.info(`[updatePlaylistUrl] Playlist URL updated successfully`, { commitId, playlistUrl });
        } catch (error: any) {
            logger.error(`[updatePlaylistUrl] Error updating playlist URL`, {
                message: error.message,
                stack: error.stack,
                commitId,
                playlistUrl,
            });
            throw error;
        }
    };

    async initializeKafkaListener(): Promise<void>{
        try {
            await this.kafkaService.consumeMessages("video.processed", async (message) =>{
                try {

                    await this.updatePlaylistUrl(message.commit_id, message.playlist_url, message.duration);
                }catch(error)
                {
                    logger.error(`Error processing Kafka message:`, error);
                }
            },"commit-group")
            logger.info('Kafka consumer started successfully');

        }catch(error){
            logger.error('Failed to initialize Kafka listener:', error);
            throw error;
        }
    }
}


function handleError(res: Response, error: any) {
    if (error instanceof AppError) {
      ApiResponse.error(res, error.message, error.statusCode);
    } else {
      ApiResponse.error(res, "Internal server error");
    }
  }
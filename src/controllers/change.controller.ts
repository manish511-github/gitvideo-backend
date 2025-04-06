import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { ApiResponse } from "@/utils/apiResponse";
import { AwsService } from '@/services/aws.service'; 
import { ENV } from "@/config/env";
import { AppError } from '@/utils/appError';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/config/logger';
import Queue from 'bull';

const changeQueue = new Queue('video-changes', {
  redis: { host: 'localhost', port: 6379, password: ENV.REDIS_PASSWORD }
});

const awsService = new AwsService();

interface SegmentData {
  videoId: number;
  sourceVideoId: number;
  sourceStartTime: number;
  sourceEndTime: number;
  globalStartTime: number;
}


export class ChangeController {
  /**
   * Add a change
  */
  async addChange(req: Request, res: Response): Promise<void> {
    logger.info("Entering addChange method");
    try {
      logger.info("inside add chage")
      const { videoId, operation, sourceVideoId, start, end, at } = req.body;
      logger.info(req.body)
      if (!videoId || !operation || (operation === 'insert' && !sourceVideoId)) {
        throw new AppError("Missing required fields", 400);

      }

      // upload the other video
 
      logger.info(`Fetching video with ID: ${videoId}`);
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: { timeline: true }
      });


      if (!video) {
        throw new AppError("Video not found", 404);
      }
      // find latest change of video 
      const latestChange = await prisma.change.findFirst({
        where: { videoId },
        orderBy: { createdAt: 'desc' }
      })

      const changeId = uuidv4();
      const change = {
        changeId,
        videoId,
        operation,
        sourceVideoId: operation === 'insert' || operation === 'update' || operation === 'merge' ? sourceVideoId : null,
        start: parseFloat(start) || 0.0,
        end: parseFloat(end) || 0.0,
        at: parseFloat(at) || 0.0,

      };

      // Queue change processing
      logger.info(`Queuing change processing with ID: ${changeId}`);

      const job = await changeQueue.add({
        changeId,
        videoId,
        operation,
        sourceVideoId: change.sourceVideoId,
        start: change.start,
        end: change.end,
        at: change.at,
        currentTimeline: video.timeline

      })

      logger.info(`Waiting for queue job (ID: ${job.id}) to finish...`);
      const result = await job.finished();
      logger.info(`Queue job completed with result: ${JSON.stringify(result)}`);
      if (result.error) {
        throw new AppError(result.error, 500)
      }

      const segments: SegmentData[] = result.timeline.map(seg => ({
        videoId: videoId,
        sourceVideoId: seg.sourceVideoId,
        sourceStartTime: seg.sourceStartTime,
        sourceEndTime: seg.sourceEndTime,
        globalStartTime: seg.globalStartTime,
      }))

      logger.info(`Applying database transaction for video ID: ${videoId}`);
      await prisma.$transaction([
        prisma.segment.deleteMany({ where: { videoId: videoId } }),
        prisma.segment.createMany({ data: segments }),
        prisma.change.create({ data: change }),
        prisma.changeTimeline.create({
          data: {
            changeId: changeId,
            chTimeline: result.timeline,
            parentchangeId: latestChange?.changeId
          }
        })
      ])
      logger.info(`Change successfully applied for video ID: ${videoId}`);
      ApiResponse.success(res, "Change applied successfully", result.timeline)


    } catch (error) {

    }
  }
  async revertChange(req: Request, res: Response): Promise<void> {
    try {
      const { changeId } = req.body;
      const currentChange = await prisma.changeTimeline.delete({
        where : {changeId : changeId},
        select: {parentchangeId : true}
      });
      
      if (currentChange.parentchangeId)
      {
        const  newTimeline = await prisma.changeTimeline.findUnique({
          where : {changeId : currentChange.parentchangeId },
          select : {chTimeline : true}
        })
        ApiResponse.success(res, "Revert applied successfully", newTimeline?.chTimeline)

      }
      ApiResponse.success(res, "Revert applied successfully", {})

    } catch (error) {

    }
  }

}
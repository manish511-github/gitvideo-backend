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
import { trackSynchronousPlatformIOAccessInDev } from 'next/dist/server/app-render/dynamic-rendering';



export class NotificationController {
    constructor(private awsService: AwsService) {}

sqsNotification = async (req: Request, res: Response): Promise<void> => {
    try { 
        const {event, filename, filetype} =req.body;

        if (!event || !filename || !filetype) {
            res.status(400).json({ error: 'Missing filename or filetype' });
            return;
          }
        await this.awsService.sendUploadNotification(event, filename, filetype)

        ApiResponse.success(res, "Video Processing Initiated", filename);    
    }
    catch(error){
        handleError(res, error);
    }
};
}
function handleError(res: Response, error: any) {
    if (error instanceof AppError) {
      ApiResponse.error(res, error.message, error.statusCode);
    } else {
      ApiResponse.error(res, "Internal server error");
    }
  }
  
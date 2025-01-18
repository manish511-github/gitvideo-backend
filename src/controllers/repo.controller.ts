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



export class RepoController {
    constructor(private awsService: AwsService) {}

createRepo = async (req: Request, res: Response): Promise<void> => {
const { name, description, thumbnail, authorId,fileName,fileType } = req.body;
  try {
    const repo = await prisma.repository.create({
      data: {
        name,
        description,
        authorId: authorId,
        status: "Created",
        thumbnail: thumbnail,
        duration : '0',
        commits: 0,
        createdAt: new Date(),
      },
    });
   const dbranch =  await prisma.branch.create({
        data : {
            name :'main',
            repositoryId : repo.id,
        },
    })

    const videoUploadUrl = await this.awsService.generatePresignedUrl(fileName, fileType);
    const VideoMetaData = await prisma.video.create({
        data: {
            title : repo.name,
            description : repo.description,
            repositoryId: repo.id,
            fileName,
            uploadUrl: videoUploadUrl,
            version : 'v1',
            createdAt: new Date(),
        },
    })

    await prisma.commit.create({
        data: {
            commitId: uuidv4(),
            description: 'Initial video upload',
            changes:{},
            branch : {
                connect : {
                    id : dbranch.id,
                },
            },
            video : {
                connect : {
                    id : VideoMetaData.id,
                },
    
            },
            createdAt : new Date(),
        }
    });
    
    ApiResponse.success(res, "Repo created successfully", repo);
  } catch (error) {
    handleError(res, error);

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

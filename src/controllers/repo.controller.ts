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
import { logger } from "@/config/logger";



export class RepoController {
    constructor(private awsService: AwsService) {}

    createRepo = async (req: Request, res: Response): Promise<void> => {
      const { name, description, thumbnail, authorId, fileName, fileType } = req.body;
    
      logger.info(`[createRepo] Request received`, {
        body: { name, description, thumbnail, authorId, fileName, fileType }
      });
    
      try {
        const repo = await prisma.repository.create({
          data: {
            name,
            description,
            authorId: authorId,
            status: "Added",
            thumbnail: thumbnail,
            duration: '0',
            commits: 0,
            createdAt: new Date(),
          },
        });
        logger.info(`[createRepo] Repository created`, { repoId: repo.id });
    
        const dbranch = await prisma.branch.create({
          data: {
            name: 'main',
            repositoryId: repo.id,
          },
        });
        logger.info(`[createRepo] Branch 'main' created`, { branchId: dbranch.id });
    
        const videoUploadUrl = await this.awsService.generatePresignedUrl(fileName, fileType);
        logger.info(`[createRepo] Pre-signed URL generated`, { videoUploadUrl });
    
        const VideoMetaData = await prisma.video.create({
          data: {
            title: repo.name,
            description: repo.description,
            repositoryId: repo.id,
            fileName,
            uploadUrl: videoUploadUrl,
            version: 'v1',
            createdAt: new Date(),
          },
        });
        logger.info(`[createRepo] Video metadata created`, { videoId: VideoMetaData.id });
    
        const repocommit = await prisma.commit.create({
          data: {
            commitId: uuidv4(),
            description: 'Initial video upload',
            changes: {timeline: [
              {"repo": `${repo.name}`, "branch": "main", "start": 6, "end": 20},
            ]},
            branch: {
              connect: {
                id: dbranch.id,
              },
            },
            video: {
              connect: {
                id: VideoMetaData.id,
              },
            },
            createdAt: new Date(),
          }
        });
        logger.info(`[createRepo] Initial commit created`);
        (repo as any).repocommit = repocommit;    
        ApiResponse.success(res, "Repo created successfully", { repo, uploadUrl: videoUploadUrl });
      } catch (error) {
        logger.error(`[createRepo] Error creating repo`, {
          message: error.message,
          stack: error.stack,
          data: { name, fileName, authorId }
        });
    
        handleError(res, error);
      }
    };

getallRepos = async (req: Request, res: Response): Promise<void> => {
    try{
        const repos = await prisma.repository.findMany({
            include: {
              branches: {
                include: {
                  commits: true,  // Include commits within each branch
                },
              },
              videos: true, // Include associated videos
            },
          });
          ApiResponse.success(res, "All repositories fetched successfully", repos);
    }
    catch (error){
        handleError(res, error);

    }

}

getRepoById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
  
    try {
      // Check if ID is provided and valid
      if (!id) {
        throw new AppError("Repository ID is required", 400);
      }
  
      // Fetch repository by ID along with related branches and videos
      const repo = await prisma.repository.findUnique({
        where: { id: Number(id) },
        include: {
          branches: {
            include: {
              commits: true,  // Include commits within each branch
            },
          },
          videos: true,  // Include associated videos
        },
      });
  
      if (!repo) {
        throw new AppError("Repository not found", 404);
      }
  
      ApiResponse.success(res, "Repository fetched successfully", repo);
    } catch (error) {
      handleError(res, error);
    }
  };

  updateRepoStatus = async (req: Request, res: Response): Promise <void> =>{
    const {id} = req.params;
    try {
      if (!id)
      {       
         throw new AppError("Repository ID is required", 400);
      }
    const updateVideo = await prisma.repository.update({
      where: { id: Number(id)},
      data: {
        status : "Created"
      }
    })
    ApiResponse.success(res,"Repository Activated",updateVideo)
    } catch (error)
    {
      handleError(res,error)
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

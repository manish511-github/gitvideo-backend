import { PrismaClient } from '@prisma/client';
import AWS from 'aws-sdk';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Configure AWS S3
const s3 = new AWS.S3({
  endpoint: process.env.AWS_S3_ENDPOINT || 'http://localhost:4566', // LocalStack S3 endpoint for local dev
  s3ForcePathStyle: true,
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Upload Controller Function
export const uploadFile = async (req, res) => {
    if (req.method == 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

  try {
    const { fileName, fileType, title, description } = req.body;

    // Validate input
    if (!fileName || !fileType || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Step 1: Generate Presigned URL
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME, // Use environment variable for bucket name
      Key: fileName,
      ContentType: fileType,
      Expires: 60 * 60 * 24 * 365 * 10, // URL expiration time in seconds
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    
    const saveVideo = await prisma.video.create({
      data :{
       title,
        description,
        fileName,
        version: 'v1',
        createdAt: new Date(),
        uploadUrl,
      }
    })

    // Step 2: Save Metadata in Database
    const VideoRepository = await prisma.repository.upsert({
      where: { name: fileName },
      update: {
        description,
        authorId: 1,
      },
      create: {
        name: fileName,
        description,
        authorId: 1,
        status: "In Progress",
        thumbnail: "",
        duration: "0s",
        commits: 0,
        createdAt: new Date(),
        videos: {
          connect: { id: saveVideo.id },
        },
        branches: {
          create: {
            name: "main", // 👈 default initial branch
          },
        },
      },
    })

    // Respond with the presigned URL and video metadata
    return res.status(200).json({ uploadUrl, saveVideo });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
};




export const getVideos = async (req, res) => {
    try {
      const videos = await prisma.video.findMany();
      return res.status(200).json(videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      return res.status(500).json({ error: 'Failed to fetch videos' });
    }
  }

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

    // Step 2: Save Metadata in Database
    const VideoRepository = await prisma.VideoRepository.upsert({
      where: { fileName }, // Assuming fileName is unique
      update: {
        title,
        description,
        tags,
        version: 'v1',
        createdAt: new Date(),
        uploadUrl,
      },
      create: {
        title,
        description,
        tags,
        fileName,
        version: 'v1',
        createdAt: new Date(),
        uploadUrl,
      },
    });

    // Respond with the presigned URL and video metadata
    return res.status(200).json({ uploadUrl, video });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
};


export const hello = async (req, res) => {
    if (req.method === 'GET') {
        return res.status(200).json({ message: 'Hello from Express.js!' });
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
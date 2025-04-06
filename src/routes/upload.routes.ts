import { Router } from "express";
import { uploadFile, getVideos } from './../controllers/upload.controller';

const router = Router();

// Define the upload route
router.post('/upload', uploadFile);

router.get('/videolist',getVideos)

export default router;
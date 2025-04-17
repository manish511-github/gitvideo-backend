import { Router } from "express";
import { CommitController } from "../controllers/commit.controller";
import { CommitService } from "@/services/commit.service";
import { validateRequest } from "@/middleware/validateRequest";
import {createcommitSchema} from "@/validators/commit.validator";
const router = Router();
const commitService = new CommitService();
const commitController = new CommitController(commitService);
// Define the upload route
router.post('/createcommit', validateRequest(createcommitSchema),commitController.createCommit);
router.get('/commit/:id', commitController.getCommit);

export default router;
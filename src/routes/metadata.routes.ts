import { Router } from "express";
import { MetadataController } from "../controllers/metadata.controller";
import { validateRequest } from "@/middleware/validateRequest";
const router = Router();
// const commitService = new CommitService();
const metadataController = new MetadataController();

router.get('/commit-metadata/:commitId', metadataController.getCommitMetadata);


export default router;
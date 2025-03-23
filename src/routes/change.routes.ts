import { Router } from "express";
import { ChangeController } from "../controllers/change.controller";
import { validateRequest } from "@/middleware/validateRequest";
import {createcommitSchema} from "@/validators/commit.validator";
const router = Router();
// const commitService = new CommitService();
const changeController = new ChangeController();

router.post('/addchange', changeController.addChange);

export default router;
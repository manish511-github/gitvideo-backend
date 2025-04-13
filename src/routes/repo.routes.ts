import { Router } from "express";
import { RepoController } from "../controllers/repo.controller";
import { AwsService } from "@/services/aws.service";
const router = Router();
const AwsServiceInstance = new AwsService();
const repoController = new RepoController(AwsServiceInstance);
// Define the upload route
router.post('/createRepo', repoController.createRepo);
router.get('/repos',repoController.getallRepos);
router.get('/repos/:id',repoController.getRepoById)
router.post('/updaterepostatus/:id',repoController.updateRepoStatus)
export default router;
import { Router } from "express";
import { NotificationController } from "../controllers/notifications.controller";
import { AwsService } from "@/services/aws.service";
const router = Router();
const AwsServiceInstance = new AwsService();
const notificationController = new NotificationController(AwsServiceInstance);
// Define the upload route
router.post('/videoupload', notificationController.sqsNotification);
export default router;
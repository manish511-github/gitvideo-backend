import { KafkaService } from "./kafka.service";
import { logger } from "@/config/logger";

export class CommitService {
    private kafkaService: KafkaService;

    constructor() {
        this.kafkaService = new KafkaService();
    }

    async sendCommitCreated(commitData: any): Promise<void> {
        await this.kafkaService.sendMessage("commit.created", commitData);
    }

    async listenForCommits() {
        await this.kafkaService.consumeMessages("commit.created", async (message) => {
            logger.info({ message: "Processing commit event", context: "CommitService.listenForCommits", data: message });

            // Commit processing logic here
        });
    }
}
import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z
    .string()
    .transform(Number)
    .refine((n) => n >= 1024 && n <= 65535, {
      message: "Port must be between 1024 and 65535",
    }),
  NODE_ENV: z.enum(["development", "production", "test"]),
  JWT_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().regex(/^\d+[smhd]$/),
  REFRESH_TOKEN_EXPIRY: z.string().regex(/^\d+[smhd]$/),
  FRONTEND_URL: z.string().url(),
  SMTP_HOST: process.env.NODE_ENV === "development" ? z.string().optional() : z.string(),
  SMTP_PORT: process.env.NODE_ENV === "development" ? z.string().transform(Number).optional() : z.string().transform(Number),
  SMTP_USER: process.env.NODE_ENV === "development" ? z.string().optional() : z.string(),
  SMTP_PASSWORD: process.env.NODE_ENV === "development" ? z.string().optional() : z.string(),
  SMTP_FROM: process.env.NODE_ENV === "development" ? z.string().email().optional() : z.string().email(),
  APP_NAME: process.env.NODE_ENV === "development" ? z.string().optional().default("GIT VIDEO") : z.string(),
  SERVER_URL: z.string().url(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SQS_QUEUE_URL: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_BUCKET_NAME: z.string(),
  KAFKA_CLIENT_ID: z.string(),
  KAFKA_BROKERS: z.string(),
  KAFKA_BROKERS_EXTERNAL : z.string(),
  KAFKA_GROUP_ID:z.string(),
  REDIS_HOST:z.string(),
  REDIS_PORT:z.string(),
  REDIS_PASSWORD:z.string()
});

export const ENV = envSchema.parse(process.env);

// Add validation for production environment
if (process.env.NODE_ENV === 'production') {
  const requiredFields = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD'
  ];
  
  // requiredFields.forEach(field => {
  //   if (!process.env[field]) {
  //     throw new Error(`Missing required env variable: ${field}`);
  //   }
  // });
}

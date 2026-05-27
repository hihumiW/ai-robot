export interface AppConfig {
  port: number;
  lmStudioBaseUrl: string;
  lmStudioModel: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbConnectionLimit: number;
}

export const config: AppConfig = {
  port: Number(process.env.PORT ?? 3001),
  lmStudioBaseUrl: process.env.LM_STUDIO_BASE_URL ?? "http://127.0.0.1:1234",
  lmStudioModel: process.env.LM_STUDIO_MODEL ?? "google/gemma-4-e4b",
  dbHost: process.env.DB_HOST ?? "127.0.0.1",
  dbPort: Number(process.env.DB_PORT ?? 3306),
  dbUser: process.env.DB_USER ?? "root",
  dbPassword: process.env.DB_PASSWORD ?? "admin@123",
  dbName: process.env.DB_NAME ?? "ai_bot",
  dbConnectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
};

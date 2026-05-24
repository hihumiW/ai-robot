export interface AppConfig {
  port: number;
  lmStudioBaseUrl: string;
  lmStudioModel: string;
}

export const config: AppConfig = {
  port: Number(process.env.PORT ?? 3001),
  lmStudioBaseUrl: process.env.LM_STUDIO_BASE_URL ?? "http://127.0.0.1:1234",
  lmStudioModel: process.env.LM_STUDIO_MODEL ?? "google/gemma-4-e4b",
};

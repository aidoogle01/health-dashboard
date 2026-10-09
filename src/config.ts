import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const minutes = (fallback: number) => z.coerce.number().positive().default(fallback);

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3100),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),
  DATA_DIR: z.string().default('./data'),

  // Protects the dashboard with HTTP basic auth (username: anything, password: this).
  DASHBOARD_PASSWORD: z.string().optional(),
  // Days of history fetched on startup.
  BACKFILL_DAYS: z.coerce.number().int().min(1).max(365).default(90),
  // Days re-fetched on every scheduled sync (late-arriving data, e.g. last night's sleep).
  RESYNC_DAYS: z.coerce.number().int().min(1).max(14).default(3),
  // Fill unconfigured sources with generated sample data.
  DEMO_MODE: bool,

  // Oura — personal access token or OAuth2 access token.
  OURA_ACCESS_TOKEN: z.string().optional(),
  OURA_CLIENT_ID: z.string().optional(),
  OURA_CLIENT_SECRET: z.string().optional(),
  OURA_REFRESH_TOKEN: z.string().optional(),
  OURA_SYNC_MINUTES: minutes(30),

  // Garmin Connect — account login (unofficial API).
  GARMIN_EMAIL: z.string().optional(),
  GARMIN_PASSWORD: z.string().optional(),
  GARMIN_DOMAIN: z.enum(['garmin.com', 'garmin.cn']).default('garmin.com'),
  GARMIN_SYNC_MINUTES: minutes(15),

  // MyFitnessPal — username plus browser session cookie (no public API exists).
  MFP_USERNAME: z.string().optional(),
  MFP_COOKIE: z.string().optional(),
  MFP_SYNC_MINUTES: minutes(10),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return EnvSchema.parse(env);
}

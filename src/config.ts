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

  // Public address of the dashboard, e.g. https://health.example.up.railway.app (for the Oura sign-in redirect).
  PUBLIC_URL: z.string().url().optional(),

  // Oura — OAuth app credentials from cloud.ouraring.com/oauth/applications (personal tokens were retired end of 2025).
  OURA_ACCESS_TOKEN: z.string().optional(),
  OURA_CLIENT_ID: z.string().optional(),
  OURA_CLIENT_SECRET: z.string().optional(),
  OURA_REFRESH_TOKEN: z.string().optional(),
  OURA_SYNC_MINUTES: minutes(30),

  // Garmin Connect — optional; connecting from the dashboard is preferred (supports two-step codes).
  GARMIN_EMAIL: z.string().optional(),
  GARMIN_PASSWORD: z.string().optional(),
  GARMIN_SYNC_MINUTES: minutes(15),

  // MyFitnessPal — optional; can also be set from the Connections panel.
  MFP_USERNAME: z.string().optional(),
  MFP_COOKIE: z.string().optional(),
  MFP_SYNC_MINUTES: minutes(10),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Blank lines like `PUBLIC_URL=` in an env file mean "not set".
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== ''));
  return EnvSchema.parse(cleaned);
}

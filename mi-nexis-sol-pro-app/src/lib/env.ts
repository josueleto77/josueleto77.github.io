/**
 * Single place that reads server-only secrets, so a missing credential fails
 * loudly and close to its call site instead of silently as `undefined`
 * halfway through an API route.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". See .env.example.`
    );
  }
  return value;
}

export const env = {
  get googleSolarApiKey() {
    return required("GOOGLE_SOLAR_API_KEY");
  },
  get hubspotAccessToken() {
    return required("HUBSPOT_ACCESS_TOKEN");
  },
  get hubspotPipelineId() {
    return required("HUBSPOT_PIPELINE_ID");
  },
  get hubspotHotDealStageId() {
    return required("HUBSPOT_HOT_DEAL_STAGE_ID");
  },
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get isConfigured() {
    return {
      googleSolar: Boolean(process.env.GOOGLE_SOLAR_API_KEY),
      hubspot: Boolean(
        process.env.HUBSPOT_ACCESS_TOKEN &&
          process.env.HUBSPOT_PIPELINE_ID &&
          process.env.HUBSPOT_HOT_DEAL_STAGE_ID
      ),
      database: Boolean(process.env.DATABASE_URL),
    };
  },
};

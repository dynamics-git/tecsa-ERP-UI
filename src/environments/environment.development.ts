// Local Angular development targets the standard Laravel dev server on port 8000.
// This is an environment setting, never a business-page URL; change it if your local API port differs.
// Hosted Angular deployments use ERP_API_BASE_URL instead.
export const environment = {
  platformWebsiteUrl: 'http://127.0.0.1:4311',
  apiBaseUrl: 'http://127.0.0.1:8000/api/v1',
  production: false,
  isLive: false,
  sessionTimeout: 30,
};

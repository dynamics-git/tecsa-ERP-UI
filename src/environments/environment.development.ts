// Explicit Laravel development API URL. Laravel connects to hosted PostgreSQL.
// Replace this URL only when the Laravel API host/port changes.
// Hosted Angular deployments use ERP_API_BASE_URL instead.
export const environment = {
  platformWebsiteUrl: 'http://127.0.0.1:4311',
  apiBaseUrl: 'http://127.0.0.1:8000/api/v1',
  production: false,
  isLive: false,
  sessionTimeout: 30,
};

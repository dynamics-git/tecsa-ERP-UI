// Explicit Laravel development API URL. Laravel connects to hosted PostgreSQL.
// Replace this URL only when the Laravel API host/port changes.
// Hosted Angular deployments use ERP_API_BASE_URL instead.
export const environment = {
  apiBaseUrl: 'http://127.0.0.1:8002/api/v1',
  production: false,
  isLive: false,
  sessionTimeout: 30,
};

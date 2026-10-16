// Development proxy only. Hosted builds inject the full ERP_API_BASE_URL.
export const environment = {
  apiBaseUrl: '/api/v1',
  production: false,
  isLive: false,
  sessionTimeout: 30,
};

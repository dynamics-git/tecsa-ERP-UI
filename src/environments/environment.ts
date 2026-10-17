// Production injects the public HTTPS Laravel API URL from the GitHub Actions
// repository variable ERP_API_BASE_URL. URL must end in /api/v1.
export const environment = {
  platformWebsiteUrl: 'https://platform.tecsasoft.com',
  apiBaseUrl: '__ERP_API_BASE_URL__',
  production: true,
  isLive: true,
  sessionTimeout: 30,
};

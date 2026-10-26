// Production injects the public HTTPS Laravel API URL from the GitHub Actions
// repository variable ERP_API_BASE_URL. URL must end in /api/v1.
export const environment = {
  platformWebsiteUrl: 'https://platform.tecsasoft.com',
    apiBaseUrl: 'http://175.139.186.225:5020/api/v1',
  production: true,
  isLive: true,
  sessionTimeout: 30,
};

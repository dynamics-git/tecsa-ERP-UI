export const environment = {
  // One Laravel API contract for SaaS and local development.
  // The host must route /api/v1 to the Laravel application.
  authorizationType: 'Bearer',
  api: '/api/v1',
  apiBaseUrl: '/api/v1',
  authApiBaseUrl: '/api/v1',
  production: true,
  isLive: true,
  sessionTimeout: 30,
  textLimitMax: 100,
  DocNoLimit: 20,
  // Legacy fields remain empty. Never put SaaS client secrets in Angular.
  tenantId: '', clientId: '', clientSecret: '', username: '', password: '',
  secret: '', scope: '', tokenUrl: '', externalApi: '', externalApiKey: '',
  bcCompany: '', bcTenant: '', bcEnvironment: '', lisenceApiCore: '',
  licenseCheckToken: '', licenseApi: '', oauthTokenApi: '',
};

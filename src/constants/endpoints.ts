/** GuardGo API paths. Keep server routes here instead of as strings inside services. */
export const ENDPOINTS = {
  auth: {
    token: '/api/token',
    refresh: '/api/token/refresh',
    logout: '/api/logout',
  },
  public: {
    config: '/api/public',
  },
} as const;

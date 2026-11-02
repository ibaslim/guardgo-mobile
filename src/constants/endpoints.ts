/** GuardGo API paths. Keep server routes here instead of as strings inside services. */
export const ENDPOINTS = {
  auth: {
    token: '/api/token',
    refresh: '/api/token/refresh',
    logout: '/api/logout',
    register: '/api/signup',
  },
  tenant: {
    profile: '/api/tenant',
    image: '/api/tenant/image',
    /** Serves a tenant's logo by tenant id; answers with a default avatar when there is none. */
    imageFile: '/api/s/static/tenant',
  },
  public: {
    config: '/api/public',
    clientMetadata: '/api/public/client-metadata',
  },
} as const;

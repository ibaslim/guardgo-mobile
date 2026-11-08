/** GuardGo API paths. Keep server routes here instead of as strings inside services. */
export const ENDPOINTS = {
  auth: {
    token: '/api/token',
    refresh: '/api/token/refresh',
    logout: '/api/logout',
    register: '/api/signup',
    /** Emails a new confirmation link. The server's path is misspelled ("verificaion"); keep it as is. */
    resendVerification: '/api/signup/verificaion',
    /** GET <path>/<token> checks an invite link; POST activate sets the username and password. */
    inviteContext: '/api/invite/context',
    inviteActivate: '/api/invite/activate',
    /** POST emails a password reset link. GET resetContext/<token> checks it; POST updatePassword sets the new password. */
    forgotPassword: '/api/forgot',
    resetContext: '/api/reset/context',
    updatePassword: '/api/updatePassword',
  },
  /** The signed-in user and their tenant, with the email and the full profile. */
  account: {
    me: '/api/me',
  },
  tenant: {
    profile: '/api/tenant',
    image: '/api/tenant/image',
    /** Serves a tenant's logo by tenant id; answers with a default avatar when there is none. */
    imageFile: '/api/s/static/tenant',
    /** Guard documents: POST uploads a file, DELETE <path>/<file id> removes it, GET <path>/<file id> serves it. */
    files: {
      identity: '/api/tenant/files/identity',
      securityLicense: '/api/tenant/files/security-license',
      policeClearance: '/api/tenant/files/police-clearance',
      trainingCertificate: '/api/tenant/files/training-certificate',
      insurance: '/api/tenant/files/insurance',
    },
  },
  /** Guards owned by the signed-in service provider. */
  providerGuards: {
    list: '/api/sp/guards',
    invite: '/api/sp/guards/invite',
    /** DELETE <path>/<guard tenant id> removes an expired invite. */
    pendingInvite: '/api/sp/guards/pending',
  },
  public: {
    config: '/api/public',
    clientMetadata: '/api/public/client-metadata',
    guardMetadata: '/api/public/guard-metadata',
  },
} as const;

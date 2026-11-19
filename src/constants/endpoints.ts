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
  /** Job requests: a client's own, or the ones a guard or service provider can see. */
  requests: {
    /**
     * GET <path>/<request id> is one request; PATCH edits a draft. Under it: /waves (offer rounds),
     * /schedule (GET, POST, PATCH the repeat pattern), /publish (POST).
     */
    list: '/api/requests',
  },
  /** Pusher Channels: GET returns the user's private channel name; POST <auth> signs a subscription to it (form-encoded socket_id and channel_name). */
  pusher: {
    channel: '/api/pusher/channel',
    auth: '/api/pusher/auth',
  },
  /** In-app notifications for the signed-in user. Under it: /latest, /unread-count, PATCH /read-all, PATCH /<id>/read. */
  notifications: {
    list: '/api/notifications',
    unreadCount: '/api/notifications/unread-count',
    readAll: '/api/notifications/read-all',
  },
  /** Jobs offered to, or taken by, the signed-in guard or provider. GET <path>/<id> is one job; PATCH <path>/<id>/status answers or moves it on. */
  jobs: {
    list: '/api/jobs',
  },
  /** Lists the provider dashboard summarises: assignments, shifts and payout invoices. */
  dashboard: {
    jobs: '/api/jobs',
    shifts: '/api/shifts',
    invoices: '/api/my-invoices',
  },
  /** Guards owned by the signed-in service provider. */
  providerGuards: {
    list: '/api/sp/guards',
    /** GET with keyword, page and rows: guards whose name or email matches, whatever their status. */
    search: '/api/sp/guards/search',
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

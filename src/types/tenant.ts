/** The signed-in user's tenant, from `GET /api/tenant`. */
export type TenantSnapshot = {
  id?: string;
  status?: string;
  profile?: Record<string, unknown>;
  /** 'service_provider' when a service provider owns this guard. */
  ownership_type?: string | null;
  service_provider_tenant_id?: string | null;
};

/** A logo to show: its address and the headers the server needs to serve it. */
export type TenantImage = { uri: string; headers?: Record<string, string> };

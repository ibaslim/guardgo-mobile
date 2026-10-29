/** User session details returned with a token (login, refresh). */
export type Session = {
  username: string;
  role: string;
  status: string;
  hasOnboarding: boolean;
  subscription: boolean;
  verificationDate: string | null;
  licenses: string[];
};

export type TokenResponse = {
  access_token: string;
  token_type: 'bearer';
  session?: Session;
};

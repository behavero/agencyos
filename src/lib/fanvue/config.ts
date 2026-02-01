export const FANVUE_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID!,
  clientSecret: process.env.FANVUE_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/fanvue/callback`,
  
  endpoints: {
    authorize: 'https://api.fanvue.com/oauth/authorize',
    token: 'https://auth.fanvue.com/oauth2/token',
    user: 'https://api.fanvue.com/v1/users/me',
    earnings: 'https://api.fanvue.com/v1/creator/earnings',
    stats: 'https://api.fanvue.com/v1/creator/stats',
    transactions: 'https://api.fanvue.com/v1/transactions',
  },
  
  scopes: [
    'openid',
    'offline_access',
    'offline',
    'read:self',
    'read:creator',
    'read:insights',
    'read:chat',
    'write:chat',
    'read:fan',
    'read:media',
    'read:post',
    'write:post',
    'read:agency',
  ],
} as const

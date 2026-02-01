/**
 * Fanvue API Configuration
 * Simple configuration for the Fanvue API integration
 */
export const FANVUE_CONFIG = {
  // API endpoints
  apiBaseUrl: 'https://api.fanvue.com',
  
  // API version header
  apiVersion: '2025-06-26',
  
  // Endpoints
  endpoints: {
    login: 'https://api.fanvue.com/v1/auth/login',
    user: 'https://api.fanvue.com/v1/users/me',
    earnings: 'https://api.fanvue.com/v1/creator/earnings',
    stats: 'https://api.fanvue.com/v1/creator/stats',
  },
} as const

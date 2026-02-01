/**
 * Fanvue API Client
 * Complete integration with all Fanvue API endpoints
 * Reference: https://api.fanvue.com/docs/api-reference/reference
 */

const FANVUE_API_BASE = 'https://api.fanvue.com'
const FANVUE_API_VERSION = '2025-06-26'

export interface FanvueUser {
  uuid: string
  email: string
  handle: string
  bio?: string
  displayName: string
  isCreator: boolean
  createdAt: string
  updatedAt?: string | null
  avatarUrl?: string | null
  bannerUrl?: string | null
  likesCount?: number
  fanCounts?: {
    followersCount: number
    subscribersCount: number
  }
  contentCounts?: {
    imageCount: number
    videoCount: number
    audioCount: number
    postCount: number
    payToViewPostCount: number
  }
}

export interface FanvueFollower {
  uuid: string
  handle: string
  displayName: string
  nickname?: string | null
  isTopSpender: boolean
  avatarUrl?: string | null
  registeredAt: string
}

export interface FanvuePost {
  uuid: string
  content: string
  createdAt: string
  likesCount: number
  commentsCount: number
  // Add more fields as needed
}

export interface FanvueChat {
  uuid: string
  participantUuid: string
  participantHandle: string
  participantDisplayName: string
  lastMessage?: string
  unreadCount: number
  createdAt: string
}

export interface FanvueMessage {
  uuid: string
  content: string
  senderUuid: string
  createdAt: string
  isRead: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    size: number
    hasMore: boolean
  }
}

export class FanvueAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message)
    this.name = 'FanvueAPIError'
  }
}

export class FanvueClient {
  private accessToken: string
  private creatorUuid?: string

  constructor(accessToken: string, creatorUuid?: string) {
    this.accessToken = accessToken
    this.creatorUuid = creatorUuid
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${FANVUE_API_BASE}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'X-Fanvue-API-Version': FANVUE_API_VERSION,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new FanvueAPIError(
        error.message || `API request failed: ${response.statusText}`,
        response.status,
        error
      )
    }

    return response.json()
  }

  // ==================== USER ====================
  
  async getCurrentUser(): Promise<FanvueUser> {
    return this.request<FanvueUser>('/users/me')
  }

  // ==================== FOLLOWERS & SUBSCRIBERS ====================
  
  async getFollowers(page = 1, size = 50): Promise<PaginatedResponse<FanvueFollower>> {
    return this.request(`/followers?page=${page}&size=${size}`)
  }

  async getSubscribers(page = 1, size = 50): Promise<PaginatedResponse<FanvueFollower>> {
    return this.request(`/subscribers?page=${page}&size=${size}`)
  }

  // ==================== INSIGHTS ====================
  
  async getEarnings(startDate?: string, endDate?: string): Promise<any> {
    let url = '/insights/earnings'
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (params.toString()) url += `?${params.toString()}`
    return this.request(url)
  }

  async getTopFans(page = 1, size = 50): Promise<PaginatedResponse<FanvueFollower>> {
    return this.request(`/insights/top-fans?page=${page}&size=${size}`)
  }

  async getSubscribersCount(): Promise<{ count: number }> {
    return this.request('/insights/subscribers-count')
  }

  async getFanInsights(): Promise<any> {
    return this.request('/insights/fans')
  }

  // ==================== POSTS ====================
  
  async getPosts(page = 1, size = 50): Promise<PaginatedResponse<FanvuePost>> {
    return this.request(`/posts?page=${page}&size=${size}`)
  }

  async getPost(uuid: string): Promise<FanvuePost> {
    return this.request(`/posts/${uuid}`)
  }

  async createPost(data: {
    content: string
    mediaUuids?: string[]
    isPayToView?: boolean
    price?: number
    scheduledAt?: string
  }): Promise<FanvuePost> {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPostTips(postUuid: string): Promise<any> {
    return this.request(`/posts/${postUuid}/tips`)
  }

  async getPostLikes(postUuid: string): Promise<any> {
    return this.request(`/posts/${postUuid}/likes`)
  }

  async getPostComments(postUuid: string): Promise<any> {
    return this.request(`/posts/${postUuid}/comments`)
  }

  // ==================== MEDIA ====================
  
  async getMedia(page = 1, size = 50): Promise<PaginatedResponse<any>> {
    return this.request(`/media?page=${page}&size=${size}`)
  }

  async getMediaByUuid(uuid: string): Promise<any> {
    return this.request(`/media/${uuid}`)
  }

  async createUploadSession(data: {
    filename: string
    contentType: string
    size: number
  }): Promise<any> {
    return this.request('/media/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ==================== CHATS ====================
  
  async getChats(page = 1, size = 50): Promise<PaginatedResponse<FanvueChat>> {
    return this.request(`/chats?page=${page}&size=${size}`)
  }

  async getUnreadCount(): Promise<{ chats: number; messages: number; notifications: number }> {
    return this.request('/chats/unread-count')
  }

  async createChat(participantUuid: string): Promise<FanvueChat> {
    return this.request('/chats', {
      method: 'POST',
      body: JSON.stringify({ participantUuid }),
    })
  }

  async getChatMedia(chatUuid: string): Promise<any> {
    return this.request(`/chats/${chatUuid}/media`)
  }

  // ==================== MESSAGES ====================
  
  async getMessages(chatUuid: string, page = 1, size = 50): Promise<PaginatedResponse<FanvueMessage>> {
    return this.request(`/chats/${chatUuid}/messages?page=${page}&size=${size}`)
  }

  async sendMessage(chatUuid: string, data: {
    content: string
    mediaUuids?: string[]
    price?: number
  }): Promise<FanvueMessage> {
    return this.request(`/chats/${chatUuid}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async sendMassMessage(data: {
    content: string
    mediaUuids?: string[]
    price?: number
    recipientListUuid?: string
    recipientUuids?: string[]
  }): Promise<any> {
    return this.request('/messages/mass', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteMessage(chatUuid: string, messageUuid: string): Promise<void> {
    await this.request(`/chats/${chatUuid}/messages/${messageUuid}`, {
      method: 'DELETE',
    })
  }

  // ==================== TEMPLATES ====================
  
  async getTemplates(): Promise<any> {
    return this.request('/templates')
  }

  async getTemplate(uuid: string): Promise<any> {
    return this.request(`/templates/${uuid}`)
  }

  // ==================== SMART LISTS ====================
  
  async getSmartLists(): Promise<any> {
    return this.request('/smart-lists')
  }

  async getSmartListMembers(listUuid: string): Promise<any> {
    return this.request(`/smart-lists/${listUuid}/members`)
  }

  // ==================== CUSTOM LISTS ====================
  
  async getCustomLists(): Promise<any> {
    return this.request('/custom-lists')
  }

  async createCustomList(name: string): Promise<any> {
    return this.request('/custom-lists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  async deleteCustomList(uuid: string): Promise<void> {
    await this.request(`/custom-lists/${uuid}`, { method: 'DELETE' })
  }

  async addToCustomList(listUuid: string, memberUuids: string[]): Promise<void> {
    await this.request(`/custom-lists/${listUuid}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberUuids }),
    })
  }

  async removeFromCustomList(listUuid: string, memberUuid: string): Promise<void> {
    await this.request(`/custom-lists/${listUuid}/members/${memberUuid}`, {
      method: 'DELETE',
    })
  }

  // ==================== VAULT ====================
  
  async getVaultFolders(): Promise<any> {
    return this.request('/vault/folders')
  }

  async createVaultFolder(name: string): Promise<any> {
    return this.request('/vault/folders', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  async deleteVaultFolder(uuid: string): Promise<void> {
    await this.request(`/vault/folders/${uuid}`, { method: 'DELETE' })
  }

  async getVaultFolderMedia(folderUuid: string): Promise<any> {
    return this.request(`/vault/folders/${folderUuid}/media`)
  }

  async addMediaToFolder(folderUuid: string, mediaUuids: string[]): Promise<void> {
    await this.request(`/vault/folders/${folderUuid}/media`, {
      method: 'POST',
      body: JSON.stringify({ mediaUuids }),
    })
  }

  // ==================== TRACKING LINKS ====================
  
  async getTrackingLinks(): Promise<any> {
    return this.request('/tracking-links')
  }

  async createTrackingLink(data: { name: string; url: string }): Promise<any> {
    return this.request('/tracking-links', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteTrackingLink(uuid: string): Promise<void> {
    await this.request(`/tracking-links/${uuid}`, { method: 'DELETE' })
  }

  // ==================== AGENCY (For managing multiple creators) ====================
  
  async getAgencyCreators(): Promise<PaginatedResponse<any>> {
    return this.request('/creators')
  }

  async getCreatorFollowers(creatorUuid: string): Promise<any> {
    return this.request(`/creators/${creatorUuid}/followers`)
  }

  async getCreatorSubscribers(creatorUuid: string): Promise<any> {
    return this.request(`/creators/${creatorUuid}/subscribers`)
  }

  async getCreatorEarnings(creatorUuid: string): Promise<any> {
    return this.request(`/creators/${creatorUuid}/insights/earnings`)
  }

  async sendMessageAsCreator(creatorUuid: string, chatUuid: string, data: any): Promise<any> {
    return this.request(`/creators/${creatorUuid}/chats/${chatUuid}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async sendMassMessageAsCreator(creatorUuid: string, data: any): Promise<any> {
    return this.request(`/creators/${creatorUuid}/messages/mass`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

export function createFanvueClient(accessToken: string, creatorUuid?: string) {
  return new FanvueClient(accessToken, creatorUuid)
}

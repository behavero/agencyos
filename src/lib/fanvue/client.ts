/**
 * Fanvue API Client
 * Official API Documentation: https://api.fanvue.com/docs
 */

const FANVUE_API_VERSION = '2025-06-26'
const FANVUE_API_BASE_URL = 'https://api.fanvue.com'

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
  likesCount?: number | null
  fanCounts?: {
    followersCount: number
    subscribersCount: number
  } | null
  contentCounts?: {
    imageCount: number
    videoCount: number
    audioCount: number
    postCount: number
    payToViewPostCount: number
  } | null
}

export interface FanvueEarning {
  amount: number
  currency: string
  source: 'subscription' | 'tip' | 'message' | 'post' | 'giveaway'
  transactionDate: string
  user?: {
    uuid: string
    displayName: string
    handle: string
    avatarUrl?: string
    nickname?: string
    isTopSpender: boolean
  }
}

export interface FanvueSubscriber {
  uuid: string
  handle: string
  displayName: string
  avatarUrl?: string
  nickname?: string
  registeredAt: string
  isTopSpender: boolean
  subscriptionStatus: 'active' | 'expired' | 'cancelled'
}

export interface FanvueTopSpender {
  totalSpent: number
  user: {
    uuid: string
    displayName: string
    handle: string
    avatarUrl?: string
    nickname?: string
    isTopSpender: boolean
  }
}

export interface FanvueChat {
  uuid: string
  user: {
    uuid: string
    displayName: string
    handle: string
    avatarUrl?: string
    nickname?: string
    isTopSpender: boolean
  }
  lastMessage?: {
    text?: string
    sentAt: string
    senderUuid: string
    mediaType?: string
  }
  unreadMessagesCount: number
  isMuted: boolean
  createdAt: string
  lastMessageAt: string
}

export interface FanvueMessage {
  uuid: string
  text?: string
  sentAt: string | null
  senderUuid: string
  hasMedia: boolean
  mediaType?: 'image' | 'video' | 'audio' | 'document' | null
  type: 'message' | 'tip' | 'system'
  pricing?: {
    amount: number
    currency: string
  }
  purchasedAt?: string | null
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
    const url = `${FANVUE_API_BASE_URL}${endpoint}`
    
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

  // ============================================
  // USER & PROFILE
  // ============================================

  /**
   * Get current authenticated user
   * Scope: read:self
   */
  async getCurrentUser(): Promise<FanvueUser> {
    return this.request<FanvueUser>('/users/me')
  }

  // ============================================
  // EARNINGS & INSIGHTS
  // ============================================

  /**
   * Get earnings data
   * Scope: read:insights
   */
  async getEarnings(params?: {
    startDate?: string
    endDate?: string
    cursor?: string
    limit?: number
  }): Promise<{ data: FanvueEarning[]; cursor?: string }> {
    const query = new URLSearchParams()
    if (params?.startDate) query.append('startDate', params.startDate)
    if (params?.endDate) query.append('endDate', params.endDate)
    if (params?.cursor) query.append('cursor', params.cursor)
    if (params?.limit) query.append('limit', params.limit.toString())

    const endpoint = this.creatorUuid
      ? `/creators/${this.creatorUuid}/insights/earnings?${query}`
      : `/insights/earnings?${query}`

    return this.request(endpoint)
  }

  /**
   * Get subscriber insights
   * Scope: read:insights
   */
  async getSubscriberInsights(params?: {
    startDate?: string
    endDate?: string
    cursor?: string
    limit?: number
  }): Promise<{ data: any[]; cursor?: string }> {
    const query = new URLSearchParams()
    if (params?.startDate) query.append('startDate', params.startDate)
    if (params?.endDate) query.append('endDate', params.endDate)
    if (params?.cursor) query.append('cursor', params.cursor)
    if (params?.limit) query.append('limit', params.limit.toString())

    const endpoint = this.creatorUuid
      ? `/creators/${this.creatorUuid}/insights/subscribers?${query}`
      : `/insights/subscribers?${query}`

    return this.request(endpoint)
  }

  /**
   * Get top spenders
   * Scope: read:insights
   */
  async getTopSpenders(params?: {
    limit?: number
  }): Promise<{ data: FanvueTopSpender[] }> {
    const query = new URLSearchParams()
    if (params?.limit) query.append('limit', params.limit.toString())

    const endpoint = this.creatorUuid
      ? `/creators/${this.creatorUuid}/insights/top-spenders?${query}`
      : `/insights/top-spenders?${query}`

    return this.request(endpoint)
  }

  // ============================================
  // SUBSCRIBERS & FOLLOWERS
  // ============================================

  /**
   * Get subscribers list
   * Scope: read:creator
   */
  async getSubscribers(params?: {
    cursor?: string
    limit?: number
  }): Promise<{ data: FanvueSubscriber[]; cursor?: string }> {
    const query = new URLSearchParams()
    if (params?.cursor) query.append('cursor', params.cursor)
    if (params?.limit) query.append('limit', params.limit.toString())

    const endpoint = this.creatorUuid
      ? `/creators/${this.creatorUuid}/subscribers?${query}`
      : `/subscribers?${query}`

    return this.request(endpoint)
  }

  /**
   * Get followers list
   * Scope: read:creator
   */
  async getFollowers(params?: {
    cursor?: string
    limit?: number
  }): Promise<{ data: any[]; cursor?: string }> {
    const query = new URLSearchParams()
    if (params?.cursor) query.append('cursor', params.cursor)
    if (params?.limit) query.append('limit', params.limit.toString())

    const endpoint = this.creatorUuid
      ? `/creators/${this.creatorUuid}/followers?${query}`
      : `/followers?${query}`

    return this.request(endpoint)
  }

  // ============================================
  // CHATS & MESSAGES
  // ============================================

  /**
   * Get chats list
   * Scope: read:chat
   */
  async getChats(params?: {
    filter?: 'unread' | 'read' | 'archived'
    search?: string
    sortBy?: 'lastMessageAt' | 'createdAt'
    limit?: number
    cursor?: string
  }): Promise<{ data: FanvueChat[]; cursor?: string }> {
    const query = new URLSearchParams()
    if (params?.filter) query.append('filter', params.filter)
    if (params?.search) query.append('search', params.search)
    if (params?.sortBy) query.append('sortBy', params.sortBy)
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.cursor) query.append('cursor', params.cursor)

    const endpoint = this.creatorUuid
      ? `/creators/${this.creatorUuid}/chats?${query}`
      : `/chats?${query}`

    return this.request(endpoint)
  }

  /**
   * Get messages from a chat
   * Scope: read:chat
   */
  async getChatMessages(
    userUuid: string,
    params?: {
      cursor?: string
      limit?: number
    }
  ): Promise<{ data: FanvueMessage[]; cursor?: string }> {
    const query = new URLSearchParams()
    if (params?.cursor) query.append('cursor', params.cursor)
    if (params?.limit) query.append('limit', params.limit.toString())

    const endpoint = this.creatorUuid
      ? `/creators/${this.creatorUuid}/chats/${userUuid}/messages?${query}`
      : `/chats/${userUuid}/messages?${query}`

    return this.request(endpoint)
  }

  /**
   * Send a message
   * Scope: write:chat
   */
  async sendMessage(
    userUuid: string,
    data: {
      text?: string
      mediaUuids?: string[]
      templateUuid?: string
    }
  ): Promise<any> {
    const endpoint = this.creatorUuid
      ? `/creators/${this.creatorUuid}/chats/${userUuid}/message`
      : `/chats/${userUuid}/message`

    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ============================================
  // POSTS & CONTENT
  // ============================================

  /**
   * Get posts
   * Scope: read:post
   */
  async getPosts(params?: {
    cursor?: string
    limit?: number
  }): Promise<{ data: any[]; cursor?: string }> {
    const query = new URLSearchParams()
    if (params?.cursor) query.append('cursor', params.cursor)
    if (params?.limit) query.append('limit', params.limit.toString())

    return this.request(`/posts?${query}`)
  }

  /**
   * Create a post
   * Scope: write:post
   */
  async createPost(data: {
    text?: string
    mediaUuids?: string[]
    isPaidPost?: boolean
    price?: number
  }): Promise<any> {
    const endpoint = this.creatorUuid
      ? `/creators/${this.creatorUuid}/posts`
      : `/posts`

    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ============================================
  // MEDIA & VAULT
  // ============================================

  /**
   * Get media from vault
   * Scope: read:media
   */
  async getMedia(params?: {
    cursor?: string
    limit?: number
    mediaType?: 'image' | 'video' | 'audio' | 'document'
  }): Promise<{ data: any[]; cursor?: string }> {
    const query = new URLSearchParams()
    if (params?.cursor) query.append('cursor', params.cursor)
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.mediaType) query.append('mediaType', params.mediaType)

    const endpoint = this.creatorUuid
      ? `/creators/${this.creatorUuid}/media?${query}`
      : `/media?${query}`

    return this.request(endpoint)
  }
}

/**
 * Create a Fanvue client instance
 */
export function createFanvueClient(accessToken: string, creatorUuid?: string) {
  return new FanvueClient(accessToken, creatorUuid)
}

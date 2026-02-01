/**
 * Fanvue API Client
 * Comprehensive client for all Fanvue API endpoints
 * Based on https://api.fanvue.com/docs
 */

const FANVUE_API_BASE = 'https://api.fanvue.com'
const FANVUE_API_VERSION = '2025-06-26'

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

  constructor(accessToken: string) {
    this.accessToken = accessToken
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
  async getCurrentUser() {
    return this.request<{
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
    }>('/users/me')
  }

  // ==================== INSIGHTS ====================
  async getEarnings(params?: { from?: string; to?: string; interval?: 'day' | 'week' | 'month' }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      total: number
      data: Array<{
        date: string
        amount: number
        subscriptions: number
        tips: number
        messages: number
        payToView: number
      }>
    }>(`/insights/earnings${query}`)
  }

  async getSubscribersCount() {
    return this.request<{
      total: number
      active: number
      expired: number
    }>('/insights/subscribers-count')
  }

  async getTopFans(params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{
        uuid: string
        displayName: string
        avatarUrl?: string
        totalSpent: number
      }>
      totalCount: number
    }>(`/insights/top-fans${query}`)
  }

  async getFanInsights(fanUuid: string) {
    return this.request<{
      uuid: string
      displayName: string
      totalSpent: number
      subscriptionStatus: string
      lastActive: string
    }>(`/insights/fans/${fanUuid}`)
  }

  // ==================== FOLLOWERS & SUBSCRIBERS ====================
  async getFollowers(page: number = 1, size: number = 15) {
    return this.request<{
      data: Array<{
        uuid: string
        displayName: string
        avatarUrl?: string
        followedAt: string
      }>
      totalCount: number
    }>(`/followers?page=${page}&size=${size}`)
  }

  async getSubscribers(page: number = 1, size: number = 15) {
    return this.request<{
      data: Array<{
        uuid: string
        displayName: string
        avatarUrl?: string
        subscribedAt: string
        expiresAt: string
        status: string
      }>
      totalCount: number
    }>(`/subscribers?page=${page}&size=${size}`)
  }

  // ==================== POSTS ====================
  async getPosts(params?: { page?: number; size?: number; type?: 'image' | 'video' | 'audio' | 'text' }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{
        uuid: string
        content: string
        createdAt: string
        likesCount: number
        commentsCount: number
        tipsCount: number
        mediaCount: number
        isPayToView: boolean
        price?: number
      }>
      totalCount: number
    }>(`/posts${query}`)
  }

  async getPost(postUuid: string) {
    return this.request<{
      uuid: string
      content: string
      createdAt: string
      likesCount: number
      commentsCount: number
      tipsCount: number
    }>(`/posts/${postUuid}`)
  }

  async createPost(data: { content: string; mediaIds?: string[]; price?: number; scheduleAt?: string }) {
    return this.request<{ uuid: string }>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deletePost(postUuid: string) {
    return this.request(`/posts/${postUuid}`, { method: 'DELETE' })
  }

  async getPostTips(postUuid: string, params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{ uuid: string; amount: number; createdAt: string; user: { displayName: string } }>
      totalCount: number
    }>(`/posts/${postUuid}/tips${query}`)
  }

  async getPostLikes(postUuid: string, params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{ uuid: string; displayName: string; avatarUrl?: string }>
      totalCount: number
    }>(`/posts/${postUuid}/likes${query}`)
  }

  async getPostComments(postUuid: string, params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{ uuid: string; content: string; createdAt: string; user: { displayName: string } }>
      totalCount: number
    }>(`/posts/${postUuid}/comments${query}`)
  }

  // ==================== MEDIA ====================
  async getMedia(params?: { page?: number; size?: number; type?: 'image' | 'video' | 'audio' }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{
        uuid: string
        type: string
        url: string
        thumbnailUrl?: string
        createdAt: string
      }>
      totalCount: number
    }>(`/media${query}`)
  }

  async createUploadSession(data: { fileName: string; fileSize: number; mimeType: string }) {
    return this.request<{
      uploadUrl: string
      mediaUuid: string
    }>('/media/upload-session', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ==================== CHATS ====================
  async getChats(params?: { page?: number; size?: number; unread?: boolean }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{
        uuid: string
        user: { uuid: string; displayName: string; avatarUrl?: string }
        lastMessage?: { content: string; createdAt: string }
        unreadCount: number
      }>
      totalCount: number
    }>(`/chats${query}`)
  }

  async getUnreadCount() {
    return this.request<{ count: number }>('/chats/unread-count')
  }

  async createChat(userUuid: string) {
    return this.request<{ uuid: string }>('/chats', {
      method: 'POST',
      body: JSON.stringify({ userUuid }),
    })
  }

  // ==================== MESSAGES ====================
  async getMessages(chatUuid: string, params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{
        uuid: string
        content: string
        createdAt: string
        isFromCreator: boolean
        price?: number
        isPurchased?: boolean
      }>
      totalCount: number
    }>(`/chats/${chatUuid}/messages${query}`)
  }

  async sendMessage(chatUuid: string, data: { content: string; mediaIds?: string[]; price?: number }) {
    return this.request<{ uuid: string }>(`/chats/${chatUuid}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteMessage(chatUuid: string, messageUuid: string) {
    return this.request(`/chats/${chatUuid}/messages/${messageUuid}`, { method: 'DELETE' })
  }

  async sendMassMessage(data: { userUuids: string[]; content: string; mediaIds?: string[]; price?: number }) {
    return this.request<{ messageCount: number }>('/chats/mass-message', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ==================== CHAT TEMPLATES ====================
  async getTemplates(params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{ uuid: string; name: string; content: string }>
      totalCount: number
    }>(`/chat-templates${query}`)
  }

  async createTemplate(data: { name: string; content: string }) {
    return this.request<{ uuid: string }>('/chat-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ==================== SMART LISTS ====================
  async getSmartLists(params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{ uuid: string; name: string; memberCount: number }>
      totalCount: number
    }>(`/chat-smart-lists${query}`)
  }

  async getSmartListMembers(listUuid: string, params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{ uuid: string; displayName: string }>
      totalCount: number
    }>(`/chat-smart-lists/${listUuid}/members${query}`)
  }

  // ==================== CUSTOM LISTS ====================
  async getCustomLists(params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{ uuid: string; name: string; memberCount: number }>
      totalCount: number
    }>(`/chat-custom-lists${query}`)
  }

  async createCustomList(name: string) {
    return this.request<{ uuid: string }>('/chat-custom-lists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  async getCustomListMembers(listUuid: string, params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{ uuid: string; displayName: string }>
      totalCount: number
    }>(`/chat-custom-lists/${listUuid}/members${query}`)
  }

  // ==================== VAULT ====================
  async getVaultFolders(params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{ uuid: string; name: string; mediaCount: number }>
      totalCount: number
    }>(`/vault/folders${query}`)
  }

  async createVaultFolder(name: string) {
    return this.request<{ uuid: string }>('/vault/folders', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  async getVaultFolderMedia(folderUuid: string, params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{ uuid: string; type: string; url: string }>
      totalCount: number
    }>(`/vault/folders/${folderUuid}/media${query}`)
  }

  // ==================== TRACKING LINKS ====================
  async getTrackingLinks(params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{
        uuid: string
        name: string
        url: string
        clicks: number
        conversions: number
        revenue: number
      }>
      totalCount: number
    }>(`/tracking-links${query}`)
  }

  async createTrackingLink(data: { name: string }) {
    return this.request<{ uuid: string; url: string }>('/tracking-links', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteTrackingLink(linkUuid: string) {
    return this.request(`/tracking-links/${linkUuid}`, { method: 'DELETE' })
  }

  // ==================== AGENCY ENDPOINTS ====================
  async getAgencyCreators(params?: { page?: number; size?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
    return this.request<{
      data: Array<{
        uuid: string
        displayName: string
        handle: string
        avatarUrl?: string
      }>
      totalCount: number
    }>(`/creators${query}`)
  }
}

export function createFanvueClient(accessToken: string) {
  return new FanvueClient(accessToken)
}

/**
 * Fanvue API Client
 * Comprehensive client for all Fanvue API endpoints
 * Based on https://api.fanvue.com/docs
 *
 * Includes automatic rate limit handling with exponential backoff
 */

import { fetchWithRateLimit } from './rate-limiter'

const FANVUE_API_BASE = 'https://api.fanvue.com'
const FANVUE_API_VERSION = '2025-06-26'

export class FanvueAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${FANVUE_API_BASE}${endpoint}`

    // Use rate-limit-aware fetch with automatic retry
    const response = await fetchWithRateLimit(
      url,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'X-Fanvue-API-Version': FANVUE_API_VERSION,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      },
      3 // Max 3 retries on rate limit
    )

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
  async getEarnings(params?: {
    startDate?: string
    endDate?: string
    size?: number
    cursor?: string
  }) {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.set('startDate', params.startDate)
    if (params?.endDate) queryParams.set('endDate', params.endDate)
    if (params?.size) queryParams.set('size', String(params.size))
    if (params?.cursor) queryParams.set('cursor', params.cursor)

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request<{
      data: Array<{
        date: string
        gross: number // In cents
        net: number // In cents
        currency: string | null
        source: string
        user: { uuid: string; handle: string; displayName: string } | null
      }>
      nextCursor: string | null
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
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
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
  async getPosts(params?: {
    page?: number
    size?: number
    type?: 'image' | 'video' | 'audio' | 'text'
  }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
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

  async createPost(data: {
    content: string
    mediaIds?: string[]
    price?: number
    scheduleAt?: string
  }) {
    return this.request<{ uuid: string }>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deletePost(postUuid: string) {
    return this.request(`/posts/${postUuid}`, { method: 'DELETE' })
  }

  async getPostTips(postUuid: string, params?: { page?: number; size?: number }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
    return this.request<{
      data: Array<{
        uuid: string
        amount: number
        createdAt: string
        user: { displayName: string }
      }>
      totalCount: number
    }>(`/posts/${postUuid}/tips${query}`)
  }

  async getPostLikes(postUuid: string, params?: { page?: number; size?: number }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
    return this.request<{
      data: Array<{ uuid: string; displayName: string; avatarUrl?: string }>
      totalCount: number
    }>(`/posts/${postUuid}/likes${query}`)
  }

  async getPostComments(postUuid: string, params?: { page?: number; size?: number }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
    return this.request<{
      data: Array<{
        uuid: string
        content: string
        createdAt: string
        user: { displayName: string }
      }>
      totalCount: number
    }>(`/posts/${postUuid}/comments${query}`)
  }

  // ==================== MEDIA ====================
  async getMedia(params?: { page?: number; size?: number; type?: 'image' | 'video' | 'audio' }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
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
  async getChats(params?: {
    page?: number
    size?: number
    filter?: string[]
    search?: string
    sortBy?: 'most_recent_messages' | 'online_now' | 'most_unanswered_chats'
    customListId?: string
    smartListIds?: string[]
  }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
    return this.request<{
      data: Array<{
        createdAt: string
        lastMessageAt: string | null
        isRead: boolean
        isMuted: boolean
        unreadMessagesCount: number
        user: {
          uuid: string
          handle: string
          displayName: string
          nickname: string | null
          isTopSpender: boolean
          avatarUrl: string | null
          registeredAt: string
        }
        lastMessage: {
          text: string | null
          type: string
          uuid: string
          sentAt: string
          hasMedia: boolean | null
          mediaType: string | null
          senderUuid: string
        } | null
      }>
      pagination: { page: number; size: number; hasMore: boolean }
    }>(`/chats${query}`)
  }

  async getUnreadCount() {
    return this.request<{
      unreadChatsCount: number
      unreadMessagesCount: number
      unreadNotifications: {
        newFollower: number
        newPostComment: number
        newPostLike: number
        newPurchase: number
        newSubscriber: number
        newTip: number
        newPromotion: number
      }
    }>('/chats/unread')
  }

  async createChat(userUuid: string) {
    return this.request<{ message: string }>('/chats', {
      method: 'POST',
      body: JSON.stringify({ userUuid }),
    })
  }

  async updateChat(
    userUuid: string,
    data: { isRead?: boolean; isMuted?: boolean; nickname?: string }
  ) {
    return this.request(`/chats/${userUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async getChatMedia(
    userUuid: string,
    params?: { cursor?: string; mediaType?: string; limit?: number }
  ) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
    return this.request<{
      data: Array<{
        uuid: string
        messageUuid: string
        mediaType: string
        created_at: string
        sentAt: string
        ownerUuid: string
        name: string | null
        variants: Array<{ variantType: string; url?: string; width?: number; height?: number }>
      }>
      nextCursor: string | null
    }>(`/chats/${userUuid}/media${query}`)
  }

  async getBatchStatuses(userUuids: string[]) {
    return this.request<Record<string, { isOnline: boolean; lastSeenAt: string | null }>>(
      '/chats/statuses',
      {
        method: 'POST',
        body: JSON.stringify({ userUuids }),
      }
    )
  }

  // ==================== MESSAGES ====================
  async getMessages(userUuid: string, params?: { page?: number; size?: number }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
    return this.request<{
      data: Array<{
        uuid: string
        text: string | null
        sentAt: string | null
        sender: { uuid: string; handle: string }
        recipient: { uuid: string; handle: string }
        hasMedia: boolean | null
        mediaType: string | null
        type: string
        pricing: { USD: { price: number } } | null
        purchasedAt: string | null
      }>
      pagination: { page: number; size: number; hasMore: boolean }
    }>(`/chats/${userUuid}/messages${query}`)
  }

  async sendMessage(
    userUuid: string,
    data: {
      text?: string | null
      mediaUuids?: string[]
      price?: number | null
      templateUuid?: string | null
    }
  ) {
    return this.request<{ messageUuid: string }>(`/chats/${userUuid}/message`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteMessage(userUuid: string, messageUuid: string) {
    return this.request(`/chats/${userUuid}/messages/${messageUuid}`, { method: 'DELETE' })
  }

  async sendMassMessage(data: {
    text?: string
    mediaUuids?: string[]
    price?: number | null
    includedLists: {
      smartListUuids?: string[]
      customListUuids?: string[]
    }
    excludedLists?: {
      smartListUuids?: string[]
      customListUuids?: string[]
    }
  }) {
    return this.request<{ id: string; recipientCount: number; createdAt: string }>(
      '/chats/mass-messages',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  // ==================== CHAT TEMPLATES ====================
  async getTemplates(params?: { page?: number; size?: number }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
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
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
    return this.request<{
      data: Array<{ uuid: string; name: string; memberCount: number }>
      totalCount: number
    }>(`/chat-smart-lists${query}`)
  }

  async getSmartListMembers(listUuid: string, params?: { page?: number; size?: number }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
    return this.request<{
      data: Array<{ uuid: string; displayName: string }>
      totalCount: number
    }>(`/chat-smart-lists/${listUuid}/members${query}`)
  }

  // ==================== CUSTOM LISTS ====================
  async getCustomLists(params?: { page?: number; size?: number }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
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
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
    return this.request<{
      data: Array<{ uuid: string; displayName: string }>
      totalCount: number
    }>(`/chat-custom-lists/${listUuid}/members${query}`)
  }

  // ==================== VAULT ====================
  async getVaultFolders() {
    return this.request<{
      data: Array<{ name: string; createdAt: string; mediaCount: number }>
      pagination: { page: number; size: number; hasMore: boolean }
    }>(`/vault/folders`)
  }

  async getVaultFolder(folderName: string) {
    return this.request<{
      name: string
      createdAt: string
      mediaCount: number
    }>(`/vault/folders/${encodeURIComponent(folderName)}`)
  }

  async createVaultFolder(name: string) {
    return this.request<{ name: string; createdAt: string; mediaCount: number }>('/vault/folders', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  async renameVaultFolder(folderName: string, newName: string) {
    return this.request(`/vault/folders/${encodeURIComponent(folderName)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newName }),
    })
  }

  async deleteVaultFolder(folderName: string) {
    return this.request(`/vault/folders/${encodeURIComponent(folderName)}`, {
      method: 'DELETE',
    })
  }

  async getVaultFolderMedia(folderName: string, params?: { page?: number; size?: number }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
    return this.request<{
      data: Array<{ uuid: string; name: string | null; createdAt: string; mediaType: string }>
      pagination: { page: number; size: number; hasMore: boolean }
    }>(`/vault/folders/${encodeURIComponent(folderName)}/media${query}`)
  }

  async addMediaToVaultFolder(folderName: string, mediaUuids: string[]) {
    return this.request<{ addedCount: number }>(
      `/vault/folders/${encodeURIComponent(folderName)}/media`,
      {
        method: 'POST',
        body: JSON.stringify({ mediaUuids }),
      }
    )
  }

  async removeMediaFromVaultFolder(folderName: string, mediaUuid: string) {
    return this.request(`/vault/folders/${encodeURIComponent(folderName)}/media/${mediaUuid}`, {
      method: 'DELETE',
    })
  }

  // ==================== CREATOR MEDIA (Agency endpoint) ====================

  /**
   * Get a creator's media library via agency endpoint
   * This is the correct endpoint for agency tokens (not /vault/folders which requires personal token)
   * Scopes required: read:creator, read:media
   */
  async getCreatorMedia(
    creatorUserUuid: string,
    params?: {
      page?: number
      size?: number
      mediaType?: 'image' | 'video' | 'audio' | 'document'
      folderName?: string
      usage?: 'subscribers' | 'followers' | 'ppv' | 'mass_messages'
      variants?: string // comma-separated: 'main,thumbnail,blurred,thumbnail_gallery'
    }
  ) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.size) searchParams.set('size', String(params.size))
    if (params?.mediaType) searchParams.set('mediaType', params.mediaType)
    if (params?.folderName) searchParams.set('folderName', params.folderName)
    if (params?.usage) searchParams.set('usage', params.usage)
    if (params?.variants) searchParams.set('variants', params.variants)
    const query = searchParams.toString() ? `?${searchParams.toString()}` : ''

    return this.request<{
      data: Array<{
        uuid: string
        status: string // 'created' | 'processing' | 'ready' | 'error'
        createdAt?: string
        url?: string
        caption?: string | null
        description?: string | null
        name?: string | null
        mediaType?: string // 'image' | 'video' | 'audio' | 'document'
        recommendedPrice?: number | null
        variants?: Array<{
          uuid: string
          variantType: string // 'blurred' | 'main' | 'thumbnail' | 'thumbnail_gallery'
          displayPosition: number
          url?: string
          width?: number | null
          height?: number | null
          lengthMs?: number | null
        }>
        purchasedByFan?: boolean
      }>
      pagination: { page: number; size: number; hasMore: boolean }
    }>(`/creators/${creatorUserUuid}/media${query}`)
  }

  /**
   * Get a single creator media item by UUID (agency endpoint)
   * IMPORTANT: Pass variants param to get URLs (e.g. ?variants=main,thumbnail)
   */
  async getCreatorMediaByUuid(
    creatorUserUuid: string,
    mediaUuid: string,
    params?: { variants?: string }
  ) {
    const query = params?.variants ? `?variants=${params.variants}` : ''
    return this.request<{
      uuid: string
      status: string
      createdAt?: string
      url?: string
      caption?: string | null
      description?: string | null
      name?: string | null
      mediaType?: string
      recommendedPrice?: number | null
      variants?: Array<{
        uuid: string
        variantType: string
        displayPosition: number
        url?: string
        width?: number | null
        height?: number | null
        lengthMs?: number | null
      }>
    }>(`/creators/${creatorUserUuid}/media/${mediaUuid}${query}`)
  }

  // ==================== TRACKING LINKS ====================
  async getTrackingLinks(params?: { limit?: number; cursor?: string }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
    return this.request<{
      data: Array<{
        uuid: string
        name: string
        linkUrl: string
        externalSocialPlatform: string
        createdAt: string
        clicks: number
      }>
      nextCursor: string | null
    }>(`/tracking-links${query}`)
  }

  async createTrackingLink(data: { name: string; externalSocialPlatform: string }) {
    return this.request<{ uuid: string; linkUrl: string }>('/tracking-links', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteTrackingLink(linkUuid: string) {
    return this.request(`/tracking-links/${linkUuid}`, { method: 'DELETE' })
  }

  // ==================== CREATOR TRACKING LINKS (Agency endpoint) ====================
  /**
   * Get tracking links for a specific creator (agency endpoint)
   * Requires agency admin token with read:tracking_links and read:creator scopes
   */
  async getCreatorTrackingLinks(
    creatorUserUuid: string,
    params?: { limit?: number; cursor?: string }
  ) {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.set('limit', String(params.limit))
    if (params?.cursor) queryParams.set('cursor', params.cursor)

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request<{
      data: Array<{
        uuid: string
        name: string
        linkUrl: string
        externalSocialPlatform: string
        createdAt: string
        clicks: number
        // Attribution metrics (undocumented but confirmed in API response)
        engagement?: {
          acquiredSubscribers: number
          acquiredFollowers: number
        }
        earnings?: {
          totalGross: number // in cents
          totalNet: number // in cents
        }
      }>
      nextCursor: string | null
    }>(`/creators/${creatorUserUuid}/tracking-links${query}`)
  }

  // ==================== AGENCY ENDPOINTS ====================
  async getAgencyCreators(params?: { page?: number; size?: number }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : ''
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

  /**
   * Get earnings for a specific creator (agency endpoint)
   * Requires agency admin token with read:creator and read:insights scopes
   */
  async getCreatorEarnings(
    creatorUserUuid: string,
    params?: {
      startDate?: string
      endDate?: string
      size?: number
      cursor?: string
    }
  ) {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.set('startDate', params.startDate)
    if (params?.endDate) queryParams.set('endDate', params.endDate)
    if (params?.size) queryParams.set('size', String(params.size))
    if (params?.cursor) queryParams.set('cursor', params.cursor)

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request<{
      data: Array<{
        date: string
        gross: number // In cents
        net: number // In cents
        currency: string | null
        source: string
        user: {
          uuid: string
          handle: string
          displayName: string
          nickname: string | null
          isTopSpender: boolean
        } | null
      }>
      nextCursor: string | null
    }>(`/creators/${creatorUserUuid}/insights/earnings${query}`)
  }

  /**
   * Get followers for a specific creator (agency endpoint)
   * Requires agency admin token with read:creator and read:fan scopes
   */
  async getCreatorFollowers(
    creatorUserUuid: string,
    params?: {
      page?: number
      size?: number
    }
  ) {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', String(params.page))
    if (params?.size) queryParams.set('size', String(params.size))

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request<{
      data: Array<{
        uuid: string
        handle: string
        displayName: string
        nickname: string | null
        isTopSpender: boolean
        avatarUrl: string | null
        registeredAt: string
      }>
      pagination: {
        page: number
        size: number
        hasMore: boolean
      }
    }>(`/creators/${creatorUserUuid}/followers${query}`)
  }

  /**
   * Get subscribers for a specific creator (agency endpoint)
   * Requires agency admin token with read:creator and read:fan scopes
   */
  async getCreatorSubscribers(
    creatorUserUuid: string,
    params?: {
      page?: number
      size?: number
    }
  ) {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', String(params.page))
    if (params?.size) queryParams.set('size', String(params.size))

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request<{
      data: Array<{
        uuid: string
        handle: string
        displayName: string
        nickname: string | null
        isTopSpender: boolean
        avatarUrl: string | null
        registeredAt: string
      }>
      pagination: {
        page: number
        size: number
        hasMore: boolean
      }
    }>(`/creators/${creatorUserUuid}/subscribers${query}`)
  }

  /**
   * Get chats for a specific creator (agency endpoint)
   * Requires agency admin token with read:creator and read:chat scopes
   */
  async getCreatorChats(
    creatorUserUuid: string,
    params?: {
      page?: number
      size?: number
    }
  ) {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', String(params.page))
    if (params?.size) queryParams.set('size', String(params.size))

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request<{
      data: Array<{
        createdAt: string
        lastMessageAt: string | null
        isRead: boolean
        isMuted: boolean
        unreadMessagesCount: number
        user: {
          uuid: string
          handle: string
          displayName: string
          nickname: string | null
          isTopSpender: boolean
          avatarUrl: string | null
          registeredAt: string
        }
        lastMessage: {
          text: string | null
          type: string
          uuid: string
          sentAt: string
          hasMedia: boolean | null
          mediaType: string | null
          senderUuid: string
        } | null
      }>
      pagination: {
        page: number
        size: number
        hasMore: boolean
      }
    }>(`/creators/${creatorUserUuid}/chats${query}`)
  }

  /**
   * Get smart lists for a specific creator (agency endpoint)
   * Returns accurate counts for followers, subscribers, and other segments
   * This is MUCH more efficient than paginating through all followers/subscribers!
   * Requires agency admin token with read:creator, read:chat, and read:fan scopes
   */
  async getCreatorSmartLists(creatorUserUuid: string) {
    return this.request<
      Array<{
        name: string
        uuid:
          | 'subscribers'
          | 'auto_renewing'
          | 'non_renewing'
          | 'followers'
          | 'free_trial_subscribers'
          | 'expired_subscribers'
          | 'spent_more_than_50'
        count: number
      }>
    >(`/creators/${creatorUserUuid}/chats/lists/smart`)
  }

  /**
   * Get top spending fans for a specific creator (agency endpoint)
   * Returns VIP fans with their spending totals and message counts
   * Requires agency admin token with read:creator, read:insights, and read:fan scopes
   */
  async getCreatorTopSpenders(
    creatorUserUuid: string,
    params?: {
      startDate?: string
      endDate?: string
      page?: number
      size?: number
    }
  ) {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.set('startDate', params.startDate)
    if (params?.endDate) queryParams.set('endDate', params.endDate)
    if (params?.page) queryParams.set('page', String(params.page))
    if (params?.size) queryParams.set('size', String(params.size))

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request<{
      data: Array<{
        gross: number // In cents
        net: number // In cents
        messages: number
        user: {
          uuid: string
          handle: string
          displayName: string
          nickname: string | null
          isTopSpender: boolean
          avatarUrl: string | null
          registeredAt: string
        }
      }>
      pagination: {
        page: number
        size: number
        hasMore: boolean
      }
    }>(`/creators/${creatorUserUuid}/insights/top-spenders${query}`)
  }

  /**
   * Get subscriber count history for a specific creator (agency endpoint)
   * Returns daily subscriber metrics for trend analysis
   * Requires agency admin token with read:creator and read:insights scopes
   */
  async getCreatorSubscriberHistory(
    creatorUserUuid: string,
    params?: {
      startDate?: string
      endDate?: string
      size?: number
      cursor?: string
    }
  ) {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.set('startDate', params.startDate)
    if (params?.endDate) queryParams.set('endDate', params.endDate)
    if (params?.size) queryParams.set('size', String(params.size))
    if (params?.cursor) queryParams.set('cursor', params.cursor)

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request<{
      data: Array<{
        date: string // ISO 8601 date-time
        total: number // Cumulative total from start date
        newSubscribersCount: number
        cancelledSubscribersCount: number
      }>
      nextCursor: string | null
    }>(`/creators/${creatorUserUuid}/insights/subscribers${query}`)
  }
}

export function createFanvueClient(accessToken: string) {
  return new FanvueClient(accessToken)
}

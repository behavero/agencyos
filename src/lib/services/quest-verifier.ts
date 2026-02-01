import { createFanvueClient } from '@/lib/fanvue/client'

export type VerificationType = 'MANUAL' | 'API_MESSAGES' | 'API_POSTS' | 'API_REVENUE' | 'API_SUBSCRIBERS'

export interface QuestVerificationResult {
  verified: boolean
  currentProgress: number
  targetCount: number
  message?: string
}

/**
 * Quest Verifier Service
 * Verifies quest completion by checking real API data from Fanvue
 */
export class QuestVerifier {
  private fanvue: ReturnType<typeof createFanvueClient>

  constructor(accessToken: string) {
    this.fanvue = createFanvueClient(accessToken)
  }

  /**
   * Get the start of today in UTC
   */
  private getTodayStart(): string {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    return today.toISOString()
  }

  /**
   * Verify message count for today
   * Counts messages sent by the creator today
   */
  async verifyMessageCount(target: number): Promise<QuestVerificationResult> {
    try {
      const todayStart = this.getTodayStart()
      
      // Fetch chats and count messages sent today
      const chats = await this.fanvue.getChats({ size: 50 })
      
      let messagesSentToday = 0
      
      // For each recent chat, we'd ideally fetch messages
      // For now, we'll use a simplified approach based on lastMessageAt
      if (chats?.data) {
        for (const chat of chats.data) {
          if (chat.lastMessage?.sentAt) {
            const messageDate = new Date(chat.lastMessage.sentAt)
            const todayDate = new Date(todayStart)
            
            // Check if the last message is from today and from creator
            if (messageDate >= todayDate && chat.lastMessage.senderUuid !== chat.user.uuid) {
              messagesSentToday++
            }
          }
        }
      }

      return {
        verified: messagesSentToday >= target,
        currentProgress: messagesSentToday,
        targetCount: target,
        message: `${messagesSentToday}/${target} messages sent today`,
      }
    } catch (error: any) {
      console.error('[QuestVerifier] verifyMessageCount error:', error)
      return {
        verified: false,
        currentProgress: 0,
        targetCount: target,
        message: 'Failed to verify messages',
      }
    }
  }

  /**
   * Verify post count for today
   */
  async verifyPostCount(target: number): Promise<QuestVerificationResult> {
    try {
      const todayStart = this.getTodayStart()
      
      // Fetch posts
      const posts = await this.fanvue.getPosts({ size: 50 })
      
      let postsToday = 0
      
      if (posts?.data) {
        for (const post of posts.data) {
          if (post.createdAt) {
            const postDate = new Date(post.createdAt)
            const todayDate = new Date(todayStart)
            
            if (postDate >= todayDate) {
              postsToday++
            }
          }
        }
      }

      return {
        verified: postsToday >= target,
        currentProgress: postsToday,
        targetCount: target,
        message: `${postsToday}/${target} posts created today`,
      }
    } catch (error: any) {
      console.error('[QuestVerifier] verifyPostCount error:', error)
      return {
        verified: false,
        currentProgress: 0,
        targetCount: target,
        message: 'Failed to verify posts',
      }
    }
  }

  /**
   * Verify daily revenue goal
   */
  async verifyRevenueGoal(target: number): Promise<QuestVerificationResult> {
    try {
      const todayStart = this.getTodayStart()
      const todayEnd = new Date().toISOString()
      
      // Fetch earnings for today
      const earnings = await this.fanvue.getEarnings({
        startDate: todayStart,
        endDate: todayEnd,
        size: 50,
      })
      
      let todayRevenue = 0
      
      if (earnings?.data) {
        for (const earning of earnings.data) {
          // gross is in cents
          todayRevenue += (earning.gross || 0) / 100
        }
      }

      return {
        verified: todayRevenue >= target,
        currentProgress: Math.round(todayRevenue),
        targetCount: target,
        message: `$${todayRevenue.toFixed(2)}/$${target} earned today`,
      }
    } catch (error: any) {
      console.error('[QuestVerifier] verifyRevenueGoal error:', error)
      return {
        verified: false,
        currentProgress: 0,
        targetCount: target,
        message: 'Failed to verify revenue',
      }
    }
  }

  /**
   * Verify subscriber count (total, not daily)
   */
  async verifySubscriberCount(target: number): Promise<QuestVerificationResult> {
    try {
      const subscribers = await this.fanvue.getSubscribers(1, 1)
      const totalCount = subscribers?.totalCount || 0

      return {
        verified: totalCount >= target,
        currentProgress: totalCount,
        targetCount: target,
        message: `${totalCount}/${target} subscribers`,
      }
    } catch (error: any) {
      console.error('[QuestVerifier] verifySubscriberCount error:', error)
      return {
        verified: false,
        currentProgress: 0,
        targetCount: target,
        message: 'Failed to verify subscribers',
      }
    }
  }

  /**
   * Verify a quest based on its verification type
   */
  async verify(
    verificationType: VerificationType,
    targetCount: number
  ): Promise<QuestVerificationResult> {
    switch (verificationType) {
      case 'API_MESSAGES':
        return this.verifyMessageCount(targetCount)
      case 'API_POSTS':
        return this.verifyPostCount(targetCount)
      case 'API_REVENUE':
        return this.verifyRevenueGoal(targetCount)
      case 'API_SUBSCRIBERS':
        return this.verifySubscriberCount(targetCount)
      case 'MANUAL':
      default:
        // Manual quests are always "verified" - user controls completion
        return {
          verified: true,
          currentProgress: targetCount,
          targetCount: targetCount,
          message: 'Manual verification',
        }
    }
  }
}

/**
 * Create a quest verifier instance
 */
export function createQuestVerifier(accessToken: string): QuestVerifier {
  return new QuestVerifier(accessToken)
}

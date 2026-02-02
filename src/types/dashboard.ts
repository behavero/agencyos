/**
 * Dashboard Analytics Types
 * Phase 48B - Shared type definitions for dashboard data structures
 */

export interface RevenueDataPoint {
  date: string
  subscriptions: number
  tips: number
  messages: number
  ppv: number
  total: number
}

export interface RevenueBreakdownItem {
  name: string
  value: number
}

export interface ConversionStats {
  clickToSubscriberRate: number
  messageConversionRate: number
  ppvConversionRate: number
  avgRevenuePerSubscriber: number
  trend: number
}

export interface TrafficSource {
  name: string
  value: number
}

export interface SubscriberGrowthPoint {
  date: string
  subscribers: number
  followers: number
}

export interface ModelPerformanceItem {
  id: string
  name: string
  fullName: string
  revenue: number
  subscribers: number
  followers: number
  posts: number
}

export interface DashboardKPIs {
  totalRevenue: number
  monthlyRevenue: number
  totalSubscribers: number
  totalFollowers: number
  unreadMessages: number
  monthlyExpenses: number
  netProfit: number
  activeModels: number
}

export interface ExpenseHistoryPoint {
  month: string
  expenses: number
}

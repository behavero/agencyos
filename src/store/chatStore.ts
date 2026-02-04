'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

/**
 * Chat UI State Store (Zustand)
 *
 * Manages local UI state for the chat interface:
 * - Optimistic message drafts
 * - Sidebar visibility
 * - Selected conversation
 * - Input state
 * - Vault/media drawer state
 */

export interface OptimisticMessage {
  tempId: string
  text: string | null
  mediaUuids: string[]
  price: number | null
  sentAt: string
  isSending: boolean
  isFailed: boolean
  error?: string
}

export interface DraftMessage {
  text: string
  mediaUuids: string[]
  price: number | null
}

interface ChatStore {
  // Selected conversation
  selectedCreatorId: string | null
  selectedUserUuid: string | null

  // Sidebar state
  sidebarOpen: boolean
  contextSidebarOpen: boolean

  // Optimistic messages (pending sends)
  optimisticMessages: Map<string, OptimisticMessage> // key: tempId

  // Drafts (unsent messages per conversation)
  drafts: Map<string, DraftMessage> // key: `${creatorId}-${userUuid}`

  // Vault/media drawer
  vaultOpen: boolean
  selectedMedia: string[] // mediaUuids selected for sending

  // Input state
  inputFocused: boolean
  isTyping: boolean

  // Actions
  setSelectedConversation: (creatorId: string | null, userUuid: string | null) => void
  toggleSidebar: () => void
  toggleContextSidebar: () => void
  addOptimisticMessage: (
    userUuid: string,
    message: Omit<OptimisticMessage, 'tempId' | 'sentAt'>
  ) => string
  updateOptimisticMessage: (tempId: string, updates: Partial<OptimisticMessage>) => void
  removeOptimisticMessage: (tempId: string) => void
  markOptimisticAsFailed: (tempId: string, error: string) => void
  setDraft: (creatorId: string, userUuid: string, draft: DraftMessage | null) => void
  getDraft: (creatorId: string, userUuid: string) => DraftMessage | null
  toggleVault: () => void
  setSelectedMedia: (mediaUuids: string[]) => void
  setInputFocused: (focused: boolean) => void
  setIsTyping: (typing: boolean) => void
  clearAllOptimistic: () => void
}

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        selectedCreatorId: null,
        selectedUserUuid: null,
        sidebarOpen: true,
        contextSidebarOpen: false,
        optimisticMessages: new Map(),
        drafts: new Map(),
        vaultOpen: false,
        selectedMedia: [],
        inputFocused: false,
        isTyping: false,

        // Actions
        setSelectedConversation: (creatorId, userUuid) => {
          set({
            selectedCreatorId: creatorId,
            selectedUserUuid: userUuid,
          })
        },

        toggleSidebar: () => {
          set(state => ({ sidebarOpen: !state.sidebarOpen }))
        },

        toggleContextSidebar: () => {
          set(state => ({ contextSidebarOpen: !state.contextSidebarOpen }))
        },

        addOptimisticMessage: (userUuid, message) => {
          const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const optimistic: OptimisticMessage = {
            ...message,
            tempId,
            sentAt: new Date().toISOString(),
          }

          set(state => {
            const newMap = new Map(state.optimisticMessages)
            newMap.set(tempId, optimistic)
            return { optimisticMessages: newMap }
          })

          return tempId
        },

        updateOptimisticMessage: (tempId, updates) => {
          set(state => {
            const newMap = new Map(state.optimisticMessages)
            const existing = newMap.get(tempId)
            if (existing) {
              newMap.set(tempId, { ...existing, ...updates })
            }
            return { optimisticMessages: newMap }
          })
        },

        removeOptimisticMessage: tempId => {
          set(state => {
            const newMap = new Map(state.optimisticMessages)
            newMap.delete(tempId)
            return { optimisticMessages: newMap }
          })
        },

        markOptimisticAsFailed: (tempId, error) => {
          get().updateOptimisticMessage(tempId, {
            isSending: false,
            isFailed: true,
            error,
          })
        },

        setDraft: (creatorId, userUuid, draft) => {
          const key = `${creatorId}-${userUuid}`
          set(state => {
            const newMap = new Map(state.drafts)
            if (draft) {
              newMap.set(key, draft)
            } else {
              newMap.delete(key)
            }
            return { drafts: newMap }
          })
        },

        getDraft: (creatorId, userUuid) => {
          const key = `${creatorId}-${userUuid}`
          return get().drafts.get(key) || null
        },

        toggleVault: () => {
          set(state => ({ vaultOpen: !state.vaultOpen }))
        },

        setSelectedMedia: mediaUuids => {
          set({ selectedMedia: mediaUuids })
        },

        setInputFocused: focused => {
          set({ inputFocused: focused })
        },

        setIsTyping: typing => {
          set({ isTyping: typing })
        },

        clearAllOptimistic: () => {
          set({ optimisticMessages: new Map() })
        },
      }),
      {
        name: 'chat-store',
        // Only persist drafts and sidebar state
        partialize: state => ({
          drafts: Array.from(state.drafts.entries()),
          sidebarOpen: state.sidebarOpen,
          contextSidebarOpen: state.contextSidebarOpen,
        }),
        // Rehydrate Map from array
        storage: {
          getItem: name => {
            const str = localStorage.getItem(name)
            if (!str) return null
            const parsed = JSON.parse(str)
            if (parsed.state?.drafts) {
              parsed.state.drafts = new Map(parsed.state.drafts)
            }
            return parsed
          },
          setItem: (name, value) => {
            const toStore = {
              ...value,
              state: {
                ...value.state,
                drafts: Array.from(value.state.drafts.entries()),
              },
            }
            localStorage.setItem(name, JSON.stringify(toStore))
          },
          removeItem: name => localStorage.removeItem(name),
        },
      }
    ),
    { name: 'ChatStore' }
  )
)

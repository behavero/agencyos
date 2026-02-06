# OnyxOS High-Performance Chat Engine - Implementation Plan

## Phase 1: Setup/Config ✅

- [x] TanStack Query installed
- [x] react-virtuoso installed
- [x] Zustand store created (`src/store/chatStore.ts`)
- [x] TanStack Query hook created (`src/hooks/useFanvueChat.ts`)
- [x] QueryProvider added to dashboard layout

## Phase 2: Core Logic - Virtualized Message List

**File:** `src/components/Chat/VirtualMessageList.tsx`

**Requirements:**

- Use `react-virtuoso` for virtualization
- Handle 5,000+ messages at 60fps
- Display optimistic messages (greyed out "sending" state)
- Show failed messages with retry option
- Support PPV messages with lock/unlock UI
- Auto-scroll to bottom on new messages
- Proper height calculations for dynamic content

**Dependencies:**

- `react-virtuoso` (installed)
- `useFanvueChat` hook (created)
- `ChatMessage` type from `use-chat-messages.ts`

## Phase 3: UI/Interface - Input Area with Vault

**File:** `src/components/Chat/InputArea.tsx`

**Requirements:**

- Text input with auto-resize
- PPV price toggle/input
- Vault drawer integration (drag-drop media)
- Macros/snippets quick-select
- Send button with loading state
- Optimistic message creation

**Dependencies:**

- `useChatStore` for vault state
- `useFanvueChat` for sending
- Vault API endpoint (existing)

## Phase 4: Whale Priority Sorting

**Enhancement:** `src/hooks/use-chat-roster.ts` or new hook

**Requirements:**

- Sort by User Tier: Whale > Spender > Free
- Calculate tier from `fan_insights.total_spend` or `creator_top_spenders`
- Display LTV badge next to username
- Color coding: Gold (Whale), Silver (Spender), Grey (Free)

**Data Sources:**

- `fan_insights` table (has `total_spend`, `whaleScore`)
- `creator_top_spenders` table (has `gross_cents`, `net_cents`)
- Fanvue API `/insights/fans/{userUuid}` (has `spending.total`)

## Phase 5: Integration

**File:** `src/app/dashboard/messages/messages-client.tsx` (update existing)

**Changes:**

- Replace `useChatMessages` with `useFanvueChat`
- Replace message list with `VirtualMessageList`
- Replace input with `InputArea`
- Add whale priority sorting to roster

## Phase 6: Testing & Verification

- [ ] Test with 5,000+ messages (performance)
- [ ] Test optimistic updates (instant UI)
- [ ] Test rate limit handling (429 errors)
- [ ] Test whale sorting (tier calculation)
- [ ] Test vault integration (drag-drop)
- [ ] Test PPV sending (price validation)

## Definition of Done

1. ✅ Virtualized message list handles 5,000+ messages smoothly
2. ✅ Optimistic UI shows messages instantly before API confirmation
3. ✅ Whale Priority sorting works (Whale > Spender > Free)
4. ✅ Vault drawer opens and allows drag-drop media selection
5. ✅ Rate limit errors are handled gracefully (429 retry)
6. ✅ All TypeScript types are strict (no `any`)
7. ✅ No console errors or warnings

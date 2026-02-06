# Chat Engine Integration Plan

## Current State

- File: `src/app/dashboard/messages/messages-client.tsx` (742 lines)
- Uses basic ScrollArea for messages
- No virtualization (will lag with 623+ messages)
- No Whale Priority sorting
- Manual message sending (no optimistic UI)

## New Components Ready

1. ✅ `VirtualMessageList` - 5,000+ messages at 60fps
2. ✅ `InputArea` - Auto-resize, PPV, Vault integration
3. ✅ `useChatRosterWithWhalePriority` - Whale > Spender > Free sorting
4. ✅ `useFanvueChat` - TanStack Query with retries

## Integration Steps

### Step 1: Replace Message List

**Current:**

```tsx
<ScrollArea className="flex-1">
  {messages.map(msg => <MessageBubble key={msg.uuid} ... />)}
  <div ref={messagesEndRef} />
</ScrollArea>
```

**New:**

```tsx
<VirtualMessageList
  messages={messages}
  creatorUuid={selectedModel?.fanvue_user_uuid || null}
  onRetryMessage={retryMessage}
  onUnlockPPV={unlockPPV}
/>
```

### Step 2: Replace Input Area

**Current:**

```tsx
<Textarea value={messageInput} onChange={...} />
<Button onClick={sendMessage}>Send</Button>
```

**New:**

```tsx
<InputArea
  creatorUuid={selectedModel?.fanvue_user_uuid || null}
  fanUuid={selectedChat?.user.uuid || null}
  vaultAssets={vaultAssets}
/>
```

### Step 3: Add Whale Priority

**Current:**

```tsx
const { chats } = useChatRoster({...})
```

**New:**

```tsx
const { chats, sortedChats } = useChatRosterWithWhalePriority({
  creatorId: selectedModel?.id || null,
  filter,
  search: searchQuery,
})
// sortedChats: Whale (Gold) > Spender (Silver) > Free (Grey)
```

### Step 4: Add LTV Badges

Show tier badges in chat list:

- 🥇 Gold Crown = Whale ($1000+)
- 🥈 Silver = Spender ($100+)
- ⬜ Grey = Free

## Files to Modify

1. `src/app/dashboard/messages/messages-client.tsx` - Main integration
2. `src/hooks/use-chat-roster.ts` - Add tier calculation (or use new hook)

## Testing Checklist

- [ ] 623 messages load without lag
- [ ] Whale fans appear at top
- [ ] Optimistic message sending works
- [ ] PPV messages show lock/unlock
- [ ] Vault integration works
- [ ] Rate limit handling works

## Deployment

1. Merge new components
2. Test on staging
3. Deploy to production
4. Monitor performance metrics

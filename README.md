This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## High-Performance Chat Engine

OnyxOS includes a zero-latency chat interface optimized for managing thousands of conversations without UI lag.

### Key Features

#### 🚀 Performance

- **Virtualized Message List:** Uses `react-virtuoso` to render 5,000+ messages at 60fps
- **Optimistic UI:** Messages appear instantly before API confirmation
- **Smart Polling:** Reduces polling frequency when tab is inactive (saves rate limits)

#### 🐋 Whale Priority Queue

The chat sidebar automatically sorts conversations by **User Tier** (not just timestamp):

1. **Whale Tier** (Gold Badge)
   - Total spend ≥ $1,000 OR whaleScore ≥ 70
   - Highest priority - appears at top of list

2. **Spender Tier** (Silver Badge)
   - Total spend ≥ $100 OR whaleScore ≥ 40
   - Medium priority

3. **Free Tier** (Grey Badge)
   - Everyone else
   - Lowest priority

Within each tier, conversations are sorted by most recent message.

**Implementation:**

- Uses `useChatRosterWithWhalePriority` hook
- Fetches fan insights from `/api/fans/[fanId]` to calculate tier
- Displays LTV (Lifetime Value) badge next to username

#### 💰 Commercial Features

- **The Vault:** Drag-drop media drawer for quick PPV content selection
- **One-Click Upsells:** Macros/snippets for common messages
- **PPV Support:** Lock/unlock UI with price display

#### 🔄 State Management

- **TanStack Query:** Async server state (Fanvue API fetching)
- **Zustand:** Local UI state (optimistic updates, drafts, sidebar toggles)

### Architecture

```
src/
├── components/Chat/
│   ├── VirtualMessageList.tsx    # Virtualized message renderer
│   └── InputArea.tsx              # Input with PPV/Vault toggles
├── hooks/
│   ├── useFanvueChat.ts           # Central chat hook (TanStack Query)
│   └── useChatRosterWithWhalePriority.ts  # Whale priority sorting
└── store/
    └── chatStore.ts               # Zustand store for UI state
```

### Rate Limit Handling

The chat engine automatically handles Fanvue API rate limits (429 errors):

- Exponential backoff: 1s → 2s → 4s → 8s
- Up to 3 retry attempts
- Failed messages marked with retry option

### Usage Example

```tsx
import { useFanvueChat } from '@/hooks/useFanvueChat'
import { VirtualMessageList } from '@/components/Chat/VirtualMessageList'
import { InputArea } from '@/components/Chat/InputArea'

function ChatInterface({ creatorId, userUuid }) {
  const { messages, sendMessage, loading } = useFanvueChat({
    creatorId,
    userUuid,
    pollingInterval: 10000, // 10 seconds
  })

  return (
    <div className="flex flex-col h-screen">
      <VirtualMessageList messages={messages} />
      <InputArea onSend={sendMessage} />
    </div>
  )
}
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

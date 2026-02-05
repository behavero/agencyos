import { QuestsClient } from './quests-client'

export const metadata = {
  title: 'Quests | OnyxOS',
  description: 'Complete quests to earn XP and rewards',
}

export default function QuestsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quest Board</h1>
        <p className="text-zinc-500">Complete quests to earn XP and climb the leaderboard</p>
      </div>
      <QuestsClient />
    </>
  )
}

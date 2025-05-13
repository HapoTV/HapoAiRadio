import { usePlayerControl } from '@/hooks/usePlayerControl'

export const PlayerControl = () => {
  usePlayerControl({
    play: () => console.log('Play triggered'),
    pause: () => console.log('Pause triggered'),
    set_volume: (volume) => console.log(`Volume set to ${volume}`),
  })

  return null
}

import { supabase } from '@/lib/supabase'

const sendCommand = async (type: string, data?: any) => {
  await supabase.channel('player-control')
    .send({
      type: 'broadcast',
      event: 'command',
      payload: { type, data }
    })
}

export const DashboardControl = () => (
  <div className="space-x-4">
    <button onClick={() => sendCommand('play')} className="btn">Play</button>
    <button onClick={() => sendCommand('pause')} className="btn">Pause</button>
    <button onClick={() => sendCommand('set_volume', 0.75)} className="btn">Set Volume</button>
  </div>
)

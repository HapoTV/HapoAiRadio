import React from 'react';
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export const usePlayerControl = (handlers: Record<string, (data?: any) => void>) => {
  useEffect(() => {
    const channel = supabase.channel('player-control')

    channel.on('broadcast', { event: 'command' }, (payload) => {
      const { type, data } = payload.payload
      if (handlers[type]) {
        handlers[type](data)
      } else {
        console.warn(`Unhandled command type: ${type}`)
      }
    })

    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [handlers])
}

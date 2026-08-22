import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { HoopoeMark } from '../components/Icons.jsx'

export default function JoinLink({ profile }) {
  const { code } = useParams()
  const nav = useNavigate()
  const [err, setErr] = useState('')

  useEffect(() => {
    const run = async () => {
      const { data: room } = await supabase.from('rooms').select('*').eq('invite_code', code).maybeSingle()
      if (!room) { setErr('این لینک معتبر نیست.'); return }
      await supabase.from('room_members').upsert({ room_id: room.id, user_id: profile.id })
      nav(`/room/${room.id}`, { replace: true })
    }
    run()
  }, [code])

  return (
    <div className="screen enter" style={{ alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <HoopoeMark size={48} />
      {err ? <p style={{ color: 'var(--danger)' }}>{err}</p> : <span className="spinner" />}
    </div>
  )
}

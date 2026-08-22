import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { HoopoeMark, IconPlus, IconLogout, IconCopy, IconClose } from '../components/Icons.jsx'

export default function Rooms({ profile }) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [toast, setToast] = useState('')
  const nav = useNavigate()

  const load = async () => {
    setLoading(true)
    const { data: memberships } = await supabase
      .from('room_members').select('room_id, rooms(*)').eq('user_id', profile.id)
    setRooms((memberships || []).map(m => m.rooms).filter(Boolean).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const createRoom = async (e) => {
    e.preventDefault()
    const invite = Math.random().toString(36).slice(2, 9)
    const { data: room, error } = await supabase.from('rooms')
      .insert({ name: roomName.trim(), invite_code: invite, created_by: profile.id })
      .select().single()
    if (error) { showToast('ساخت روم ناموفق بود'); return }
    await supabase.from('room_members').insert({ room_id: room.id, user_id: profile.id })
    setShowCreate(false); setRoomName('')
    nav(`/room/${room.id}`)
  }

  const joinRoom = async (e) => {
    e.preventDefault()
    const code = joinCode.trim().toLowerCase()
    const { data: room } = await supabase.from('rooms').select('*').eq('invite_code', code).maybeSingle()
    if (!room) { showToast('لینک یا کد نامعتبر است'); return }
    await supabase.from('room_members').upsert({ room_id: room.id, user_id: profile.id })
    setShowJoin(false); setJoinCode('')
    nav(`/room/${room.id}`)
  }

  const copyLink = (invite) => {
    const link = `${window.location.origin}/join/${invite}`
    navigator.clipboard?.writeText(link)
    showToast('لینک کپی شد')
  }

  const logout = async () => { await supabase.auth.signOut() }

  return (
    <div className="screen enter">
      <div className="chat-header">
        <div className="brandmark" style={{ flex: 1 }}>
          <HoopoeMark size={32} />
          <span className="name" style={{ fontSize: 18 }}>هدهد</span>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{profile.name}</span>
        <button className="icon-btn" onClick={logout} title="خروج"><IconLogout /></button>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowCreate(true)}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><IconPlus /> روم جدید</span>
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowJoin(true)}>ورود با لینک/کد</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div className="empty"><span className="spinner" /></div>}
        {!loading && rooms.length === 0 && (
          <div className="empty">
            <HoopoeMark size={40} />
            <p>هنوز روومی نداری. یکی بساز و لینکش رو با بقیه به اشتراک بذار.</p>
          </div>
        )}
        {rooms.map(r => (
          <div key={r.id} className="room-card pop" onClick={() => nav(`/room/${r.id}`)}>
            <div className="room-avatar">{r.name?.slice(0, 1) || 'ه'}</div>
            <div className="room-meta">
              <h3>{r.name}</h3>
              <p>برای گفت‌وگو ضربه بزن</p>
            </div>
            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); copyLink(r.invite_code) }} title="کپی لینک دعوت">
              <IconCopy />
            </button>
          </div>
        ))}
      </div>

      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <h3 style={{ margin: '0 0 14px' }}>ساخت روم تازه</h3>
          <form onSubmit={createRoom}>
            <div className="field">
              <label>اسم روم</label>
              <input autoFocus type="text" placeholder="مثلاً دوستان دبیرستان" value={roomName} onChange={e => setRoomName(e.target.value)} required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}>ساخت روم</button>
          </form>
        </Modal>
      )}

      {showJoin && (
        <Modal onClose={() => setShowJoin(false)}>
          <h3 style={{ margin: '0 0 14px' }}>ورود به روم</h3>
          <form onSubmit={joinRoom}>
            <div className="field">
              <label>کد دعوت یا انتهای لینک</label>
              <input autoFocus type="text" dir="ltr" style={{ textAlign: 'left' }} placeholder="مثلاً a1b2c3d" value={joinCode} onChange={e => setJoinCode(e.target.value)} required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}>ورود</button>
          </form>
        </Modal>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 40 }} onClick={onClose}>
      <div className="pop" style={{ background: 'var(--panel)', borderRadius: '22px 22px 0 0', padding: 22, width: '100%', maxWidth: 520, border: '1px solid var(--line)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="icon-btn" onClick={onClose}><IconClose /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

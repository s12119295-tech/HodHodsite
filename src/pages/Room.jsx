import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  IconBack, IconSend, IconMic, IconStop, IconImage, IconVideo, IconMusic, IconPlus, IconCopy
} from '../components/Icons.jsx'

const BUCKET = 'media'

export default function Room({ profile }) {
  const { roomId } = useParams()
  const nav = useNavigate()
  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [toast, setToast] = useState('')
  const bodyRef = useRef(null)
  const mediaRecRef = useRef(null)
  const chunksRef = useRef([])
  const fileInputs = { image: useRef(), video: useRef(), audio: useRef() }

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2000) }

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const { data: r } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle()
      if (mounted) setRoom(r)
      const { data: msgs } = await supabase
        .from('messages').select('*, profiles(name, username)')
        .eq('room_id', roomId).order('created_at', { ascending: true }).limit(300)
      if (mounted) setMessages(msgs || [])
    }
    init()
    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const { data: full } = await supabase.from('messages').select('*, profiles(name, username)').eq('id', payload.new.id).single()
          setMessages(prev => [...prev, full])
        })
      .subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [roomId])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (kind, content, extra = {}) => {
    const { error } = await supabase.from('messages').insert({
      room_id: roomId, user_id: profile.id, kind, content, ...extra
    })
    if (error) showToast('ارسال ناموفق بود')
  }

  const onSubmitText = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    const t = text.trim()
    setText('')
    await sendMessage('text', t)
  }

  const uploadFile = async (file, kind) => {
    setUploading(true)
    const ext = file.name?.split('.').pop() || (kind === 'voice' ? 'webm' : 'bin')
    const path = `${roomId}/${profile.id}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
    if (upErr) { setUploading(false); showToast('آپلود ناموفق بود'); return }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    await sendMessage(kind, data.publicUrl)
    setUploading(false)
  }

  const onPickFile = (kind) => (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    setShowAttach(false)
    if (file) uploadFile(file, kind)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => chunksRef.current.push(e.data)
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        if (blob.size > 400) {
          const file = new File([blob], 'voice.webm', { type: 'audio/webm' })
          await uploadFile(file, 'voice')
        }
      }
      mediaRecRef.current = rec
      rec.start()
      setRecording(true)
    } catch {
      showToast('اجازه دسترسی به میکروفون داده نشد')
    }
  }
  const stopRecording = () => {
    mediaRecRef.current?.stop()
    setRecording(false)
  }

  const copyInvite = () => {
    if (!room) return
    navigator.clipboard?.writeText(`${window.location.origin}/join/${room.invite_code}`)
    showToast('لینک روم کپی شد')
  }

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="screen enter">
      <div className="chat-header">
        <button className="icon-btn" onClick={() => nav('/rooms')}><IconBack /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room?.name || '...'}</div>
        </div>
        <button className="icon-btn" onClick={copyInvite} title="کپی لینک دعوت"><IconCopy /></button>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {messages.length === 0 && (
          <div className="empty"><p>اولین پیام این روم رو بفرست.</p></div>
        )}
        {messages.map(m => {
          const mine = m.user_id === profile.id
          return (
            <div key={m.id} className={`bubble-row ${mine ? 'mine' : ''}`}>
              <div className="bubble">
                {!mine && <span className="sender">{m.profiles?.name || 'کاربر'}</span>}
                <MessageContent m={m} />
                <span className="time">{fmtTime(m.created_at)}</span>
              </div>
            </div>
          )
        })}
        {uploading && (
          <div className="bubble-row mine">
            <div className="bubble"><span className="spinner" /></div>
          </div>
        )}
      </div>

      <div className="chat-input">
        {recording ? (
          <>
            <div className="rec-indicator" style={{ flex: 1 }}>
              <span className="rec-dot" /> در حال ضبط صدا...
            </div>
            <button type="button" className="icon-btn active" onClick={stopRecording}><IconStop /></button>
          </>
        ) : (
          <>
            <button type="button" className="icon-btn" onClick={() => setShowAttach(s => !s)}><IconPlus /></button>
            <form onSubmit={onSubmitText} style={{ flex: 1, display: 'flex', gap: 8 }}>
              <input type="text" placeholder="پیام بنویس..." value={text} onChange={e => setText(e.target.value)} />
              {text.trim()
                ? <button type="submit" className="icon-btn active"><IconSend /></button>
                : <button type="button" className="icon-btn" onClick={startRecording}><IconMic /></button>}
            </form>
          </>
        )}
      </div>

      {showAttach && (
        <div style={{ display: 'flex', gap: 10, padding: '0 12px 14px', justifyContent: 'center' }} className="pop">
          <AttachBtn icon={<IconImage />} label="تصویر" onClick={() => fileInputs.image.current.click()} />
          <AttachBtn icon={<IconVideo />} label="ویدیو" onClick={() => fileInputs.video.current.click()} />
          <AttachBtn icon={<IconMusic />} label="آهنگ" onClick={() => fileInputs.audio.current.click()} />
        </div>
      )}
      <input ref={fileInputs.image} type="file" accept="image/*" hidden onChange={onPickFile('image')} />
      <input ref={fileInputs.video} type="file" accept="video/*" hidden onChange={onPickFile('video')} />
      <input ref={fileInputs.audio} type="file" accept="audio/*" hidden onChange={onPickFile('audio')} />

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function AttachBtn({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-ghost" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 18px' }}>
      {icon}
      <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  )
}

function MessageContent({ m }) {
  switch (m.kind) {
    case 'image': return <img src={m.content} alt="تصویر" loading="lazy" />
    case 'video': return <video src={m.content} controls />
    case 'audio': return <audio src={m.content} controls />
    case 'voice': return <audio src={m.content} controls />
    default: return <span>{m.content}</span>
  }
}

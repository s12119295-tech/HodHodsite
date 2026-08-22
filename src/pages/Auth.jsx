import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { HoopoeMark } from '../components/Icons.jsx'

export default function Auth({ needsProfile, onProfileSaved }) {
  const [step, setStep] = useState(needsProfile ? 'profile' : 'signup')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const randomPassword = () =>
    crypto.getRandomValues(new Uint8Array(24)).reduce((s, b) => s + b.toString(16), '')

  const doSignup = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)

    const uname = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (uname.length < 3) { setErr('نام کاربری باید حداقل ۳ حرف انگلیسی باشد.'); setBusy(false); return }
    const { data: taken } = await supabase.from('profiles').select('id').eq('username', uname).maybeSingle()
    if (taken) { setErr('این نام کاربری قبلاً گرفته شده.'); setBusy(false); return }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: randomPassword()
    })
    if (error) { setErr('ثبت‌نام ناموفق بود: ' + error.message); setBusy(false); return }

    if (!data.session) {
      setErr('لطفاً «Confirm email» را در تنظیمات Supabase خاموش کنید تا ورود فوری کار کند.')
      setBusy(false)
      return
    }

    const { data: prof, error: profErr } = await supabase.from('profiles').insert({
      id: data.user.id, name: name.trim(), username: uname, email: data.user.email
    }).select().single()
    setBusy(false)
    if (profErr) { setErr('ثبت پروفایل ناموفق بود.'); return }
    onProfileSaved(prof)
  }

  return (
    <div className="screen enter" style={{ padding: 24, justifyContent: 'center', gap: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="pop"><HoopoeMark size={64} /></div>
        <div className="name" style={{ fontSize: 28 }}>هدهد</div>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, textAlign: 'center', margin: 0 }}>
          پیام‌رسان ساده و سریع — گفت‌وگو، صدا، تصویر و ویدیو
        </p>
      </div>

      <div className="feather-divider" style={{ maxWidth: 140, alignSelf: 'center' }} />

      <form onSubmit={doSignup} className="pop">
        <div className="field">
          <label>ایمیل</label>
          <input
            type="email" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)} required
            dir="ltr" style={{ textAlign: 'left' }}
          />
        </div>
        <div className="field">
          <label>اسم شما</label>
          <input type="text" placeholder="مثلاً سارا احمدی" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>نام کاربری (فقط حروف انگلیسی و عدد)</label>
          <input type="text" placeholder="sara_a" dir="ltr" style={{ textAlign: 'left' }}
            value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        {err && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</p>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
          {busy ? <span className="spinner" /> : 'شروع کن'}
        </button>
      </form>
    </div>
  )
}

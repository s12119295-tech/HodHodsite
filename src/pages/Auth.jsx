import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { HoopoeMark } from '../components/Icons.jsx'

export default function Auth({ needsProfile, onProfileSaved }) {
  const [step, setStep] = useState(needsProfile ? 'profile' : 'phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const normalizePhone = (v) => {
    let p = v.trim().replace(/\s/g, '')
    if (p.startsWith('0')) p = '+98' + p.slice(1)
    if (!p.startsWith('+')) p = '+98' + p
    return p
  }

  const sendCode = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: normalizePhone(phone) })
    setBusy(false)
    if (error) { setErr('ارسال کد ناموفق بود. سرویس پیامک سوپابیس را تنظیم کرده‌اید؟'); return }
    setStep('code')
  }

  const verifyCode = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalizePhone(phone), token: code, type: 'sms'
    })
    setBusy(false)
    if (error) { setErr('کد نادرست است.'); return }
    const { data: existing } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
    if (existing) { onProfileSaved(existing); return }
    setStep('profile')
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    const uname = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (uname.length < 3) { setErr('نام کاربری باید حداقل ۳ حرف انگلیسی باشد.'); setBusy(false); return }
    const { data: taken } = await supabase.from('profiles').select('id').eq('username', uname).maybeSingle()
    if (taken) { setErr('این نام کاربری قبلاً گرفته شده.'); setBusy(false); return }
    const { data: prof, error } = await supabase.from('profiles').insert({
      id: user.id, name: name.trim(), username: uname, phone: user.phone
    }).select().single()
    setBusy(false)
    if (error) { setErr('ثبت پروفایل ناموفق بود.'); return }
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

      {step === 'phone' && (
        <form onSubmit={sendCode} className="pop">
          <div className="field">
            <label>شماره موبایل</label>
            <input
              type="tel" inputMode="numeric" placeholder="09xxxxxxxxx"
              value={phone} onChange={e => setPhone(e.target.value)} required
              dir="ltr" style={{ textAlign: 'left' }}
            />
          </div>
          {err && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? <span className="spinner" /> : 'دریافت کد تایید'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={verifyCode} className="pop">
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>کد ارسال‌شده به {phone} را وارد کنید</p>
          <div className="field">
            <label>کد تایید</label>
            <input
              type="text" inputMode="numeric" placeholder="------"
              value={code} onChange={e => setCode(e.target.value)} required
              dir="ltr" style={{ textAlign: 'left', letterSpacing: 4 }}
            />
          </div>
          {err && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? <span className="spinner" /> : 'تایید'}
          </button>
        </form>
      )}

      {step === 'profile' && (
        <form onSubmit={saveProfile} className="pop">
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
      )}
    </div>
  )
}

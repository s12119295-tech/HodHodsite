import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('متغیرهای VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY تنظیم نشده‌اند. فایل .env را بسازید (نمونه در .env.example).')
}

export const supabase = createClient(url || '', key || '')

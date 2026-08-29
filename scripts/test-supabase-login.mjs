import { createClient } from '@supabase/supabase-js'

async function testLogin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY

  console.log(`URL: ${url}`)
  console.log(`Key: ${key}`)

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@stem-quest.dev',
      password: 'Admin123456!',
    })

    if (error) {
      console.error('❌ Login Error:', error)
    } else {
      console.log('✅ Login Successful!')
      console.log('User ID:', data.user?.id)
      console.log('Access Token:', data.session?.access_token?.substring(0, 30) + '...')
    }
  } catch (err) {
    console.error('💥 Exception during login:', err)
  }
}

testLogin()

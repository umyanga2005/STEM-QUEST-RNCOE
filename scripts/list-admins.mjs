import { createClient } from '@supabase/supabase-js'

async function listAdmins() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return
  }

  const db = createClient(url, key, { auth: { persistSession: false } })

  const { data: users, error } = await db.auth.admin.listUsers()
  if (error) {
    console.error('Error listing users:', error)
    return
  }

  console.log('=== Supabase Auth Users ===')
  for (const user of users.users) {
    console.log(`Email: ${user.email} | ID: ${user.id}`)
  }

  const { data: admins } = await db.from('admins').select('*')
  console.log('=== public.admins Rows ===')
  console.log(admins)
}

listAdmins()

import { createClient } from '@supabase/supabase-js'

async function syncAdmins() {
  const url = process.env.SUPABASE_URL || 'https://fmauqixvdpdgrghuapfs.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  console.log('📡 Syncing all Supabase Auth users to public.admins table…')

  const { data: userList, error: listErr } = await db.auth.admin.listUsers()
  if (listErr) {
    console.error('❌ Failed to fetch users:', listErr.message)
    process.exit(1)
  }

  for (const user of userList.users) {
    console.log(`👤 Processing Auth user: ${user.email} (ID: ${user.id})`)
    const { error: upsertErr } = await db.from('admins').upsert({
      id: user.id,
      display_name: user.email.split('@')[0] || 'Administrator',
      role: 'admin',
      is_active: true,
    }, { onConflict: 'id' })

    if (upsertErr) {
      console.error(`  ❌ Failed for ${user.email}:`, upsertErr.message)
    } else {
      console.log(`  ✅ Successfully linked in public.admins!`)
    }
  }

  console.log('\n🎉 ALL SUPABASE AUTH USERS ARE NOW ACTIVE ADMINISTRATORS!')
}

syncAdmins().catch(console.error)

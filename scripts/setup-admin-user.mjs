import { createClient } from '@supabase/supabase-js'

async function setupAdmin() {
  const url = process.env.SUPABASE_URL || 'https://fmauqixvdpdgrghuapfs.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing in process.env')
    process.exit(1)
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const accountsToSetup = [
    { email: 'admin@stem-quest.dev', name: 'System Admin', role: 'super_admin' },
    { email: 'content-bank.approver@stem-quest.test', name: 'Question Bank Approver', role: 'admin' },
  ]
  const password = 'Admin123456!'

  console.log(`📡 Connecting to Supabase project: ${url}`)
  console.log(`🔍 Provisioning admin credentials…\n`)

  const { data: userList, error: listErr } = await db.auth.admin.listUsers()
  if (listErr) {
    console.error('❌ Failed to list users:', listErr.message)
    process.exit(1)
  }

  for (const acc of accountsToSetup) {
    let authUser = userList.users.find((u) => u.email === acc.email)

    if (authUser) {
      console.log(`✅ Updating password for existing account: ${acc.email}…`)
      const { error: updateErr } = await db.auth.admin.updateUserById(authUser.id, {
        password: password,
        email_confirm: true,
      })
      if (updateErr) console.error(`❌ Update failed for ${acc.email}:`, updateErr.message)
    } else {
      console.log(`➕ Creating new account: ${acc.email}…`)
      const { data: createData, error: createErr } = await db.auth.admin.createUser({
        email: acc.email,
        password: password,
        email_confirm: true,
      })
      if (createErr) {
        console.error(`❌ Creation failed for ${acc.email}:`, createErr.message)
        continue
      }
      authUser = createData.user
    }

    if (authUser?.id) {
      await db.from('admins').upsert({
        id: authUser.id,
        display_name: acc.name,
        role: acc.role,
        is_active: true,
      }, { onConflict: 'id' })
    }
  }

  console.log('\n==================================================')
  console.log('🎉 ALL ADMIN ACCOUNTS PROVISIONED SUCCESSFULLY!')
  console.log('==================================================')
  console.log(`   Password for all accounts: ${password}`)
  console.log('   Accounts ready for login:')
  console.log('     1. admin@stem-quest.dev')
  console.log('     2. content-bank.approver@stem-quest.test')
  console.log('==================================================\n')
}

setupAdmin().catch((e) => {
  console.error('💥 Error:', e)
  process.exit(1)
})

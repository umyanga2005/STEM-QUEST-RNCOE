#!/usr/bin/env node
/**
 * STEM QUEST — Create Administrator Account Script.
 *
 * Provision an administrator account in Supabase Auth & public.admins table.
 *
 * Usage:
 *   node scripts/create-admin.mjs <email> <password> [displayName] [role]
 *
 * Example:
 *   node scripts/create-admin.mjs admin@stem-quest.dev s3cretAdmin! "System Admin" super_admin
 */

import { createClient } from '@supabase/supabase-js'

async function main() {
  const [,, email, password, displayName = 'System Admin', role = 'super_admin'] = process.argv

  if (!email || !password) {
    console.error('❌ Error: Email and password are required.')
    console.log('\nUsage:\n  node scripts/create-admin.mjs <email> <password> [displayName] [role]\n')
    process.exit(1)
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
    process.exit(1)
  }

  console.log(`📡 Connecting to Supabase project at ${url}…`)
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  console.log(`👤 Creating Auth user for email: ${email}…`)
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  let userId = authData?.user?.id

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log(`⚠️ Auth user already exists. Fetching user ID…`)
      const { data: usersData, error: listError } = await db.auth.admin.listUsers()
      if (listError) throw listError
      const existingUser = usersData.users.find((u) => u.email === email)
      if (!existingUser) throw new Error(`User not found in user list despite error.`)
      userId = existingUser.id
    } else {
      console.error(`❌ Auth error:`, authError.message)
      process.exit(1)
    }
  }

  console.log(`🔑 Auth User ID: ${userId}`)
  console.log(`🛡️ Granting admin privileges in public.admins…`)

  const { data: adminRow, error: adminErr } = await db
    .from('admins')
    .upsert({
      id: userId,
      display_name: displayName,
      role: role,
      is_active: true,
    }, { onConflict: 'id' })
    .select()

  if (adminErr) {
    console.error(`❌ Database insert error:`, adminErr.message)
    process.exit(1)
  }

  console.log(`\n✅ Administrator Account Provisioned Successfully!`)
  console.log(`   Email:        ${email}`)
  console.log(`   Display Name: ${displayName}`)
  console.log(`   Role:         ${role}`)
  console.log(`   User ID:      ${userId}\n`)
}

main().catch((err) => {
  console.error('💥 Unexpected error:', err.message)
  process.exit(1)
})

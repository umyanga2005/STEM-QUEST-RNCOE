/**
 * Content Bank pipeline helpers (Task 5.14). Shared wiring for the admin
 * setup, media upload, import, review and verify steps. All DB access flows
 * through the service-role client / QuestionService (no direct table writes
 * for questions), mirroring the production composition in production-server.js.
 */
import { createClient } from '@supabase/supabase-js'
import { createSupabaseQuestionRepositories } from '../../src/features/admin/questions/repositories/supabase.js'
import { QuestionService } from '../../src/features/admin/questions/service/question-service.js'
import { createQuestionValidator } from '../../src/features/admin/questions/validation/question-validator.js'
import { contentHash } from './content-validator.mjs'

export const AUTHOR_EMAIL = 'content-bank.author@stem-quest.test'
export const APPROVER_EMAIL = 'content-bank.approver@stem-quest.test'
export const AUTHOR_SOURCE = 'stem-quest-task-5.14-batch-1'

import { readFileSync, existsSync } from 'node:fs'

export function requireEnv() {
  if (!process.env.SUPABASE_URL && existsSync('.env')) {
    const envText = readFileSync('.env', 'utf8')
    for (const line of envText.split('\n')) {
      const match = line.match(/^\s*([\w]+)\s*=\s*(.*)\s*$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
      }
    }
  }
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  return { url, key }
}


export function createDb() {
  const { url, key } = requireEnv()
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function createQuestionService(db) {
  const repos = createSupabaseQuestionRepositories({ client: db })
  return {
    service: new QuestionService({
      questionRepository: repos.questionRepository,
      catalogueRepository: repos.catalogueRepository,
      validator: createQuestionValidator(),
      adminActionRepository: repos.adminActionRepository,
      mediaRepository: repos.mediaRepository,
    }),
    repos,
  }
}

/** Content modules (stream → level → module file). */
export const CONTENT_MODULES = (() => {
  const streams = {
    mathematics: ['l1', 'l2', 'l3', 'l4', 'l5'],
    science: ['l1', 'l2', 'l3', 'l4', 'l5'],
    technology: ['l1', 'l2', 'l3', 'l4', 'l5'],
    engineering: ['l1', 'l2', 'l3', 'l4', 'l5'],
  }
  const out = []
  for (const [stream, levels] of Object.entries(streams)) {
    for (const level of levels) out.push({ stream, level, file: `./content/${stream}-${level}.mjs` })
  }
  return out
})()

/** Loads every authored record in deterministic order. */
export async function loadAllRecords() {
  const records = []
  const sources = []
  for (const mod of CONTENT_MODULES) {
    const module = await import(mod.file)
    for (const record of module.default) {
      records.push(record)
      sources.push(`${mod.stream}-${mod.level}`)
    }
  }
  return { records, sources }
}

/** Injects meta.authoring.contentHash (64-hex) into a record (dedupe key). */
export function stampContentHash(record) {
  const hash = contentHash(record)
  const authoring = { ...(record.meta?.authoring ?? {}), contentHash: hash }
  return { ...record, meta: { ...(record.meta ?? {}), authoring } }
}

/** Resolves an admin identity: reuse the auth user + admins row if present. */
export async function resolveAdmin(db, authDb, { email, displayName, role }) {
  const { data: list, error } = await authDb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`admin listUsers failed: ${error.message}`)
  const existing = list?.users?.find((u) => u.email === email) ?? null
  let authUserId
  let password = null
  if (existing) {
    authUserId = existing.id
  } else {
    const passwordChars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    password = Array.from({ length: 16 }, () => passwordChars[Math.floor(Math.random() * passwordChars.length)]).join('')
    const created = await authDb.auth.admin.createUser({ email, password, email_confirm: true })
    if (created.error) throw new Error(`admin createUser failed: ${created.error.message}`)
    authUserId = created.data.user.id
  }
  const { data: row } = await db.from('admins').select('id, display_name, role, is_active').eq('id', authUserId).maybeSingle()
  if (!row) {
    const { error: insertErr } = await db.from('admins').insert({ id: authUserId, display_name: displayName, role, is_active: true })
    if (insertErr) throw new Error(`admins insert failed: ${insertErr.message}`)
  } else if (row.is_active !== true) {
    await db.from('admins').update({ is_active: true, role }).eq('id', authUserId)
  }
  return { id: authUserId, email, displayName, role, password }
}

/** Fetches every stored question row with our author source (fresh). */
export async function fetchBankRows(db) {
  const { data, error } = await db
    .from('questions')
    .select('*, streams(slug), levels(number), activity_types(slug)')
    .not('meta->authoring->>authorSource', 'is', null)
    .order('id', { ascending: true })
  if (error) throw new Error(`questions list failed: ${error.message}`)
  return data ?? []
}

/** Collected media refs used across the authored content. */
export function collectMediaRefsFromRecords(records) {
  const refs = new Set()
  const collect = (value) => {
    if (Array.isArray(value)) { for (const v of value) collect(v); return }
    if (value && typeof value === 'object') {
      if (typeof value.ref === 'string' && value.ref.startsWith('question-media/')) refs.add(value.ref)
      for (const v of Object.values(value)) collect(v)
    }
  }
  for (const r of records) collect(r.payload)
  return [...refs]
}
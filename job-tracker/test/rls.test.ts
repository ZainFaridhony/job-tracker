import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  admin, anonClient, createUser, clientFor, promoteToAdmin, deleteUser, uniqueEmail,
} from './helpers/users.js'

const emailA = uniqueEmail('alice')
const emailB = uniqueEmail('bob')
const emailAdmin = uniqueEmail('root')
let idA = ''
let idB = ''
let idAdmin = ''

beforeAll(async () => {
  idA = (await createUser(emailA, undefined, { fullName: 'Alice Example' })).id
  idB = (await createUser(emailB)).id
  idAdmin = (await createUser(emailAdmin)).id
  await promoteToAdmin(idAdmin)
})

afterAll(async () => {
  for (const id of [idA, idB, idAdmin]) await deleteUser(id)
})

describe('FR-3 — tenant isolation', () => {
  it('gives a user their own profile', async () => {
    const c = await clientFor(emailA)
    const { data, error } = await c.from('profiles').select('id, full_name').eq('id', idA)
    expect(error).toBeNull()
    expect(data).toEqual([{ id: idA, full_name: 'Alice Example' }])
  })

  it('returns zero rows for another user, not an error', async () => {
    const c = await clientFor(emailA)
    const { data, error } = await c.from('profiles').select('id').eq('id', idB)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('leaks nothing through an unfiltered select', async () => {
    const c = await clientFor(emailA)
    const { data } = await c.from('profiles').select('id')
    expect(data?.map((r) => r.id)).toEqual([idA])
  })

  it('gives an anonymous client nothing', async () => {
    const { data } = await anonClient().from('profiles').select('id')
    expect(data ?? []).toEqual([])
  })
})

describe('FR-45 — role cannot be self-assigned', () => {
  it('rejects a user promoting themselves', async () => {
    const c = await clientFor(emailA)
    const { error } = await c.from('profiles').update({ role: 'admin' }).eq('id', idA)
    expect(error).not.toBeNull()
  })

  it('leaves the role untouched after the attempt', async () => {
    const { data } = await admin.from('profiles').select('role').eq('id', idA).single()
    expect(data?.role).toBe('user')
  })

  it('still allows a user to update the columns they own', async () => {
    const c = await clientFor(emailA)
    const { error } = await c
      .from('profiles')
      .update({ full_name: 'Alice Renamed', onboarding_complete: true })
      .eq('id', idA)
    expect(error).toBeNull()
    const { data } = await admin.from('profiles').select('full_name').eq('id', idA).single()
    expect(data?.full_name).toBe('Alice Renamed')
  })

  it('rejects a role change even when smuggled alongside a permitted column', async () => {
    const c = await clientFor(emailA)
    const { error } = await c
      .from('profiles')
      .update({ full_name: 'Nice Try', role: 'admin' })
      .eq('id', idA)
    expect(error).not.toBeNull()
  })
})

describe('admin read access', () => {
  it('lets an admin read other users without recursion', async () => {
    const c = await clientFor(emailAdmin)
    const { data, error } = await c.from('profiles').select('id')
    // A recursive policy would surface here as 42P17, not as an empty result.
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(3)
    expect(data!.map((r) => r.id)).toContain(idB)
  })
})

describe('profile creation trigger', () => {
  it('creates exactly one row carrying the signup metadata', async () => {
    const user = await createUser(uniqueEmail('trigger'), undefined, { fullName: 'Trigger Case' })
    const { data } = await admin.from('profiles').select('*').eq('id', user.id)
    expect(data).toHaveLength(1)
    expect(data![0]!.full_name).toBe('Trigger Case')
    expect(data![0]!.role).toBe('user')
    expect(data![0]!.accepted_terms_at).not.toBeNull()
    await deleteUser(user.id)
  })

  it('leaves accepted_terms_at null when terms were not accepted', async () => {
    const user = await createUser(uniqueEmail('noterms'), undefined, { acceptedTerms: false })
    const { data } = await admin
      .from('profiles')
      .select('accepted_terms_at')
      .eq('id', user.id)
      .single()
    expect(data?.accepted_terms_at).toBeNull()
    await deleteUser(user.id)
  })

  it('removes the profile when the user is deleted', async () => {
    const user = await createUser(uniqueEmail('cascade'))
    await deleteUser(user.id)
    const { data } = await admin.from('profiles').select('id').eq('id', user.id)
    expect(data).toEqual([])
  })
})

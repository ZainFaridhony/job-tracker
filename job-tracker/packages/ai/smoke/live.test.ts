/**
 * Live Groq call. NOT part of `turbo test` — it costs money and needs a key.
 * Outside src/, so the default include misses it. Run deliberately:
 *
 *   cd apps/dashboard && set -a && . ./.env.local && set +a && cd ../..
 *   pnpm --filter @job-tracker/ai exec vitest run smoke/live.test.ts
 *
 * Its job is catching model drift: gpt-oss-120b changing how it honours strict
 * json_schema would break extraction silently, and no mocked test would notice.
 */
import { describe, it, expect } from 'vitest'
import { createGroqExtractor } from '../src/extract-profile'

const CV = `
Faridhony Zain — Senior Backend Engineer
Jakarta, Indonesia

EXPERIENCE
Senior Backend Engineer, Qiscus (2021 - present)
  Built multi-tenant messaging infrastructure in Go and PostgreSQL.
  Led migration from monolith to services; introduced Kafka.
Backend Engineer, Tokopedia (2018 - 2021)
  Payment reconciliation services in Go. Redis, gRPC.

SKILLS
Go, PostgreSQL, Kafka, Redis, gRPC, Docker, Kubernetes, Terraform

EDUCATION
BSc Computer Science, Universitas Indonesia (2014 - 2018)
`

describe.skipIf(!process.env.GROQ_API_KEY)('live Groq extraction', () => {
  it('extracts real titles and skills, and invents nothing', async () => {
    const out = await createGroqExtractor().extract(CV)
    console.log('  extracted:', JSON.stringify(out))

    expect(out.targetRoles.join(' ').toLowerCase()).toMatch(/backend/)
    expect(out.skills.map((s) => s.toLowerCase())).toContain('go')
    // 2018 -> now is ~7-8 years; the CV states the dates so this is extraction.
    expect(out.yearsExperience).toBeGreaterThanOrEqual(5)
    expect(out.yearsExperience).toBeLessThanOrEqual(12)

    // Nothing the CV never mentions may appear.
    const all = [...out.targetRoles, ...out.skills].join(' ').toLowerCase()
    for (const absent of ['rust', 'php', 'designer', 'salesforce']) {
      expect(all, `invented "${absent}"`).not.toContain(absent)
    }
  }, 60_000)

  it('returns an empty profile for an unreadable file rather than guessing', async () => {
    const out = await createGroqExtractor().extract('%PDF-1.4 \n garbage')
    expect(out).toEqual({ targetRoles: [], skills: [], yearsExperience: null })
  }, 30_000)
})

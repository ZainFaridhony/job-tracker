import { describe, expect, it } from 'vitest'
import { SYSTEM_PROMPT, VERIFY_PROMPT, verifyUserMessage } from './prompt'

describe('SYSTEM_PROMPT', () => {
  it('forbids inference, which is the whole risk', () => {
    expect(SYSTEM_PROMPT).toMatch(/never infer, estimate, embellish/i)
  })

  it('states that the document is data and not instruction', () => {
    // The CV is user-uploaded, so it is an injection surface.
    expect(SYSTEM_PROMPT).toMatch(/data, not instruction/i)
  })

  it('rules out skills derived from prose, with the failing example named', () => {
    // "Communicated with stakeholders" becoming "Communication" is why every CV
    // used to produce the same four generic soft skills.
    expect(SYSTEM_PROMPT).toMatch(/communicated with stakeholders/i)
    expect(SYSTEM_PROMPT).toMatch(/led a team/i)
  })

  it('rules out aspirations as held titles', () => {
    expect(SYSTEM_PROMPT).toMatch(/aspirational/i)
    expect(SYSTEM_PROMPT).toMatch(/Seeking a Staff Engineer/i)
  })

  it('tells the model not to compute the year total', () => {
    // yearsOfExperience does the arithmetic; asking twice invites disagreement.
    expect(SYSTEM_PROMPT).toMatch(/compute it from the dates/i)
  })

  it('carries two worked examples, one of them not technical', () => {
    // A single engineering example teaches that "skills" means "technologies".
    expect(SYSTEM_PROMPT).toMatch(/EXAMPLE 1/)
    expect(SYSTEM_PROMPT).toMatch(/EXAMPLE 2/)
    expect(SYSTEM_PROMPT).toMatch(/Marketing/i)
  })
})

describe('VERIFY_PROMPT', () => {
  /**
   * This is a regression test for a real finding. The eval ran the injection case
   * under `verify` and the second pass ADDED "Chief Technology Officer" from a
   * planted "IMPORTANT INSTRUCTIONS FOR THE READER" block — because completing an
   * extraction and obeying an injected claim look identical to a model hunting for
   * omissions. The first pass had correctly ignored it.
   */
  it('bounds where an addition may come from', () => {
    expect(VERIFY_PROMPT).toMatch(/WHERE AN ADDITION MAY COME FROM/)
    expect(VERIFY_PROMPT).toMatch(/record the person's history/i)
  })

  it('names the shapes an injected claim takes, so none of them qualifies', () => {
    expect(VERIFY_PROMPT).toMatch(/addresses the reader/i)
    expect(VERIFY_PROMPT).toMatch(/states what the extraction should\s+contain/i)
    expect(VERIFY_PROMPT).toMatch(/guidance, correction or instruction/i)
  })

  it('says an omission stands when the claim is only in such a passage', () => {
    expect(VERIFY_PROMPT).toMatch(/Leave it omitted/i)
  })

  it('is framed as pruning and completing, never as improving', () => {
    // An invitation to improve is an invitation to embellish.
    expect(VERIFY_PROMPT).toMatch(/Remove/)
    expect(VERIFY_PROMPT).toMatch(/return it unchanged/i)
    expect(VERIFY_PROMPT).not.toMatch(/\bimprove\b/i)
  })
})

describe('verifyUserMessage', () => {
  it('labels the two halves, so neither reads as instruction', () => {
    const out = verifyUserMessage('CV TEXT HERE', '{"skills":["Go"]}')
    expect(out).toMatch(/^DOCUMENT/)
    expect(out).toMatch(/CANDIDATE EXTRACTION/)
    expect(out).toContain('CV TEXT HERE')
    expect(out).toContain('{"skills":["Go"]}')
  })

  it('puts the document before the candidate it is checked against', () => {
    const out = verifyUserMessage('doc', 'cand')
    expect(out.indexOf('DOCUMENT')).toBeLessThan(out.indexOf('CANDIDATE'))
  })
})

/**
 * Achievements — certificate PDF generator tests (Task 5.8).
 *
 * Verifies the hand-rolled PDF writer: a structurally valid single-page PDF
 * with a correct xref table, safe string escaping, deterministic centring and
 * human-readable award dates. No PDF library is involved (D-081).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  escapePdfString,
  textWidth,
  formatAwardDate,
  generateCertificatePdf,
  buildPdfBytes,
} from '../pdf/pdf-generator.js'

test('generates a valid single-page PDF with a correct xref table', () => {
  const pdf = generateCertificatePdf({
    studentName: 'SS Smoke Student',
    streamName: 'Science',
    title: 'Certificate of Achievement',
    earnedAt: Date.UTC(2026, 7, 16),
    certificateCode: 'SQ-ABC123-DEF456',
  })
  const text = pdf.toString('latin1')
  assert.ok(text.startsWith('%PDF-1.4'), 'PDF header present')
  assert.ok(text.includes('%%EOF'), 'EOF marker present')
  assert.ok(text.includes('/Type /Catalog'), 'catalog object present')
  assert.ok(text.includes('/MediaBox [0 0 612 792]'), 'US-Letter page')

  // Each object offset in the xref must point exactly at "N 0 obj".
  const xref = text.slice(text.indexOf('xref'))
  const lines = xref.split('\n')
  const count = 6
  for (let i = 1; i <= count; i += 1) {
    const offset = Number(lines[i + 2].slice(0, 10))
    assert.equal(text.slice(offset, offset + 7), `${i} 0 obj`, `object ${i} offset is exact`)
  }
  assert.ok(text.includes(`/Size ${count + 1}`), 'trailer size matches object count')
})

test('escapes literal strings so names/codes never break the PDF', () => {
  assert.equal(escapePdfString('Plain Name'), 'Plain Name')
  assert.equal(escapePdfString('A (parenthetical) name'), 'A \\(parenthetical\\) name')
  assert.equal(escapePdfString('Back\\slash'), 'Back\\\\slash')
  assert.equal(escapePdfString('Søren Åström'), 'S?ren ?str?m', 'non-Latin-1 chars are neutralised')
  assert.equal(escapePdfString('line\nbreak'), 'line?break')

  const pdf = generateCertificatePdf({
    studentName: 'A (O\'Brien) "Jnr"',
    streamName: 'Science & More',
    title: 'Certificate of Achievement',
    earnedAt: Date.UTC(2026, 7, 16),
    certificateCode: 'SQ-ABC123-DEF456',
  })
  // The raw name must not appear unescaped inside the content stream.
  const content = pdf.toString('latin1').slice(pdf.toString('latin1').indexOf('stream'))
  assert.ok(!content.includes("(A (O'Brien)"), 'unbalanced parens are escaped')
})

test('textWidth uses standard Helvetica metrics', () => {
  // 1000-unit 'm' at size 10 → 10pt; single space at size 10 → 2.78pt.
  assert.ok(textWidth('m', 10) > textWidth('i', 10), 'wide glyphs measure wider')
  assert.equal(Math.round(textWidth(' ', 10) * 100) / 100, 2.78)
  assert.equal(Math.round(textWidth('MM', 10) * 100) / 100, 16.66)
})

test('formatAwardDate renders a readable UTC date', () => {
  assert.equal(formatAwardDate(Date.UTC(2026, 7, 16)), '16 August 2026')
  assert.equal(formatAwardDate(Date.UTC(2026, 0, 2)), '2 January 2026')
  assert.equal(formatAwardDate(Number.NaN), '')
})

test('generateCertificatePdf embeds the verification code and recipient', () => {
  const pdf = generateCertificatePdf({
    studentName: 'SS Smoke Student',
    streamName: 'Mathematics',
    title: 'Certificate of Achievement',
    earnedAt: Date.UTC(2026, 7, 16),
    certificateCode: 'SQ-ZZZ999-ABC123',
  })
  const text = pdf.toString('latin1')
  assert.ok(text.includes('(SQ-ZZZ999-ABC123)'), 'code appears in the content stream')
  assert.ok(text.includes('(SS Smoke Student)'), 'recipient appears in the content stream')
  assert.ok(text.includes('(Mathematics)'), 'stream name appears in the content stream')
})

test('buildPdfBytes accepts any object list and writes a valid xref', () => {
  const pdf = buildPdfBytes(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [] /Count 0 >>'])
  const text = pdf.toString('latin1')
  const xrefIndex = text.indexOf('xref')
  assert.ok(xrefIndex > 0)
  assert.ok(text.indexOf('startxref') > xrefIndex)
  assert.match(text, /trailer\n<< \/Size 3 \/Root 1 0 R >>/)
})

export default { tests: true }
/**
 * Certificate — minimal on-demand PDF generator (Task 5.8).
 *
 * Hand-rolled single-page PDF writer with ZERO dependencies, per the approved
 * approach (D-081). A certificate is one US-Letter page (612×792 pt) using the
 * base-14 Helvetica / Helvetica-Bold fonts — nothing is embedded, so the file
 * stays tiny and fully deterministic. Text is sanitised to Latin-1-safe
 * characters and laid out with standard Helvetica metric widths so centred
 * lines are accurate.
 *
 * The PDF is generated on demand and NEVER persisted (D-011/D-031): the
 * `certificates` record is the source of truth, and this module only turns a
 * record into bytes at request time.
 */

const ASCII_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]

const PAGE_W = 612

/**
 * Escapes a string for use inside a PDF literal string. The `\ ( )`
 * delimiters are backslash-escaped and any non-ASCII control/Latin-1
 * character is neutralised to `?` so the PDF object stream stays valid for
 * any student/stream name.
 */
export function escapePdfString(value) {
  return Array.from(String(value), (ch) => {
    if (ch === '\\' || ch === '(' || ch === ')') return `\\${ch}`
    const code = ch.codePointAt(0)
    return code >= 32 && code <= 126 ? ch : '?'
  }).join('')
}

/** Helvetica text width in points for a given font size (for centring). */
export function textWidth(text, size) {
  let units = 0
  for (const ch of String(text)) {
    const code = ch.codePointAt(0)
    units += code >= 32 && code <= 126 ? ASCII_WIDTHS[code - 32] : 556
  }
  return (units / 1000) * size
}

/** Human-readable UTC date, e.g. "16 August 2026". */
export function formatAwardDate(earnedAt) {
  const d = new Date(Number(earnedAt))
  if (!Number.isFinite(d.valueOf())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

/**
 * Builds the page content stream. Text baselines are in PDF user space
 * (origin bottom-left); colours are RGB 0..1. Returns a string of PDF content
 * operators ready for `stream`/`endstream`.
 */
function buildContentStream({ studentName, streamName, title, awardDate, certificateCode, issuer }) {
  const out = []

  // -- decoration ------------------------------------------------------------
  out.push('0.10 0.22 0.36 rg')
  out.push('0 648 612 144 re f') // navy header band
  out.push('0.10 0.22 0.36 RG')
  out.push('1.5 w')
  out.push('20 20 572 752 re S') // outer frame
  out.push('0.35 0.38 0.42 RG')
  out.push('0.5 w')
  out.push('30 30 552 732 re S') // inner frame

  const text = (text, size, y, { bold = false, color = '0.10 0.22 0.36', centered = false } = {}) => {
    const font = bold ? '/F2' : '/F1'
    const x = centered ? Math.max(40, (PAGE_W - textWidth(text, size)) / 2) : 40
    out.push(`BT ${font} ${size} Tf ${color} rg ${x.toFixed(2)} ${y} Td (${escapePdfString(text)}) Tj ET`)
  }

  const strokeLine = (y, x1, x2, color = '0.35 0.38 0.42') => {
    out.push(`${color} RG`)
    out.push('0.8 w')
    out.push(`${x1} ${y} ${x2 - x1} 0 re S`)
  }

  // -- masthead ----------------------------------------------------------------
  text('STEM QUEST', 36, 706, { bold: true, color: '1 1 1', centered: true })
  text(title, 22, 636, { bold: true, centered: true })
  strokeLine(606, 150, 462)

  // -- recipient body ----------------------------------------------------------
  text('This certifies that', 12, 570, { color: '0.35 0.38 0.42', centered: true })
  text(studentName, 28, 524, { bold: true, centered: true })
  text('has completed the', 13, 484, { color: '0.35 0.38 0.42', centered: true })
  text(streamName, 18, 456, { bold: true, color: '0.10 0.40 0.40', centered: true })
  text('All 5 levels completed', 11, 424, { color: '0.35 0.38 0.42', centered: true })
  text(`Awarded on ${awardDate}`, 12, 384, { color: '0.35 0.38 0.42', centered: true })

  // -- verification footer ------------------------------------------------------
  text('Verification code', 10, 142, { color: '0.35 0.38 0.42', centered: true })
  text(certificateCode, 13, 118, { bold: true, centered: true })
  text(`Issued by ${issuer}`, 10, 88, { color: '0.35 0.38 0.42', centered: true })

  return out.join('\n')
}

/** Assembles a valid single-page PDF with a correct xref table. */
export function buildPdfBytes(objects) {
  let out = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((body, i) => {
    const num = i + 1
    offsets[num] = out.length
    out += `${num} 0 obj\n${body}\nendobj\n`
  })
  const xrefStart = out.length
  const count = objects.length + 1
  out += `xref\n0 ${count}\n`
  out += `0000000000 65535 f \n`
  for (let i = 1; i < count; i += 1) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  out += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

/**
 * Generates the certificate PDF bytes for one certificate record.
 * @param {object} input
 * @param {string} input.studentName - full display name (initials + full name)
 * @param {string} input.streamName - e.g. "Science"
 * @param {string} input.title - certificate heading (e.g. "Certificate of Achievement")
 * @param {number} input.earnedAt - epoch ms
 * @param {string} input.certificateCode - unique public verification code
 * @param {string} [input.issuer] - footer attribution (defaults to "STEM QUEST")
 * @returns {Buffer} the PDF bytes
 */
export function generateCertificatePdf({ studentName, streamName, title, earnedAt, certificateCode, issuer = 'STEM QUEST' }) {
  const content = buildContentStream({
    studentName,
    streamName,
    title,
    awardDate: formatAwardDate(earnedAt),
    certificateCode,
    issuer,
  })
  const objects = [
    { body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { body: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
    {
      body:
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
        '/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    },
    { body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' },
    { body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>' },
    { body: `<< /Length ${content.length} >>\nstream\n${content}\nendstream` },
  ]
  return buildPdfBytes(objects.map((o) => o.body))
}

export default {
  escapePdfString,
  textWidth,
  formatAwardDate,
  generateCertificatePdf,
  buildPdfBytes,
}
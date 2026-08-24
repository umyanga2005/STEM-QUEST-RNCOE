import { useState } from 'react'
import './admin.css'

export default function AdminStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)

  const mockStudents = [
    { id: 1, name: 'UMAYANGA KARUNARATHNA', grade: 'Grade 8 (Level 1–5)', kioskCode: 'SQ-8A2F', registered: '2026-08-23', missions: 4, status: 'Active' },
    { id: 2, name: 'DEMO STUDENT', grade: 'Grade 6 (Level 1)', kioskCode: 'SQ-3K9X', registered: '2026-08-24', missions: 2, status: 'Active' },
    { id: 3, name: 'NIMESH PERERA', grade: 'Grade 7 (Level 2)', kioskCode: 'SQ-7M4P', registered: '2026-08-22', missions: 5, status: 'Active' },
    { id: 4, name: 'SITHUMINI SILVA', grade: 'Grade 9 (Level 4)', kioskCode: 'SQ-9B1Q', registered: '2026-08-21', missions: 8, status: 'Active' },
  ]

  const filteredStudents = mockStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.kioskCode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <section className="adm-panel aq-page">
      <div className="aq-page__top">
        <div>
          <h3>Student Accounts & Kiosk Codes</h3>
          <p className="adm-subtitle">Overview of registered kiosk students, active profiles, and 4-digit login access codes.</p>
        </div>
      </div>

      <div className="adm-toolbar">
        <input
          type="search"
          className="adm-search"
          placeholder="Search students by name or Kiosk Code (e.g. SQ-8A2F)…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Kiosk Login Code</th>
              <th>Grade Level</th>
              <th>Registered Date</th>
              <th>Missions Completed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td className="adm-td--bold">{student.name}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <code style={{ background: 'rgba(45, 212, 191, 0.15)', color: '#2dd4bf', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 'bold' }}>
                      {student.kioskCode}
                    </code>
                    <button
                      type="button"
                      className="aq-btn aq-btn--bare"
                      onClick={() => handleCopyCode(student.kioskCode)}
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                    >
                      {copiedCode === student.kioskCode ? 'Copied!' : '📋 Copy'}
                    </button>
                  </div>
                </td>
                <td>{student.grade}</td>
                <td>{student.registered}</td>
                <td>{student.missions} Missions</td>
                <td><span className="aq-status aq-status--published">{student.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

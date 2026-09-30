import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './ContactPanel.css'

// Messages arrive at this address. The form posts to FormSubmit (formsubmit.co),
// a free relay that forwards each submission to the inbox - no server needed.
// NOTE: the very first submission makes FormSubmit email this address an
// activation link; click it once and every later message is delivered.
const CONTACT_EMAIL = 'yiiyiiyy.8@gmail.com'
const ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`

const EXIT_MS = 520

const TYPES = ['채용 제안', '협업 제안', '기타 문의']

// A card that glides in from the right; its fields rise in one after another.
function ContactPanel({ onClose }) {
  const [entered, setEntered] = useState(false)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const closing = useRef(false)
  const firstRef = useRef(null)
  const scrimRef = useRef(null)
  const formRef = useRef(null)

  const requestClose = useCallback(() => {
    if (closing.current) return
    closing.current = true
    setEntered(false)
    window.setTimeout(onClose, EXIT_MS)
  }, [onClose])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setEntered(true)
      firstRef.current?.focus({ preventScroll: true })
    }, 30) // lets the slide start from off-screen
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)

    // freeze the page behind the scrim without touching the scrollbar (no layout shift)
    const scrim = scrimRef.current
    const stop = (e) => e.preventDefault()
    scrim.addEventListener('wheel', stop, { passive: false })
    scrim.addEventListener('touchmove', stop, { passive: false })
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      scrim.removeEventListener('wheel', stop)
      scrim.removeEventListener('touchmove', stop)
    }
  }, [requestClose])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    if (data._honey) return // a bot filled the hidden field

    setStatus('sending')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          이름: data.name,
          이메일: data.email,
          '문의 유형': data.type,
          '문의 내용': data.message,
          _subject: `[포트폴리오 문의] ${data.type} - ${data.name}`,
          _replyto: data.email,
          _template: 'table',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === 'false' || json.success === false) throw new Error('send failed')
      setStatus('sent')
      form.reset()
    } catch {
      setStatus('error')
    }
  }

  // if the relay is unreachable, the visitor can still write the same message from their own mail app
  const mailtoFallback = () => {
    const f = formRef.current
    if (!f) return `mailto:${CONTACT_EMAIL}`
    const data = Object.fromEntries(new FormData(f))
    const body = `이름: ${data.name}\n이메일: ${data.email}\n문의 유형: ${data.type}\n\n${data.message}`
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[포트폴리오 문의] ${data.type} - ${data.name}`)}&body=${encodeURIComponent(body)}`
  }

  const d = (n) => ({ '--d': `${0.25 + n * 0.07}s` })

  return createPortal(
    <div className={`cp${entered ? ' is-in' : ''}`} role="dialog" aria-modal="true" aria-label="문의하기">
      <div
        className="cp__scrim"
        ref={scrimRef}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) requestClose()
        }}
      />

      <aside className="cp__card">
        <button type="button" className="cp__close" onClick={requestClose} aria-label="닫기">
          <span />
          <span />
        </button>

        <form className="cp__form" ref={formRef} onSubmit={onSubmit}>
          <label className="cp__field cp__rise" style={d(0)}>
            <span className="cp__label">이름</span>
            <input
              ref={firstRef}
              className="cp__input"
              name="name"
              type="text"
              placeholder="어떻게 불러드리면 될까요?"
              required
              autoComplete="name"
            />
          </label>

          <label className="cp__field cp__rise" style={d(1)}>
            <span className="cp__label">이메일</span>
            <input
              className="cp__input"
              name="email"
              type="email"
              placeholder="답변받을 이메일을 입력해주세요."
              required
              autoComplete="email"
            />
          </label>

          <label className="cp__field cp__rise" style={d(2)}>
            <span className="cp__label">문의 유형</span>
            <span className="cp__select">
              <select className="cp__input" name="type" defaultValue={TYPES[0]} required>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
                <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </label>

          <label className="cp__field cp__rise" style={d(3)}>
            <span className="cp__label">문의 내용</span>
            <textarea
              className="cp__input cp__textarea"
              name="message"
              placeholder="프로젝트나 제안 내용을 자유롭게 적어주세요."
              rows={5}
              required
            />
          </label>

          {/* spam trap: real visitors never see or fill this */}
          <input className="cp__honey" type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          <div className="cp__actions cp__rise" style={d(4)}>
            <button type="submit" className={`cp__send${status === 'sending' ? ' is-sending' : ''}`} disabled={status === 'sending'}>
              <span>{status === 'sending' ? '보내는 중…' : status === 'sent' ? '한 번 더 보내기' : '문의 보내기'}</span>
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M2 8h11M9 3.5 13.5 8 9 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className={`cp__note${status === 'error' ? ' is-error' : ''}${status === 'sent' ? ' is-ok' : ''}`} role="status" aria-live="polite">
              {status === 'sent' && '문의가 전달되었어요. 남겨주신 이메일로 답변드릴게요.'}
              {status === 'error' && (
                <>
                  전송에 실패했어요. 잠시 후 다시 시도하거나{' '}
                  <a href={mailtoFallback()} onClick={(e) => (e.currentTarget.href = mailtoFallback())}>
                    메일 앱으로 보내기
                  </a>
                </>
              )}
            </p>
          </div>
        </form>
      </aside>
    </div>,
    document.body,
  )
}

export default ContactPanel

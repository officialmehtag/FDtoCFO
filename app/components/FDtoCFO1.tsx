'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ── TYPES ──────────────────────────────────────────────────────────────────
type Screen = 'splash' | 'onboarding' | 'home' | 'chat'
type MsgRole = 'user' | 'ai'

interface Message {
  role: MsgRole
  text: string
  time: string
}

interface Answers {
  [key: string]: string | string[]
}

// ── DATA ───────────────────────────────────────────────────────────────────
const QUESTIONS = [
  { id: 'title', n: '01 / 09', text: 'What is your current title and how long have you been in this role?', type: 'text', ph: 'e.g. Finance Director, 3 years' },
  { id: 'company', n: '02 / 09', text: 'What kind of company are you in?', hint: 'Size, industry, startup / mid-size / large corporate.', type: 'text', ph: 'e.g. Mid-size FMCG company, ~2,000 employees' },
  { id: 'reports_to', n: '03 / 09', text: 'Who do you report to directly?', type: 'options', opts: ['CEO / MD', 'Group CFO', 'CFO', 'Other'] },
  { id: 'involvement', n: '04 / 09', text: 'Does your CEO or MD involve you in business decisions beyond finance?', hint: 'Be honest.', type: 'options', opts: ['Yes, regularly', 'Sometimes', 'Rarely', 'Never'] },
  { id: 'blocker', n: '05 / 09', text: 'What do you think is the main thing stopping you from being seen as CFO ready right now?', hint: 'In your own words.', type: 'textarea', ph: 'Write whatever comes to mind first...' },
  { id: 'cfo_track', n: '06 / 09', text: 'Have you ever been told you are on the CFO track?', type: 'options', opts: ['Yes, formally', 'Informally, yes', 'Not really', 'No'] },
  { id: 'target', n: '07 / 09', text: 'What kind of company do you want to be CFO of, and roughly when?', type: 'text', ph: 'e.g. Large MNC in the Middle East, within 3 years' },
  { id: 'meaning', n: '08 / 09', text: 'What does the CFO role mean for you practically?', type: 'options', multi: true, opts: ['Better pay', 'More authority', 'Bigger company', 'More respect', 'Proving something to myself'] },
  { id: 'anything_else', n: '09 / 09', text: 'Anything else we should know about your situation before we start?', type: 'textarea', ph: 'Optional — share anything that feels relevant...', skippable: true },
]

const PILLARS = [
  'Are the right people seeing you as a CFO?',
  'Do you speak well in the rooms that matter?',
  'Do you understand the business, not just the finance?',
  'Do people act on what you say?',
  'Do the right people know who you are?',
  'Can you handle the hard conversations?',
  'Are you leading your team or just managing it?',
  'Do you know what you are worth in the market?',
]

const SYSTEM_PROMPT = (profile: string) => `You are the voice behind FD to CFO, a coaching tool built by Gaurav Mehta, a former Group CFO with 25 years of experience across India, Malaysia and global markets.

You talk exactly like Gaurav. Here is how:

VOICE RULES:
- Short sentences. Simple words. No jargon.
- Never say: "That's a great question", "That's a great insight", "Absolutely!", "But here's the thing", "Executive presence", "Stakeholder management", "That's a real shift"
- Never use em dashes
- When you have something to say, say it. Don't keep asking questions to avoid giving a view.
- Use "In my experience..." or "From my experience..." naturally
- Reference your own journey when it helps the other person feel less alone
- Give one clear direction, not a list of five options
- Genuine recognition only when earned — name the specific thing and move on immediately
- End with one question OR one clear action. Not both. Not a list.
- Maximum 4 to 6 sentences per response. This is a mobile chat.

USER PROFILE:
${profile}

THE 8 CFO PILLARS — map every conversation to one of these:
1. Are the right people above you starting to see you as a CFO?
2. Can you speak well in the rooms that matter?
3. Do you understand the business, not just the finance?
4. Do people listen to you and act on what you say?
5. Do the right people know who you are?
6. Can you handle the hard conversations?
7. Are you leading your finance team or just managing it?
8. Do you know what you are worth in the market?`

// ── STYLES ─────────────────────────────────────────────────────────────────
const s = {
  // Layout
  app: 'fixed inset-0 flex flex-col bg-[var(--bg)] max-w-[480px] mx-auto',
  screen: 'absolute inset-0 flex flex-col transition-all duration-300',

  // Splash
  splash: 'items-center justify-center gap-3 bg-[var(--bg)]',
  splashLogo: 'font-serif text-4xl text-[var(--text)] tracking-tight',
  splashAccent: 'text-[var(--accent)]',
  splashSub: 'text-xs text-[var(--text-muted)] tracking-widest uppercase',

  // Onboarding
  obHeader: 'px-6 pt-14 pb-5 flex-shrink-0',
  obWordmark: 'font-serif text-[17px] text-[var(--text-muted)] mb-7',
  progressBg: 'h-[2px] bg-[var(--border)] rounded-full overflow-hidden',
  progressFill: 'h-full bg-[var(--accent)] rounded-full transition-all duration-500',
  obBody: 'flex-1 overflow-y-auto px-6 pt-7 pb-2',
  qStep: 'text-[11px] font-medium tracking-[0.12em] uppercase text-[var(--accent)] mb-2.5',
  qText: 'font-serif text-2xl leading-[1.35] text-[var(--text)] mb-2.5 tracking-tight',
  qHint: 'text-[13px] text-[var(--text-muted)] mb-5 leading-relaxed',
  obInput: 'w-full bg-white border border-[var(--border)] rounded-[10px] text-[var(--text)] text-[16px] font-light px-4 py-4 outline-none transition-all focus:border-[var(--accent-border)] focus:bg-white shadow-sm',
  obTextarea: 'w-full bg-white border border-[var(--border)] rounded-[10px] text-[var(--text)] text-[16px] font-light px-4 py-4 outline-none transition-all focus:border-[var(--accent-border)] min-h-[110px] leading-relaxed shadow-sm',
  optBtn: 'w-full bg-white border border-[var(--border)] rounded-[10px] text-[var(--text-soft)] text-[14px] font-light px-4 py-[15px] text-left relative transition-all active:scale-[0.98] shadow-sm',
  optBtnSel: 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--text)]',
  obFooter: 'px-6 pb-10 pt-4 flex-shrink-0',
  btnPrimary: 'w-full bg-[var(--accent)] text-white text-[15px] font-medium py-[17px] rounded-[10px] border-0 tracking-[0.02em] transition-all active:scale-[0.98] disabled:opacity-30 shadow-sm',
  btnGhost: 'block text-center mt-3 text-[13px] text-[var(--text-muted)] py-1',

  // Home
  homeHeader: 'px-6 pt-14 pb-4 flex-shrink-0 flex items-center justify-between border-b border-[var(--border)]',
  homeWordmark: 'font-serif text-[17px] text-[var(--text-soft)]',
  avatar: 'w-9 h-9 rounded-full bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center text-[13px] font-medium text-[var(--text-soft)]',
  homeBody: 'flex-1 overflow-y-auto px-6 py-6 pb-32',
  sectionLabel: 'text-[11px] font-medium tracking-[0.1em] uppercase text-[var(--text-muted)] mb-3',
  greetingLabel: 'text-[11px] font-medium tracking-[0.1em] uppercase text-[var(--text-muted)] mb-1.5',
  greetingText: 'font-serif text-[22px] text-[var(--text)] leading-[1.35] tracking-tight',
  startCard: 'bg-white border border-[var(--border)] rounded-[14px] p-5 mt-5 shadow-sm active:scale-[0.99] transition-all',
  startCardLabel: 'text-[11px] font-medium tracking-[0.1em] uppercase text-[var(--accent)] mb-2',
  startCardText: 'text-[14px] text-[var(--text-soft)] leading-relaxed',
  startCardArrow: 'text-[var(--accent)] text-[13px] mt-3',
  pillarsGrid: 'grid grid-cols-2 gap-2.5 mt-1',
  pillarCard: 'bg-white border border-[var(--border)] rounded-[12px] p-3.5 shadow-sm active:scale-[0.98] transition-all',
  pillarNum: 'text-[10px] font-medium text-[var(--accent)] tracking-[0.08em] mb-1.5',
  pillarName: 'text-[12px] text-[var(--text-soft)] leading-[1.4]',
  pillarBar: 'mt-2.5 h-[2px] bg-[var(--bg3)] rounded-full overflow-hidden',
  pillarFill: 'h-full bg-[var(--accent)] rounded-full',

  // Chat
  chatHeader: 'px-5 pt-14 pb-3.5 flex-shrink-0 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)]',
  backBtn: 'w-8 h-8 flex items-center justify-center text-[var(--text-soft)] text-[22px] flex-shrink-0',
  chatTitle: 'text-[14px] font-medium text-[var(--text)] flex-1',
  chatSub: 'text-[11px] text-[var(--text-muted)]',
  chatMessages: 'flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4',
  msgUser: 'flex flex-col items-end max-w-[88%] self-end',
  msgAi: 'flex flex-col items-start max-w-[88%] self-start',
  bubbleUser: 'bg-white border border-[var(--border)] rounded-[14px] rounded-br-[4px] px-4 py-3 text-[14px] text-[var(--text)] leading-relaxed shadow-sm',
  bubbleAi: 'bg-[var(--accent-soft)] border border-[var(--accent-border)] rounded-[14px] rounded-bl-[4px] px-4 py-3 text-[14px] text-[var(--text)] leading-relaxed',
  msgTime: 'text-[10px] text-[var(--text-muted)] mt-1 px-0.5',
  typingWrap: 'flex flex-col items-start max-w-[88%] self-start',
  typingBubble: 'bg-[var(--accent-soft)] border border-[var(--accent-border)] rounded-[14px] rounded-bl-[4px] px-4 py-3.5 flex gap-1.5 items-center',
  typingDot: 'w-1.5 h-1.5 bg-[var(--accent)] rounded-full opacity-40',
  chatInputArea: 'flex-shrink-0 px-4 pb-8 pt-3 bg-[var(--bg)] border-t border-[var(--border)]',
  chatInputRow: 'flex gap-2.5 items-end bg-white border border-[var(--border)] rounded-[24px] px-4 py-2 shadow-sm transition-all focus-within:border-[var(--accent-border)]',
  chatInput: 'flex-1 bg-transparent border-0 outline-none text-[var(--text)] text-[15px] font-light py-1 leading-relaxed placeholder:text-[var(--text-muted)]',
  sendBtn: 'w-9 h-9 bg-[var(--accent)] rounded-full flex items-center justify-center flex-shrink-0 border-0 transition-all active:scale-90 disabled:opacity-30',

  // Bottom nav
  bottomNav: 'fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[var(--bg)] border-t border-[var(--border)] flex z-20',
  navItem: 'flex-1 flex flex-col items-center gap-1 py-2.5 pb-7 cursor-pointer',
  navIcon: 'text-xl opacity-40 transition-opacity',
  navIconActive: 'opacity-100',
  navLabel: 'text-[10px] text-[var(--text-muted)] tracking-[0.04em]',
  navLabelActive: 'text-[var(--accent)]',

  // Talk btn
  talkBtn: 'fixed bottom-[78px] right-4 bg-white border border-[var(--border)] rounded-[50px] px-4 py-2.5 flex items-center gap-2 text-[12px] font-medium text-[var(--text-soft)] z-30 shadow-md active:bg-[var(--accent-soft)] transition-all',
  talkDot: 'w-1.5 h-1.5 bg-[var(--accent)] rounded-full flex-shrink-0',
}

// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function FDtoCFO() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [obStep, setObStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [obInput, setObInput] = useState('')
  const [obSelected, setObSelected] = useState<string[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [chatMode, setChatMode] = useState<{ type: 'new' | 'pillar', pillarIdx?: number }>({ type: 'new' })
  const [splashFade, setSplashFade] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const q = QUESTIONS[obStep]
  const progress = ((obStep + 1) / QUESTIONS.length * 100).toFixed(0)

  const hour = new Date().getHours()
  const tod = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Splash timer
  useEffect(() => {
    const t1 = setTimeout(() => setSplashFade(true), 1400)
    const t2 = setTimeout(() => setScreen('onboarding'), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Reset obInput/obSelected when step changes
  useEffect(() => {
    const saved = answers[q.id]
    if (q.type === 'text' || q.type === 'textarea') {
      setObInput((saved as string) || '')
    } else {
      setObSelected(Array.isArray(saved) ? saved : saved ? [saved] : [])
    }
  }, [obStep])

  // ── Validation ──
  const canContinue = () => {
    if (q.skippable) return true
    if (q.type === 'text' || q.type === 'textarea') return obInput.trim().length >= 2
    return obSelected.length > 0
  }

  // ── Onboarding navigation ──
  const saveAndNext = () => {
    const updated = { ...answers }
    if (q.type === 'text' || q.type === 'textarea') {
      updated[q.id] = obInput.trim()
    } else {
      updated[q.id] = q.multi ? obSelected : obSelected[0]
    }
    setAnswers(updated)

    if (obStep < QUESTIONS.length - 1) {
      setObStep(s => s + 1)
    } else {
      setScreen('home')
    }
  }

  const skipQ = () => {
    if (obStep < QUESTIONS.length - 1) setObStep(s => s + 1)
    else setScreen('home')
  }

  const toggleOption = (opt: string) => {
    if (q.multi) {
      setObSelected(prev => prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt])
    } else {
      setObSelected([opt])
    }
  }

  // ── Chat ──
  const openChat = (type: 'new' | 'pillar', pillarIdx?: number) => {
    setChatMode({ type, pillarIdx })
    setMessages([])
    setScreen('chat')

    const opening = type === 'pillar' && pillarIdx !== undefined
      ? `Let's talk about this: ${PILLARS[pillarIdx].toLowerCase()}. What's your honest assessment of where you stand on this right now?`
      : "What's the most pressing thing happening at work right now?"

    setTimeout(() => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setMessages([{ role: 'ai', text: opening, time: now() }])
      }, 1000)
    }, 300)
  }

  const sendMessage = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || isTyping) return

    setChatInput('')
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto'
    }

    const userMsg: Message = { role: 'user', text, time: now() }
    setMessages(prev => [...prev, userMsg])
    setIsTyping(true)

    try {
      const profile = Object.entries(answers)
        .filter(([, v]) => v && v !== 'No')
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n')

      const history = [...messages, userMsg].slice(-8).map(m => ({
        role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.text,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, profile }),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setIsTyping(false)
      setMessages(prev => [...prev, { role: 'ai', text: data.response, time: now() }])
    } catch {
      setIsTyping(false)
      setMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong on my end. Try again in a moment.', time: now() }])
    }
  }, [chatInput, isTyping, messages, answers])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const showNav = screen === 'home' || screen === 'chat'

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className={s.app}>

      {/* ── SPLASH ── */}
      {screen === 'splash' && (
        <div className={`${s.screen} ${s.splash}`}
             style={{ opacity: splashFade ? 0 : 1, transition: 'opacity 0.5s ease' }}>
          <div className={s.splashLogo}>
            FD <span className={s.splashAccent}>to</span> CFO
          </div>
          <div style={{ width: 36, height: 1, background: 'var(--accent)', margin: '6px 0' }} />
          <div className={s.splashSub}>by Gaurav Mehta</div>
        </div>
      )}

      {/* ── ONBOARDING ── */}
      {screen === 'onboarding' && (
        <div className={s.screen} style={{ opacity: 1, background: 'var(--bg)' }}>
          <div className={s.obHeader}>
            <div className={s.obWordmark}>
              FD <span style={{ color: 'var(--accent)' }}>to</span> CFO
            </div>
            <div className={s.progressBg}>
              <div className={s.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className={`${s.obBody} scrollable`}>
            <div className={s.qStep}>{q.n}</div>
            <div className={s.qText}>{q.text}</div>
            {q.hint && <div className={s.qHint}>{q.hint}</div>}

            {q.type === 'text' && (
              <input
                className={s.obInput}
                type="text"
                placeholder={q.ph}
                value={obInput}
                onChange={e => setObInput(e.target.value)}
                autoFocus
              />
            )}

            {q.type === 'textarea' && (
              <textarea
                className={s.obTextarea}
                placeholder={q.ph}
                value={obInput}
                onChange={e => setObInput(e.target.value)}
              />
            )}

            {q.type === 'options' && (
              <div className="flex flex-col gap-2.5">
                {q.opts!.map(opt => (
                  <button
                    key={opt}
                    className={`${s.optBtn} ${obSelected.includes(opt) ? s.optBtnSel : ''}`}
                    onClick={() => toggleOption(opt)}
                  >
                    {opt}
                    {obSelected.includes(opt) && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--accent)] text-[13px]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="h-8" />
          </div>

          <div className={s.obFooter}>
            <button
              className={s.btnPrimary}
              onClick={saveAndNext}
              disabled={!canContinue()}
            >
              Continue
            </button>
            {q.skippable && (
              <span className={s.btnGhost} onClick={skipQ}>Skip for now</span>
            )}
          </div>
        </div>
      )}

      {/* ── HOME ── */}
      {screen === 'home' && (
        <div className={s.screen} style={{ opacity: 1 }}>
          <div className={s.homeHeader}>
            <div className={s.homeWordmark}>
              FD <span style={{ color: 'var(--accent)' }}>to</span> CFO
            </div>
            <div className={s.avatar}>G</div>
          </div>

          <div className={`${s.homeBody} scrollable`}>
            <div className="mb-6">
              <div className={s.greetingLabel}>{tod}</div>
              <div className={s.greetingText}>What's on your mind today?</div>
            </div>

            {/* Start conversation */}
            <button className={`${s.startCard} w-full text-left`} onClick={() => openChat('new')}>
              <div className={s.startCardLabel}>Start a conversation</div>
              <div className={s.startCardText}>
                Bring whatever is actually happening at work right now. That's where we start.
              </div>
              <div className={s.startCardArrow}>→</div>
            </button>

            {/* CFO Pillars */}
            <div className={s.sectionLabel} style={{ marginTop: 28 }}>Your CFO readiness</div>
            <div className={s.pillarsGrid}>
              {PILLARS.map((name, i) => (
                <button
                  key={i}
                  className={`${s.pillarCard} text-left w-full`}
                  onClick={() => openChat('pillar', i)}
                >
                  <div className={s.pillarNum}>0{i + 1}</div>
                  <div className={s.pillarName}>{name}</div>
                  <div className={s.pillarBar}>
                    <div className={s.pillarFill} style={{ width: '0%' }} />
                  </div>
                </button>
              ))}
            </div>
            <div className="h-4" />
          </div>
        </div>
      )}

      {/* ── CHAT ── */}
      {screen === 'chat' && (
        <div className={s.screen} style={{ opacity: 1 }}>
          <div className={s.chatHeader}>
            <button className={s.backBtn} onClick={() => setScreen('home')}>‹</button>
            <div className="flex-1 min-w-0">
              <div className={s.chatTitle}>FD to CFO</div>
              <div className={s.chatSub}>Private · Gaurav's voice</div>
            </div>
          </div>

          <div className={`${s.chatMessages} scrollable`}>
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? s.msgUser : s.msgAi}>
                <div className={m.role === 'user' ? s.bubbleUser : s.bubbleAi}>{m.text}</div>
                <div className={s.msgTime}>{m.time}</div>
              </div>
            ))}

            {isTyping && (
              <div className={s.typingWrap}>
                <div className={s.typingBubble}>
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={s.typingDot}
                      style={{ animation: `typingDot 1.2s infinite ${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={s.chatInputArea}>
            <div className={s.chatInputRow}>
              <textarea
                ref={chatInputRef}
                className={s.chatInput}
                rows={1}
                placeholder="What's happening at work right now?"
                value={chatInput}
                onChange={e => {
                  setChatInput(e.target.value)
                  resizeTextarea(e.target)
                }}
                onKeyDown={handleKey}
              />
              <button
                className={s.sendBtn}
                onClick={sendMessage}
                disabled={!chatInput.trim() || isTyping}
              >
                <svg viewBox="0 0 24 24" fill="white" width="15" height="15">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      {showNav && (
        <div className={s.bottomNav}>
          <div
            className={s.navItem}
            onClick={() => setScreen('home')}
          >
            <span className={`${s.navIcon} ${screen === 'home' ? s.navIconActive : ''}`}>⌂</span>
            <span className={`${s.navLabel} ${screen === 'home' ? s.navLabelActive : ''}`}>Home</span>
          </div>
          <div
            className={s.navItem}
            onClick={() => openChat('new')}
          >
            <span className={`${s.navIcon} ${screen === 'chat' ? s.navIconActive : ''}`}>✦</span>
            <span className={`${s.navLabel} ${screen === 'chat' ? s.navLabelActive : ''}`}>Talk</span>
          </div>
          <div className={s.navItem}>
            <span className={s.navIcon}>◎</span>
            <span className={s.navLabel}>Profile</span>
          </div>
        </div>
      )}

      {/* ── TALK TO GAURAV ── */}
      {showNav && (
        <button
          className={s.talkBtn}
          onClick={() => window.open('https://topmate.io/gaurav', '_blank')}
        >
          <div className={s.talkDot} style={{ animation: 'pulse 2s infinite' }} />
          Talk to Gaurav
        </button>
      )}

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.4; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .font-serif { font-family: var(--font-serif) !important; }
      `}</style>
    </div>
  )
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

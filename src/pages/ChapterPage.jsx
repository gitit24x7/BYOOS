import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '../components/layout/AppShell'
import MysteryOpener from '../components/pedagogy/MysteryOpener'
import ContentRenderer from '../components/pedagogy/ContentRenderer'
import TheReveal from '../components/pedagogy/TheReveal'
import { getModule } from '../data/curriculum'
import { m00 } from '../data/m00_bigquestion'
import { m01 } from '../data/m01_bootloader'
import { m02 } from '../data/m02_memory'
import { m03 } from '../data/m03_scheduler'
import { m04 } from '../data/m04_syscalls'
import { m05 } from '../data/m05_shell'
import { useProgress } from '../hooks/useProgress'

const moduleData = { M00: m00, M01: m01, M02: m02, M03: m03, M04: m04, M05: m05 }

export default function ChapterPage() {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const { markComplete } = useProgress()
  const [phase, setPhase] = useState('mystery') // 'mystery' | 'content'
  const [scrollPct, setScrollPct] = useState(0)
  const [activeSection, setActiveSection] = useState(0)
  const contentRef = useRef(null)
  const sectionRefs = useRef([])

  const meta = getModule(moduleId)
  const data = moduleData[moduleId]

  // Reset to mystery + scroll to top when module changes
  useEffect(() => {
    setPhase('mystery')
    setScrollPct(0)
    setActiveSection(0)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [moduleId])

  // Keyboard navigation: ← / → between modules, Escape → home
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'Escape') { navigate('/'); return }
      if (e.key === 'ArrowRight') {
        const curr = parseInt(moduleId.replace('M', ''))
        const nextId = `M${String(curr + 1).padStart(2, '0')}`
        if (moduleData[nextId]) navigate(`/chapter/${nextId}`)
      }
      if (e.key === 'ArrowLeft') {
        const curr = parseInt(moduleId.replace('M', ''))
        if (curr > 0) navigate(`/chapter/M${String(curr - 1).padStart(2, '0')}`)
        else navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moduleId, navigate])

  // Reading progress bar
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const onScroll = () => {
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight)
      setScrollPct(Math.min(pct, 1))
      // Find active section
      sectionRefs.current.forEach((ref, i) => {
        if (!ref) return
        const rect = ref.getBoundingClientRect()
        if (rect.top <= 160) setActiveSection(i)
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [phase])

  if (!meta) return (
    <div className="flex items-center justify-center h-full text-white/30 text-sm">
      Module not found.
    </div>
  )

  if (!data) return (
    <AppShell>
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="text-6xl mb-2">🚧</div>
        <h2 className="text-xl font-black text-white">Coming Soon</h2>
        <p className="text-sm text-white/40 max-w-xs leading-relaxed">
          This module is under construction. The architecture is ready — content dropping soon.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 px-5 py-2.5 rounded-full text-sm font-bold bg-white/[0.07] text-white/60 hover:bg-white/[0.12] transition-all"
        >
          ← Back to curriculum
        </button>
      </div>
    </AppShell>
  )

  const goToNext = () => {
    const curr = parseInt(moduleId.replace('M', ''))
    const nextId = `M${String(curr + 1).padStart(2, '0')}`
    markComplete(moduleId)
    navigate(`/chapter/${nextId}`)
  }

  const scrollToSection = (i) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <AppShell>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Reading progress bar */}
        <div className="h-0.5 bg-white/[0.04] flex-shrink-0 relative">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-r"
            style={{
              width: `${scrollPct * 100}%`,
              background: `linear-gradient(90deg, ${meta.color}, ${meta.color}aa)`,
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          {phase === 'mystery' ? (
            <motion.div
              key="mystery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden"
            >
              <MysteryOpener
                data={data.mystery}
                onReady={() => setPhase('content')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              {/* Section nav (right side) */}
              <div className="hidden xl:flex flex-col gap-1 py-10 pr-4 pl-2 w-44 flex-shrink-0 border-l border-white/[0.04]">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2 pl-2">Sections</p>
                {data.sections.map((sec, i) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(i)}
                    className={`text-left px-2 py-1.5 rounded-lg text-[11px] leading-tight transition-all ${
                      activeSection === i
                        ? 'text-white font-semibold bg-white/[0.06]'
                        : 'text-white/25 hover:text-white/60 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span
                      className="font-mono mr-1.5 opacity-50"
                      style={activeSection === i ? { color: meta.color } : {}}
                    >
                      {sec.number}
                    </span>
                    {sec.title}
                  </button>
                ))}
                <button
                  onClick={() => sectionRefs.current[data.sections.length]?.scrollIntoView({ behavior: 'smooth' })}
                  className={`text-left px-2 py-1.5 rounded-lg text-[11px] leading-tight transition-all ${
                    activeSection === data.sections.length
                      ? 'text-white font-semibold bg-white/[0.06]'
                      : 'text-white/25 hover:text-white/60 hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="font-mono mr-1.5 opacity-50">⚡</span>
                  The Reveal
                </button>
              </div>

              {/* Main scrollable content */}
              <div
                ref={contentRef}
                className="flex-1 overflow-y-auto"
              >
                <div className="max-w-3xl mx-auto px-5 md:px-10 py-10 md:py-14">
                  {/* Chapter header */}
                  <header className="mb-12 space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-mono font-bold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                      >
                        {meta.icon} Module {meta.number}
                      </span>
                      <span className="text-xs text-white/20 font-mono">{meta.duration}</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                      {data.title}
                    </h1>
                    <p className="text-base md:text-xl text-white/50 leading-relaxed">{data.subtitle}</p>
                    <div className="flex gap-2 flex-wrap">
                      {meta.tags.map(tag => (
                        <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] text-white/30 border border-white/[0.06]">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {/* Divider */}
                    <div className="pt-2">
                      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                  </header>

                  {/* Sections */}
                  {data.sections.map((section, sIdx) => (
                    <section
                      key={section.id}
                      ref={el => sectionRefs.current[sIdx] = el}
                      className="mb-16 scroll-mt-8"
                    >
                      {/* Section heading */}
                      <div className="flex items-center gap-3 mb-8">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0"
                          style={{ backgroundColor: `${section.color}20`, color: section.color }}
                        >
                          {section.number}
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">{section.title}</h2>
                      </div>

                      <ContentRenderer blocks={section.blocks} />
                    </section>
                  ))}

                  {/* The Reveal */}
                  <div ref={el => sectionRefs.current[data.sections.length] = el}>
                    {data.reveal && (
                      <TheReveal
                        reveal={data.reveal}
                        onNext={goToNext}
                      />
                    )}
                  </div>

                  <div className="h-24" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}

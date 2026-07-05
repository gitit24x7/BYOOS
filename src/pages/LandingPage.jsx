import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { curriculum } from '../data/curriculum'
import { useProgress } from '../hooks/useProgress'
import { CheckCircle2, Clock, Lock, ChevronRight } from 'lucide-react'
import BitFlipperSim from '../components/simulators/BitFlipperSim'

const FEATURES = [
  { n: '01', color: '#35e0ea', title: 'Boot from zero', desc: 'Write the 512 bytes BIOS loads at 0x7C00, then switch the CPU from Real Mode into Protected Mode by hand.' },
  { n: '02', color: '#35e0ea', title: 'Own the kernel', desc: 'Install an IDT, handle interrupts, and build the preemptive round-robin scheduler that juggles real tasks.' },
  { n: '03', color: '#9b8cff', title: 'Map memory', desc: 'Turn paging on, translate virtual addresses to physical ones, and catch your first page fault on purpose.' },
  { n: '04', color: '#9b8cff', title: 'Cross the gate', desc: 'Build the Ring 3 ↔ Ring 0 syscall boundary and understand exactly what happens when your code asks the kernel for something.' },
]

const STACK = [
  { n: '05', label: 'Userland', sub: 'shell · fork/exec · your first program', color: '#9b8cff', active: true },
  { n: '04', label: 'Syscalls', sub: 'the user ↔ kernel gate', color: '#7d8aa0' },
  { n: '03', label: 'Kernel', sub: 'scheduler · paging · interrupts', color: '#35e0ea', glow: true },
  { n: '02', label: 'Bootloader', sub: 'real → protected mode', color: '#7d8aa0' },
  { n: '01', label: 'Hardware', sub: 'x86 · registers · MMIO', color: '#7d8aa0', dashed: true },
]

const HOW_IT_WORKS = [
  { n: '1', title: 'Read the explanation', desc: 'First-principles writing with the history behind every mechanism — never "just memorize this."' },
  { n: '2', title: 'Watch it simulated', desc: 'Every core mechanism has a live, interactive simulator right in the page. No install, no setup.' },
  { n: '3', title: 'Build it for real', desc: 'A dedicated module walks you through the actual cross-compiler, linker, and QEMU setup — on your own machine.' },
]

const FAQS = [
  { q: 'Do I need to know C and assembly first?', a: 'Comfortable-with-C is enough. The Prerequisites track (P01–P07) teaches freestanding C, the CPU\'s registers, and every bit of assembly syntax you need — piece by piece, the first time it appears, not assumed.' },
  { q: 'Do I have to install a toolchain?', a: 'Not to learn — every mechanism has an interactive simulator that runs right in the browser, zero setup. To actually build and boot your own kernel, yes: Module P07 walks you through installing a real cross-compiler, a Makefile, and QEMU on your own machine, since that\'s the only honest way to build a real OS.' },
  { q: 'What architecture do we target?', a: 'x86, booting through legacy BIOS: Real Mode into Protected Mode, exactly the path real bootloaders take. The Bring-Up track wires that up into an actual booting kernel.' },
  { q: 'How long does the full curriculum take?', a: 'It\'s entirely self-paced and your progress is saved as you go. Most people move through the core curriculum and prerequisites in a few weeks of casual study.' },
]

const BOOT_LOG = [
  { t: '0.000', text: 'BYOOS bootloader v0.1 — stage 1' },
  { t: '0.012', text: 'A20 line enabled · entering protected mode' },
  { t: '0.041', text: <>paging on · <span style={{ color: '#9b8cff' }}>128 MB</span> mapped</> },
  { t: '0.088', text: <>kernel loaded @ <span style={{ color: '#9b8cff' }}>0x100000</span></> },
  { t: '0.114', text: 'scheduler up · IDT installed' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { isComplete, getCompletedCount } = useProgress()
  const total = curriculum.filter(m => !m.comingSoon).length
  const [faqOpen, setFaqOpen] = useState(null)

  return (
    <div className="h-full overflow-y-auto bg-[#080b12]" style={{ backgroundImage: 'linear-gradient(rgba(90,160,220,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(90,160,220,.045) 1px,transparent 1px)', backgroundSize: '34px 34px' }}>

      {/* ===================== NAV ===================== */}
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ background: 'rgba(8,11,18,.78)', borderBottom: '1px solid rgba(120,170,220,.12)' }}>
        <nav className="max-w-[1180px] mx-auto px-6 md:px-8 py-4 flex items-center gap-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5">
            <span className="grid place-items-center w-[30px] h-[30px] rounded-md font-mono font-bold text-sm" style={{ border: '1px solid rgba(53,224,234,.5)', background: 'rgba(53,224,234,.08)', color: '#35e0ea' }}>/</span>
            <span className="font-bold text-lg tracking-tight">BYOOS</span>
          </button>
          <div className="hidden md:flex gap-6 ml-2">
            <a href="#curriculum" className="text-sm font-medium text-[#9fb0c8] hover:text-[#eef3fa] transition-colors whitespace-nowrap">Curriculum</a>
            <a href="#how-it-works" className="text-sm font-medium text-[#9fb0c8] hover:text-[#eef3fa] transition-colors whitespace-nowrap">How it works</a>
            <a href="#faq" className="text-sm font-medium text-[#9fb0c8] hover:text-[#eef3fa] transition-colors whitespace-nowrap">FAQ</a>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {getCompletedCount() > 0 && (
              <button
                onClick={() => {
                  const last = curriculum.find(m => !isComplete(m.id) && !m.comingSoon)
                  if (last) navigate(`/chapter/${last.id}`)
                }}
                className="hidden sm:block text-sm font-medium text-[#9fb0c8] hover:text-[#eef3fa] transition-colors whitespace-nowrap"
              >
                Continue
              </button>
            )}
            <button onClick={() => navigate('/chapter/M00')} className="btn-primary px-4 py-2.5 text-sm" style={{ backgroundColor: '#35e0ea', '--btn-glow': 'rgba(53,224,234,.5)' }}>Start free →</button>
          </div>
        </nav>
      </header>

      {/* ===================== HERO ===================== */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-20 pb-24 md:pt-24 md:pb-28" style={{ backgroundImage: 'radial-gradient(circle at 50% -5%, rgba(53,224,234,.12), transparent 55%)' }}>
        <motion.h1
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="font-mono text-xs uppercase mb-5" style={{ letterSpacing: '.24em', color: '#35e0ea' }}
        >
          Build Your Own Operating System
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="text-center font-bold tracking-tight max-w-3xl text-4xl sm:text-5xl md:text-7xl leading-[1.03]"
          style={{ letterSpacing: '-.03em' }}
        >
          Your machine, from <span style={{ color: '#f6b73c' }}>POST</span> to <span style={{ color: '#ff6b81' }}>prompt</span>.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="mt-5 max-w-xl text-center text-[#9fb0c8] text-base md:text-lg leading-relaxed"
        >
          Learn how to build your own operating system from scratch, first-principles and interactive — from a 512-byte bootloader to schedulers, virtual memory, and system calls. Learn by doing, not memorizing.
        </motion.p>

        {/* Terminal boot log */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
          className="w-full max-w-[640px] mt-10 rounded-[10px] overflow-hidden"
          style={{ border: '1px solid rgba(120,170,220,.22)', background: 'rgba(8,12,20,.85)', boxShadow: '0 24px 60px -20px rgba(0,0,0,.7)' }}
        >
          <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(120,170,220,.16)' }}>
            <span className="w-[11px] h-[11px] rounded-full" style={{ background: '#ff5f56' }} />
            <span className="w-[11px] h-[11px] rounded-full" style={{ background: '#ffbd2e' }} />
            <span className="w-[11px] h-[11px] rounded-full" style={{ background: '#27c93f' }} />
            <span className="ml-2 font-mono text-[11px]" style={{ color: '#7d8aa0' }}>qemu-system-i386 — byoos.img</span>
          </div>
          <div className="px-5 py-5 font-mono text-[13px] leading-[1.85] min-h-[180px]" style={{ color: '#b9c6da' }}>
            {BOOT_LOG.map((line, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.35 }}>
                <span style={{ color: '#5f7d99' }}>[{line.t}]</span> {line.text}
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3 }}>
              <span style={{ color: '#35e0ea' }}>[  ok  ]</span> welcome to userland.
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.65 }} className="mt-1">
              byoos:~$ <span className="inline-block w-[9px] h-[17px] align-[-3px] animate-blink" style={{ background: '#35e0ea', marginLeft: 2 }} />
            </motion.div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-wrap justify-center gap-3.5 mt-9">
          <button onClick={() => navigate('/chapter/M00')} className="btn-primary px-7 py-3.5 text-[15px]" style={{ backgroundColor: '#35e0ea', '--btn-glow': 'rgba(53,224,234,.5)' }}>./run start</button>
          <a href="#curriculum" className="btn-secondary px-7 py-3.5 text-[15px]">see the curriculum</a>
        </motion.div>
      </section>

      {/* ===================== STATS STRIP ===================== */}
      <section style={{ borderTop: '1px solid rgba(120,170,220,.12)', borderBottom: '1px solid rgba(120,170,220,.12)', background: 'rgba(8,12,20,.4)' }}>
        <div className="max-w-[1180px] mx-auto px-6 md:px-8 py-7 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: total, l: 'Modules live' },
            { v: '512', l: 'Byte bootloader' },
            { v: '0', l: 'Prior OS knowledge' },
            { v: 'x86', l: 'Real target' },
          ].map((s, i) => (
            <div key={i} className={i > 0 ? 'border-l' : ''} style={{ borderColor: 'rgba(120,170,220,.12)' }}>
              <div className="font-bold text-3xl md:text-[34px]" style={{ color: '#eef3fa' }}>{s.v}</div>
              <div className="font-mono text-[11px] uppercase mt-1" style={{ letterSpacing: '.14em', color: '#7d8aa0' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="max-w-[1180px] mx-auto px-6 md:px-8 py-20 md:py-24">
        <span className="font-mono text-xs uppercase" style={{ letterSpacing: '.2em', color: '#35e0ea' }}>Why BYOOS</span>
        <h2 className="mt-4 font-bold text-3xl md:text-[44px] leading-[1.05] max-w-xl" style={{ letterSpacing: '-.02em' }}>No abstractions to hide behind.</h2>
        <p className="mt-4 max-w-lg text-[#9fb0c8] text-base md:text-lg leading-relaxed">Every module walks through real mechanisms, then hands you a simulator to watch them run. You read the reasoning, write the C, and see the CPU do exactly what you told it.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className="card-glow p-6 rounded-xl"
              style={{ border: '1px solid rgba(120,170,220,.16)', background: 'rgba(8,12,20,.5)', '--glow': f.color }}
            >
              <div className="font-mono font-semibold text-[13px]" style={{ color: f.color }}>{f.n}</div>
              <h3 className="mt-3.5 mb-2 font-semibold text-xl">{f.title}</h3>
              <p className="text-[14.5px] leading-relaxed" style={{ color: '#9fb0c8' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===================== EXECUTION STACK ===================== */}
      <section style={{ borderTop: '1px solid rgba(120,170,220,.12)', background: 'rgba(8,12,20,.4)' }}>
        <div className="max-width-[1180px] max-w-[1180px] mx-auto px-6 md:px-8 py-20 md:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="font-mono text-xs uppercase" style={{ letterSpacing: '.2em', color: '#35e0ea' }}>The curriculum</span>
            <h2 className="mt-4 font-bold text-3xl md:text-[44px] leading-[1.05]" style={{ letterSpacing: '-.02em' }}>The stack you'll build, bottom to top.</h2>
            <p className="mt-4 max-w-md text-[#9fb0c8] text-base md:text-lg leading-relaxed">Every module unlocks the next layer. You never move up until the layer below actually makes sense — with a working simulator to prove it.</p>
            <div className="flex flex-wrap gap-3.5 mt-8">
              <button onClick={() => navigate('/chapter/M00')} className="btn-primary px-6 py-3.5 text-sm" style={{ backgroundColor: '#35e0ea', '--btn-glow': 'rgba(53,224,234,.5)' }}>Start lesson 01 →</button>
              <a href="#curriculum" className="btn-secondary px-6 py-3.5 text-sm">Full syllabus</a>
            </div>
          </div>
          <div className="relative pt-2">
            <div className="absolute -top-4 right-0 font-mono text-[10px]" style={{ letterSpacing: '.14em', color: '#5f7d99' }}>FIG.1 — EXECUTION STACK</div>
            <div className="flex flex-col gap-2.5">
              {STACK.map((s) => (
                <div
                  key={s.n}
                  className="flex items-center gap-3.5 px-4.5 py-4 rounded-lg"
                  style={{
                    border: s.dashed ? '1px dashed rgba(120,170,220,.3)' : `1px solid ${s.color}${s.glow ? '73' : s.active ? '66' : '48'}`,
                    background: s.glow ? 'rgba(53,224,234,.08)' : s.active ? 'rgba(155,140,255,.08)' : s.dashed ? 'transparent' : 'rgba(90,160,220,.06)',
                    boxShadow: s.glow ? '0 0 28px -12px rgba(53,224,234,.5)' : 'none',
                    padding: '16px 18px',
                  }}
                >
                  <span className="font-mono font-semibold text-[11px]" style={{ color: s.color }}>{s.n}</span>
                  <div>
                    <div className="font-semibold text-base">{s.label}</div>
                    <div className="font-mono text-[11.5px]" style={{ color: '#8494ac' }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== HOW YOU ACTUALLY BUILD IT ===================== */}
      <section className="max-w-[1180px] mx-auto px-6 md:px-8 py-20 md:py-24 grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-14 items-center">
        <div>
          <div className="flex items-center gap-2.5 mb-5">
            <span className="w-2 h-2 rounded-sm" style={{ background: '#9b8cff', boxShadow: '0 0 12px #9b8cff' }} />
            <span className="font-mono text-xs uppercase" style={{ letterSpacing: '.2em', color: '#9b8cff' }}>Try it right here</span>
          </div>
          <h2 className="font-bold text-3xl md:text-[44px] leading-[1.05]" style={{ letterSpacing: '-.02em' }}>No install, until you're ready for the real thing.</h2>
          <p className="mt-4 max-w-sm text-[#9fb0c8] text-base md:text-lg leading-relaxed">Every core mechanism — bits, interrupts, paging, scheduling — has a live simulator right in the lesson. When you're ready to build for real, Module P07 walks you through the actual cross-compiler and QEMU setup.</p>
          <ul className="list-none mt-6 flex flex-col gap-3">
            {['8 interactive simulators, zero setup', 'Beej-style line-by-line code annotations', 'A real local toolchain guide when you\'re ready'].map((t, i) => (
              <li key={i} className="flex items-center gap-3 text-[15px]" style={{ color: '#cdd8e8' }}>
                <span className="font-mono font-semibold text-[13px]" style={{ color: '#35e0ea' }}>▸</span> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(120,170,220,.24)', boxShadow: '0 30px 70px -24px rgba(0,0,0,.7)' }}>
          <BitFlipperSim />
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how-it-works" style={{ borderTop: '1px solid rgba(120,170,220,.12)', background: 'rgba(8,12,20,.4)' }}>
        <div className="max-w-[1180px] mx-auto px-6 md:px-8 py-20 md:py-24">
          <div className="text-center">
            <span className="font-mono text-xs uppercase" style={{ letterSpacing: '.2em', color: '#35e0ea' }}>How a module works</span>
            <h2 className="mt-4 font-bold text-3xl md:text-[44px] leading-[1.05]" style={{ letterSpacing: '-.02em' }}>Learn by doing, not memorizing.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mt-14">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.n} className="p-7 rounded-xl" style={{ border: '1px solid rgba(120,170,220,.16)', background: 'rgba(8,12,20,.5)' }}>
                <div className="font-bold text-4xl" style={{ color: '#35e0ea' }}>{s.n}</div>
                <h3 className="mt-3 mb-2 font-semibold text-xl">{s.title}</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: '#9fb0c8' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CODE SHOWCASE ===================== */}
      <section className="max-w-[1180px] mx-auto px-6 md:px-8 py-20 md:py-24 grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-14 items-center">
        <div>
          <span className="font-mono text-xs uppercase" style={{ letterSpacing: '.2em', color: '#9b8cff' }}>Real code, real target</span>
          <h2 className="mt-4 font-bold text-3xl md:text-[42px] leading-[1.05]" style={{ letterSpacing: '-.02em' }}>The code that owns the machine.</h2>
          <p className="mt-4 max-w-xs text-[#9fb0c8] text-base md:text-lg leading-relaxed">This is what the Bring-Up track builds toward: freestanding C, an IDT you installed yourself, and an interrupt loop — a kernel that's actually alive.</p>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(120,170,220,.18)', background: 'rgba(8,12,20,.7)', boxShadow: '0 24px 60px -28px rgba(0,0,0,.7)' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(120,170,220,.14)' }}>
            <span className="font-mono text-xs" style={{ color: '#8494ac' }}>kernel/main.c</span>
            <span className="font-mono text-[10.5px] px-2 py-1 rounded" style={{ letterSpacing: '.1em', color: '#35e0ea', border: '1px solid rgba(53,224,234,.4)' }}>gcc -ffreestanding</span>
          </div>
          <div className="px-6 py-6 font-mono text-[13.5px] leading-[1.85] overflow-x-auto" style={{ color: '#b9c6da' }}>
            <div><span style={{ color: '#5f7d99' }}> 1</span>  <span style={{ color: '#9b8cff' }}>#include</span> <span style={{ color: '#35e0ea' }}>"vga.h"</span></div>
            <div><span style={{ color: '#5f7d99' }}> 2</span>  <span style={{ color: '#9b8cff' }}>#include</span> <span style={{ color: '#35e0ea' }}>"idt.h"</span></div>
            <div><span style={{ color: '#5f7d99' }}> 3</span></div>
            <div><span style={{ color: '#5f7d99' }}> 4</span>  <span style={{ color: '#6f89a8' }}>/* entry from boot.asm */</span></div>
            <div><span style={{ color: '#5f7d99' }}> 5</span>  <span style={{ color: '#9b8cff' }}>void</span> <span style={{ color: '#7fd9ff' }}>kmain</span>(<span style={{ color: '#9b8cff' }}>void</span>) {'{'}</div>
            <div><span style={{ color: '#5f7d99' }}> 6</span>      vga_clear(<span style={{ color: '#c9a26b' }}>COLOR_CYAN</span>);</div>
            <div><span style={{ color: '#5f7d99' }}> 7</span>      vga_puts(<span style={{ color: '#35e0ea' }}>"byoos: kernel alive\n"</span>);</div>
            <div><span style={{ color: '#5f7d99' }}> 8</span></div>
            <div><span style={{ color: '#5f7d99' }}> 9</span>      idt_install();</div>
            <div><span style={{ color: '#5f7d99' }}>10</span>      <span style={{ color: '#7fd9ff' }}>__asm__</span> <span style={{ color: '#9b8cff' }}>volatile</span>(<span style={{ color: '#35e0ea' }}>"sti"</span>);</div>
            <div><span style={{ color: '#5f7d99' }}>11</span></div>
            <div><span style={{ color: '#5f7d99' }}>12</span>      <span style={{ color: '#9b8cff' }}>for</span> (;;) <span style={{ color: '#7fd9ff' }}>__asm__</span>(<span style={{ color: '#35e0ea' }}>"hlt"</span>);</div>
            <div>13  {'}'}<span className="inline-block w-2 h-4 align-[-2px] ml-1 animate-blink" style={{ background: '#35e0ea' }} /></div>
          </div>
        </div>
      </section>

      {/* ===================== MODULE LIST (real, functional) ===================== */}
      <section id="curriculum" style={{ borderTop: '1px solid rgba(120,170,220,.12)' }}>
        <div className="max-w-[820px] mx-auto px-6 md:px-8 py-20 md:py-24 space-y-10">
          <div className="text-center">
            <span className="font-mono text-xs uppercase" style={{ letterSpacing: '.2em', color: '#35e0ea' }}>Every module</span>
            <h2 className="mt-4 font-bold text-3xl md:text-[40px] leading-[1.05]" style={{ letterSpacing: '-.02em' }}>Pick up wherever you are.</h2>
          </div>
          {Object.entries(
            curriculum.reduce((groups, mod) => {
              (groups[mod.section] ||= []).push(mod)
              return groups
            }, {})
          ).map(([section, mods]) => (
            <div key={section} className="space-y-3.5">
              <h3 className="font-bold text-lg">{section}</h3>
              {mods.map((mod, i) => {
                const done = isComplete(mod.id)
                return (
                  <motion.button
                    key={mod.id}
                    initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                    onClick={() => !mod.comingSoon && navigate(`/chapter/${mod.id}`)}
                    disabled={mod.comingSoon}
                    className={`card-glow relative w-full text-left flex items-start gap-4 p-4 md:p-5 rounded-xl ${mod.comingSoon ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'}`}
                    style={{ border: '1px solid rgba(120,170,220,.16)', background: 'rgba(8,12,20,.5)', '--glow': mod.color }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{
                        backgroundColor: done ? 'rgba(66,224,139,0.15)' : `${mod.color}15`,
                        color: done ? '#42e08b' : mod.color,
                        boxShadow: done ? 'inset 0 0 0 1px rgba(66,224,139,0.3)' : `inset 0 0 0 1px ${mod.color}30`,
                      }}
                    >
                      {done ? <CheckCircle2 size={17} /> : mod.comingSoon ? <Lock size={14} /> : mod.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-mono text-[11px]" style={{ color: '#5f7d99' }}>{mod.number}</span>
                        <span className="font-semibold text-sm md:text-base">{mod.title}</span>
                        {mod.comingSoon && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: '#5f7d99', border: '1px solid rgba(120,170,220,.2)' }}>Coming soon</span>}
                      </div>
                      <p className="text-xs md:text-sm mt-1 leading-relaxed" style={{ color: '#8494ac' }}>{mod.subtitle}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex gap-1 flex-wrap">
                          {mod.tags.map(tag => (
                            <span key={tag} className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${mod.color}12`, color: `${mod.color}cc` }}>{tag}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 ml-auto" style={{ color: '#5f7d99' }}>
                          <Clock size={11} /><span className="font-mono text-[11px]">{mod.duration}</span>
                        </div>
                      </div>
                    </div>
                    {!mod.comingSoon && <ChevronRight size={16} className="flex-shrink-0 mt-1 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" />}
                  </motion.button>
                )
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq" style={{ borderTop: '1px solid rgba(120,170,220,.12)', background: 'rgba(8,12,20,.4)' }}>
        <div className="max-w-[820px] mx-auto px-6 md:px-8 py-20 md:py-24">
          <h2 className="text-center font-bold text-3xl md:text-[40px] leading-[1.05] mb-11" style={{ letterSpacing: '-.02em' }}>Questions, answered.</h2>
          <div className="flex flex-col gap-3.5">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(120,170,220,.16)', background: 'rgba(8,12,20,.5)' }}>
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full text-left px-6 py-5 font-semibold text-base md:text-[17px] flex items-center justify-between gap-4"
                >
                  {f.q}
                  <span className="flex-shrink-0 font-mono" style={{ color: '#5f7d99' }}>{faqOpen === i ? '−' : '+'}</span>
                </button>
                {faqOpen === i && (
                  <p className="px-6 pb-5 -mt-1 text-[15px] leading-relaxed" style={{ color: '#9fb0c8' }}>{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="relative px-6 py-24 md:py-32 text-center" style={{ backgroundImage: 'radial-gradient(circle at 50% 120%, rgba(53,224,234,.14), transparent 55%)' }}>
        <span className="font-mono text-xs uppercase" style={{ letterSpacing: '.24em', color: '#35e0ea' }}>Ready?</span>
        <h2 className="mt-4 mx-auto max-w-2xl font-bold text-4xl md:text-[56px] leading-[1.02]" style={{ letterSpacing: '-.03em' }}>Write the first byte today.</h2>
        <p className="mt-5 mx-auto max-w-md text-[#9fb0c8] text-base md:text-lg leading-relaxed">Module 0 is free and takes about fifteen minutes. By the end, you'll know exactly why the OS exists at all.</p>
        <div className="flex flex-wrap gap-3.5 justify-center mt-9">
          <button onClick={() => navigate('/chapter/M00')} className="btn-primary px-8 py-4 text-base" style={{ backgroundColor: '#35e0ea', '--btn-glow': 'rgba(53,224,234,.5)' }}>start_lesson_00 →</button>
          <a href="#curriculum" className="btn-secondary px-8 py-4 text-base">See the curriculum</a>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer style={{ borderTop: '1px solid rgba(120,170,220,.12)', background: 'rgba(6,9,15,.7)' }}>
        <div className="max-w-[1180px] mx-auto px-6 md:px-8 py-14 grid sm:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center w-[30px] h-[30px] rounded-md font-mono font-bold text-sm" style={{ border: '1px solid rgba(53,224,234,.5)', background: 'rgba(53,224,234,.08)', color: '#35e0ea' }}>/</span>
              <span className="font-bold text-lg">BYOOS</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed" style={{ color: '#7d8aa0' }}>Build Your Own Operating System. Understand how your computer really works — from the first byte.</p>
          </div>
          <div>
            <div className="font-mono text-xs uppercase mb-4" style={{ letterSpacing: '.12em', color: '#9fb0c8' }}>Learn</div>
            <div className="flex flex-col gap-2.5">
              <a href="#curriculum" className="text-sm text-[#9fb0c8] hover:text-[#eef3fa] transition-colors">Curriculum</a>
              <a href="#how-it-works" className="text-sm text-[#9fb0c8] hover:text-[#eef3fa] transition-colors">How it works</a>
              <a href="#faq" className="text-sm text-[#9fb0c8] hover:text-[#eef3fa] transition-colors">FAQ</a>
            </div>
          </div>
          <div>
            <div className="font-mono text-xs uppercase mb-4" style={{ letterSpacing: '.12em', color: '#9fb0c8' }}>Start</div>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => navigate('/chapter/M00')} className="text-sm text-left text-[#9fb0c8] hover:text-[#eef3fa] transition-colors">Module 00 — free</button>
            </div>
          </div>
          <div>
            <div className="font-mono text-xs uppercase mb-4" style={{ letterSpacing: '.12em', color: '#9fb0c8' }}>Elsewhere</div>
            <div className="flex flex-col gap-2.5">
              <a href="https://reactmastery.xyz" target="_blank" rel="noopener noreferrer" className="text-sm text-[#9fb0c8] hover:text-[#eef3fa] transition-colors">
                ReactMastery
                <span className="block text-xs mt-1 leading-relaxed" style={{ color: '#5f7d99' }}>Learn React by writing code, not reading theory — pick up JS fundamentals along the way.</span>
              </a>
              <a href="https://wiki.osdev.org/" target="_blank" rel="noopener noreferrer" className="text-sm text-[#9fb0c8] hover:text-[#eef3fa] transition-colors">
                OSDev Wiki
                <span className="block text-xs mt-1 leading-relaxed" style={{ color: '#5f7d99' }}>For more old-style content, the OSDev wiki is the reference the whole hobby OS community builds from.</span>
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-[1180px] mx-auto px-6 md:px-8 py-5 flex flex-wrap justify-between gap-2 font-mono text-[12.5px]" style={{ borderTop: '1px solid rgba(120,170,220,.1)', color: '#5f7d99' }}>
          <span>© 2026 BYOOS · all bytes reserved</span>
          <span>Built with &lt;3 by Aditya 🇮🇳</span>
        </div>
      </footer>
    </div>
  )
}

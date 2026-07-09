import { useState, useRef, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'

const HELP = 'commands: help, clear, uptime, meminfo, echo <text>'

function runCommand(cmd, ticks) {
  const trimmed = cmd.trim()
  if (trimmed === '') return null
  if (trimmed === 'help') return HELP
  if (trimmed === 'uptime') return `ticks since boot: ${ticks}`
  if (trimmed === 'meminfo') return 'heap_current: 0x00403A40  free_list: 3 blocks'
  if (trimmed === 'clear') return '__CLEAR__'
  if (trimmed.startsWith('echo ')) return trimmed.slice(5)
  return `unknown command: ${trimmed}`
}

export default function KernelShellSim() {
  const [lines, setLines] = useState(['byoos kernel shell — type "help" to begin'])
  const [input, setInput] = useState('')
  const [ticks, setTicks] = useState(0)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setTicks(tk => tk + 100), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [lines])

  const submit = (e) => {
    e.preventDefault()
    const result = runCommand(input, ticks)
    if (result === '__CLEAR__') {
      setLines([])
    } else if (result !== null) {
      setLines(prev => [...prev, `byoos> ${input}`, result])
    } else {
      setLines(prev => [...prev, `byoos> ${input}`])
    }
    setInput('')
  }

  const reset = () => { setLines(['byoos kernel shell — type "help" to begin']); setInput(''); setTicks(0) }

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02] gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f56' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#27c93f' }} />
          <span className="ml-2 text-[11px] font-mono text-white/40">qemu — byoos.img — shell_task() running</span>
        </div>
        <button onClick={reset} className="p-1.5 rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all"><RotateCcw size={13} /></button>
      </div>

      <div
        onClick={() => inputRef.current?.focus()}
        className="p-4 font-mono text-[13px] leading-relaxed h-64 overflow-y-auto cursor-text"
        style={{ color: '#b9c6da' }}
      >
        {lines.map((l, i) => (
          <div key={i} className={l.startsWith('byoos>') ? 'text-white' : 'text-emerald-300/80'}>{l}</div>
        ))}
        <form onSubmit={submit} className="flex items-center gap-1.5">
          <span className="text-white flex-shrink-0">byoos&gt;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
            spellCheck={false}
            className="flex-1 bg-transparent outline-none text-white font-mono text-[13px]"
          />
          <span className="w-[8px] h-[15px] bg-cyan-400 animate-blink flex-shrink-0" />
        </form>
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-2 border-t border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
        <span className="text-[10px] font-mono text-white/25">timer_ticks: {ticks} — Module B05's PIT, still counting underneath the shell</span>
      </div>
    </div>
  )
}

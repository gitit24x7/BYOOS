import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react'

const PROCESS_COLORS = ['#5e9eff', '#a78bfa', '#4ade80', '#ff8c42']
const STATES = ['READY', 'RUNNING', 'WAITING']

function makeProcesses(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `P${i + 1}`,
    color: PROCESS_COLORS[i % PROCESS_COLORS.length],
    state: i === 0 ? 'RUNNING' : 'READY',
    timeUsed: 0,
    totalTime: 8 + Math.floor(Math.random() * 8),
    burst: 0,
  }))
}

export default function CPUSchedulerSim() {
  const [processes, setProcesses] = useState(() => makeProcesses(4))
  const [currentIdx, setCurrentIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [timeSlice] = useState(3)
  const [tick, setTick] = useState(0)
  const [log, setLog] = useState([])
  const logRef = useRef(null)

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setProcesses(prev => {
        const procs = prev.map(p => ({ ...p }))
        const curr = procs[currentIdx % procs.length]
        curr.state = 'RUNNING'
        curr.timeUsed = Math.min(curr.timeUsed + 1, curr.totalTime)
        curr.burst += 1
        return procs
      })
      setTick(t => t + 1)
    }, 400)
    return () => clearInterval(interval)
  }, [running, currentIdx])

  useEffect(() => {
    setProcesses(prev => {
      const procs = prev.map(p => ({ ...p }))
      const curr = procs[currentIdx % procs.length]
      if (curr.burst >= timeSlice || curr.timeUsed >= curr.totalTime) {
        // Preempt — move to next
        curr.state = curr.timeUsed >= curr.totalTime ? 'DONE' : 'READY'
        curr.burst = 0
        const nextIdx = (currentIdx + 1) % procs.length
        setCurrentIdx(nextIdx)
        setLog(l => [...l.slice(-8), `⟳ Preempted ${curr.name} → ${procs[nextIdx].name}`])
      }
      return procs
    })
  }, [tick])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const reset = () => {
    setProcesses(makeProcesses(4))
    setCurrentIdx(0)
    setRunning(false)
    setLog([])
    setTick(0)
  }

  const activeProc = processes[currentIdx % processes.length]

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
          <span className="text-xs font-mono text-white/50">CPU Round-Robin Scheduler</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="p-1.5 rounded text-white/30 hover:text-white/60 transition-colors">
            <RotateCcw size={13} />
          </button>
          <button
            onClick={() => setRunning(r => !r)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              running
                ? 'bg-white/10 text-white/60 hover:bg-white/15'
                : 'bg-green-500 text-black hover:bg-green-400'
            }`}
          >
            {running ? <><Pause size={11} /> Pause</> : <><Play size={11} fill="black" /> Run</>}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* CPU indicator */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-[11px] text-white/30 font-mono w-10">CPU</div>
          <div
            className="flex-1 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-300"
            style={{
              backgroundColor: running ? `${activeProc?.color}20` : 'rgba(255,255,255,0.04)',
              borderColor: running ? `${activeProc?.color}40` : 'rgba(255,255,255,0.06)',
              color: running ? activeProc?.color : 'rgba(255,255,255,0.2)',
              border: '1px solid',
            }}
          >
            {running ? `▶ Executing ${activeProc?.name}` : 'Idle'}
          </div>
        </div>

        {/* Process rows */}
        <div className="space-y-2.5">
          {processes.map((proc) => {
            const pct = Math.round((proc.timeUsed / proc.totalTime) * 100)
            const isActive = proc.id === currentIdx % processes.length && running
            const isDone = proc.timeUsed >= proc.totalTime

            return (
              <div key={proc.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                isActive ? 'bg-white/[0.06] ring-1' : 'bg-white/[0.02]'
              }`}
                style={{ '--tw-ring-color': isActive ? `${proc.color}30` : undefined }}
              >
                {/* Name */}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ backgroundColor: `${proc.color}20`, color: proc.color }}
                >
                  {proc.name}
                </div>

                {/* State badge */}
                <div className={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 w-16 ${
                  isDone ? 'text-white/20' :
                  isActive ? 'text-green-400' : 'text-white/30'
                }`}>
                  {isDone ? 'DONE' : isActive ? 'RUNNING' : 'READY'}
                </div>

                {/* Progress bar */}
                <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-400"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isDone ? 'rgba(255,255,255,0.15)' : proc.color,
                    }}
                  />
                </div>

                <span className="text-[11px] font-mono text-white/25 w-10 text-right">{pct}%</span>
              </div>
            )
          })}
        </div>

        {/* Scheduler log */}
        <div
          ref={logRef}
          className="h-20 overflow-y-auto font-mono text-[11px] space-y-1 bg-black/30 rounded-lg p-3"
        >
          {log.length === 0 ? (
            <p className="text-white/15">Press Run to start the scheduler...</p>
          ) : (
            log.map((entry, i) => (
              <p key={i} className="text-white/40">{entry}</p>
            ))
          )}
        </div>

        {/* Explanation */}
        <div className="text-xs text-white/30 leading-relaxed border-t border-white/[0.04] pt-4">
          Each process gets a time slice of <span className="text-white/50 font-mono">{timeSlice}</span> ticks.
          When time is up, the scheduler forcibly preempts it and runs the next process.
          This is round-robin scheduling — the simplest fair scheduler.
        </div>
      </div>
    </div>
  )
}

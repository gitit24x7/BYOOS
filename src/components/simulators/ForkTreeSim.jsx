import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw, Plus, X } from 'lucide-react'

let pidCounter = 2

function freshPid() {
  return pidCounter++
}

const PROCESS_COLORS = [
  '#5e9eff', '#a78bfa', '#4ade80', '#fbbf24',
  '#f87171', '#ff8c42', '#38bdf8', '#e879f9',
]

function getColor(depth) {
  return PROCESS_COLORS[depth % PROCESS_COLORS.length]
}

function ProcessNode({ node, depth = 0, onFork, onKill, maxDepth = 4 }) {
  const color = getColor(depth)
  const canFork = depth < maxDepth && node.alive
  const isInit = node.pid === 1

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: node.alive ? 1 : 0.35, x: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex flex-col gap-1"
    >
      <div className="flex items-center gap-2">
        {/* Connector */}
        {depth > 0 && (
          <div className="flex items-center gap-0 flex-shrink-0">
            <div className="w-4 border-t border-white/[0.1]" />
          </div>
        )}

        {/* Process pill */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            node.alive ? '' : 'opacity-50'
          }`}
          style={{
            borderColor: node.alive ? `${color}40` : 'rgba(255,255,255,0.08)',
            backgroundColor: node.alive ? `${color}12` : 'rgba(255,255,255,0.02)',
          }}
        >
          {/* Status dot */}
          <div
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${node.alive ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: node.alive ? color : 'rgba(255,255,255,0.2)' }}
          />

          <div className="flex items-center gap-1.5">
            <span style={{ color: node.alive ? color : 'rgba(255,255,255,0.3)' }}>
              {isInit ? '🔱 ' : ''}PID {node.pid}
            </span>
            <span className="text-white/30">{node.name}</span>
            {!node.alive && <span className="text-[10px] text-white/20">[zombie → exited]</span>}
          </div>

          {/* Actions */}
          {!isInit && node.alive && (
            <div className="flex gap-1 ml-1">
              {canFork && (
                <button
                  onClick={() => onFork(node.pid)}
                  title="fork()"
                  className="w-4 h-4 rounded flex items-center justify-center text-white/30 hover:text-green-400 hover:bg-green-400/10 transition-colors"
                >
                  <Plus size={10} strokeWidth={3} />
                </button>
              )}
              <button
                onClick={() => onKill(node.pid)}
                title="kill / exit"
                className="w-4 h-4 rounded flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <X size={10} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div className="ml-6 pl-4 border-l border-white/[0.06] space-y-1">
          <AnimatePresence>
            {node.children.map(child => (
              <ProcessNode
                key={child.pid}
                node={child}
                depth={depth + 1}
                onFork={onFork}
                onKill={onKill}
                maxDepth={maxDepth}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

const DEMO_PROGRAMS = ['bash', 'python', 'node', 'vim', 'git', 'curl', 'ssh', 'make', 'gcc', 'ls']

const buildInitialTree = () => ({
  pid: 1,
  name: 'systemd',
  alive: true,
  children: [
    {
      pid: 2,
      name: 'bash',
      alive: true,
      children: [],
    },
    {
      pid: 3,
      name: 'sshd',
      alive: true,
      children: [],
    },
  ],
})

export default function ForkTreeSim() {
  const [tree, setTree] = useState(buildInitialTree)
  const [log, setLog] = useState([
    { msg: 'PID 1 (systemd) started — root of all processes', color: '#5e9eff' },
    { msg: 'PID 2 (bash) forked from systemd', color: '#a78bfa' },
    { msg: 'PID 3 (sshd) forked from systemd', color: '#4ade80' },
  ])
  const logRef = useRef(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const addLog = (msg, color = '#5e9eff') => {
    setLog(l => [...l.slice(-20), { msg, color }])
  }

  const findNode = (node, pid) => {
    if (node.pid === pid) return node
    for (const child of (node.children || [])) {
      const found = findNode(child, pid)
      if (found) return found
    }
    return null
  }

  const handleFork = (parentPid) => {
    const newPid = freshPid()
    const progName = DEMO_PROGRAMS[Math.floor(Math.random() * DEMO_PROGRAMS.length)]
    const color = getColor(Math.floor(Math.random() * 8))
    addLog(`fork() → PID ${newPid} (${progName}) born from PID ${parentPid}`, color)

    setTree(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const parent = findNode(next, parentPid)
      if (parent) {
        parent.children.push({ pid: newPid, name: progName, alive: true, children: [] })
      }
      return next
    })
  }

  const handleKill = (pid) => {
    addLog(`PID ${pid} exited (exit code 0)`, '#f87171')
    setTree(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const node = findNode(next, pid)
      if (node) {
        node.alive = false
        // Reparent children to PID 1
        if (node.children && node.children.length > 0) {
          addLog(`Children of PID ${pid} reparented to PID 1 (systemd)`, '#fbbf24')
          const orphans = node.children
          node.children = []
          const init = findNode(next, 1)
          if (init) init.children.push(...orphans)
        }
      }
      return next
    })
  }

  const reset = () => {
    pidCounter = 4
    setTree(buildInitialTree())
    setLog([{ msg: 'Reset — tree restored to boot state', color: '#5e9eff' }])
  }

  const countAlive = (node) => {
    const alive = node.alive ? 1 : 0
    return alive + (node.children || []).reduce((acc, c) => acc + countAlive(c), 0)
  }

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#090912]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
          <span className="text-xs font-mono text-white/50">Process Tree — {countAlive(tree)} alive</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleFork(2)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
          >
            <Plus size={11} /> fork() from bash
          </button>
          <button onClick={reset} className="p-1.5 rounded text-white/30 hover:text-white/60 transition-colors">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      <div className="p-5 grid md:grid-cols-2 gap-5">
        {/* Tree */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest">Process family tree</p>
          <div className="min-h-48">
            <ProcessNode
              node={tree}
              depth={0}
              onFork={handleFork}
              onKill={handleKill}
            />
          </div>
          <p className="text-[10px] text-white/20 mt-3">
            <span className="text-green-400">+</span> fork() a child · <span className="text-red-400">✕</span> kill/exit
          </p>
        </div>

        {/* Event log */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest">syscall log</p>
          <div
            ref={logRef}
            className="h-52 overflow-y-auto space-y-1 font-mono text-[11px] pr-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          >
            {log.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2"
              >
                <span className="text-white/20 flex-shrink-0">{String(i).padStart(2, '0')}</span>
                <span style={{ color: entry.color || 'rgba(255,255,255,0.5)' }}>{entry.msg}</span>
              </motion.div>
            ))}
          </div>

          {/* Key concepts */}
          <div className="space-y-1.5 pt-2 border-t border-white/[0.05]">
            {[
              { key: 'fork()', val: 'Creates a child process — exact copy of parent', col: '#5e9eff' },
              { key: 'exec()', val: 'Replaces child with a new program', col: '#a78bfa' },
              { key: 'waitpid()', val: 'Parent waits for child to exit', col: '#4ade80' },
              { key: 'Reparenting', val: 'Orphaned children go to PID 1', col: '#fbbf24' },
            ].map(item => (
              <div key={item.key} className="flex items-start gap-2 text-[10px]">
                <code className="font-mono flex-shrink-0 px-1.5 py-0.5 rounded" style={{ backgroundColor: `${item.col}18`, color: item.col }}>
                  {item.key}
                </code>
                <span className="text-white/35">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

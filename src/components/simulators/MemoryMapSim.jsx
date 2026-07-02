import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw, ArrowRight } from 'lucide-react'

const PAGE_SIZE = 4   // 4 units per page for visualization
const NUM_VIRTUAL_PAGES = 8
const NUM_PHYSICAL_FRAMES = 12

const PROCESSES = [
  { id: 'chrome', name: 'Chrome', color: '#5e9eff', emoji: '🌐' },
  { id: 'spotify', name: 'Spotify', color: '#a78bfa', emoji: '🎵' },
  { id: 'vscode', name: 'VS Code', color: '#4ade80', emoji: '💻' },
]

function makePageTable(frames) {
  // Map virtual pages to physical frames
  return Array.from({ length: NUM_VIRTUAL_PAGES }, (_, i) =>
    i < frames.length ? frames[i] : -1
  )
}

const INITIAL_TABLES = {
  chrome:  makePageTable([0, 3, 7, 9, 11]),
  spotify: makePageTable([1, 5, 8, 2]),
  vscode:  makePageTable([4, 6, 10]),
}

export default function MemoryMapSim() {
  const [selectedProcess, setSelectedProcess] = useState('chrome')
  const [hoveredVPage, setHoveredVPage] = useState(null)
  const [translating, setTranslating] = useState(null)
  const [pageTables] = useState(INITIAL_TABLES)

  const currentTable = pageTables[selectedProcess]
  const currentProc = PROCESSES.find(p => p.id === selectedProcess)

  // Build reverse map: physical frame → who owns it
  const frameOwners = {}
  PROCESSES.forEach(proc => {
    pageTables[proc.id].forEach((frame, vpage) => {
      if (frame !== -1) frameOwners[frame] = { proc: proc.id, vpage, color: proc.color }
    })
  })

  const handleTranslate = (vpage) => {
    setTranslating({ vpage, frame: currentTable[vpage] })
    setTimeout(() => setTranslating(null), 2000)
  }

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse-slow" />
          <span className="text-xs font-mono text-white/50">Virtual Memory Map</span>
        </div>
        {/* Process selector */}
        <div className="flex gap-1.5">
          {PROCESSES.map(proc => (
            <button
              key={proc.id}
              onClick={() => setSelectedProcess(proc.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedProcess === proc.id
                  ? 'text-black scale-105'
                  : 'text-white/40 bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
              style={selectedProcess === proc.id ? { backgroundColor: proc.color } : {}}
            >
              {proc.emoji} {proc.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 grid md:grid-cols-2 gap-6">
        {/* Virtual address space */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">
            {currentProc.emoji} {currentProc.name}'s Virtual Address Space
          </p>
          <div className="space-y-1.5">
            {Array.from({ length: NUM_VIRTUAL_PAGES }, (_, vp) => {
              const frame = currentTable[vp]
              const isMapped = frame !== -1
              const isHovered = hoveredVPage === vp
              const isTranslating = translating?.vpage === vp

              return (
                <motion.button
                  key={vp}
                  onMouseEnter={() => setHoveredVPage(vp)}
                  onMouseLeave={() => setHoveredVPage(null)}
                  onClick={() => isMapped && handleTranslate(vp)}
                  animate={isTranslating ? { x: [0, 4, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${
                    isMapped
                      ? isHovered || isTranslating
                        ? 'border-current bg-white/[0.08] cursor-pointer'
                        : 'border-white/[0.08] bg-white/[0.03] cursor-pointer hover:bg-white/[0.06]'
                      : 'border-white/[0.04] bg-transparent opacity-40 cursor-default'
                  }`}
                  style={isMapped ? { color: currentProc.color, borderColor: isHovered ? `${currentProc.color}40` : undefined } : {}}
                >
                  <span className="text-[10px] font-mono text-white/25 w-14">vpage {vp}</span>
                  <span className="text-[10px] font-mono w-20">
                    {`0x${(vp * PAGE_SIZE * 1024).toString(16).padStart(4, '0')}`}
                    {' — '}
                    {`0x${((vp + 1) * PAGE_SIZE * 1024 - 1).toString(16).padStart(4, '0')}`}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/[0.06]">
                    {isMapped && (
                      <div
                        className="h-full rounded-full"
                        style={{ width: '100%', backgroundColor: currentProc.color, opacity: 0.6 }}
                      />
                    )}
                  </div>
                  {isMapped ? (
                    <span className="text-[10px] font-mono opacity-70">→ frame {frame}</span>
                  ) : (
                    <span className="text-[10px] text-white/15">not mapped</span>
                  )}
                </motion.button>
              )
            })}
          </div>
          <p className="text-[10px] text-white/20 mt-2">Click a mapped page to simulate translation →</p>
        </div>

        {/* Physical memory */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Physical RAM (shared)</p>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: NUM_PHYSICAL_FRAMES }, (_, frame) => {
              const owner = frameOwners[frame]
              const ownerProc = owner ? PROCESSES.find(p => p.id === owner.proc) : null
              const isHighlighted = owner?.proc === selectedProcess && hoveredVPage !== null && currentTable[hoveredVPage] === frame
              const isTranslated = translating?.frame === frame

              return (
                <motion.div
                  key={frame}
                  animate={isTranslated ? { scale: [1, 1.15, 1] } : isHighlighted ? { scale: 1.05 } : {}}
                  transition={{ duration: 0.4 }}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center border transition-all duration-300"
                  style={{
                    backgroundColor: ownerProc ? `${ownerProc.color}18` : 'rgba(255,255,255,0.03)',
                    borderColor: isHighlighted || isTranslated
                      ? (ownerProc?.color || 'rgba(255,255,255,0.2)')
                      : ownerProc
                      ? `${ownerProc.color}25`
                      : 'rgba(255,255,255,0.05)',
                    boxShadow: isTranslated ? `0 0 20px ${ownerProc?.color}40` : undefined,
                  }}
                >
                  <span className="text-[10px] font-mono text-white/20">f{frame}</span>
                  {ownerProc && (
                    <span className="text-base mt-0.5" title={`${ownerProc.name} vpage ${owner.vpage}`}>
                      {ownerProc.emoji}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>
          <div className="space-y-1.5 mt-3">
            {PROCESSES.map(proc => (
              <div key={proc.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: proc.color }} />
                <span className="text-[11px] text-white/40">{proc.emoji} {proc.name}</span>
                <span className="text-[11px] font-mono text-white/20 ml-auto">
                  {pageTables[proc.id].filter(f => f !== -1).length} frames
                </span>
              </div>
            ))}
            <p className="text-[10px] text-white/20 pt-1 border-t border-white/[0.05]">
              Same physical frame = same RAM bytes shared by all processes pointing to it
            </p>
          </div>
        </div>
      </div>

      {/* Translation animation panel */}
      <AnimatePresence>
        {translating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-purple-500/20 bg-purple-950/20 px-5 py-4"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm font-mono">
                <span className="text-white/50">Virtual:</span>
                <span style={{ color: currentProc.color }}>
                  0x{(translating.vpage * PAGE_SIZE * 1024).toString(16).padStart(4, '0')}
                </span>
                <span className="text-white/25">(page {translating.vpage})</span>
              </div>
              <ArrowRight size={14} className="text-purple-400 animate-pulse" />
              <span className="text-[11px] text-purple-400 font-mono">MMU lookup: page_table[{translating.vpage}] = frame {translating.frame}</span>
              <ArrowRight size={14} className="text-purple-400" />
              <div className="flex items-center gap-1.5 text-sm font-mono">
                <span className="text-white/50">Physical:</span>
                <span className="text-green-400">
                  0x{(translating.frame * PAGE_SIZE * 1024).toString(16).padStart(4, '0')}
                </span>
                <span className="text-white/25">(frame {translating.frame})</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

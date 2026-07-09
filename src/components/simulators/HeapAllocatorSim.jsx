import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

const HEAP_SIZE = 512
const COLORS = ['#42e08b', '#35e0ea', '#9b8cff', '#f6b73c', '#ff6b81']

function findFreeBlock(blocks, size) {
  return blocks.findIndex(b => b.free && b.size >= size)
}

export default function HeapAllocatorSim() {
  const [blocks, setBlocks] = useState([{ id: 0, size: HEAP_SIZE, free: true }])
  const [nextId, setNextId] = useState(1)
  const [log, setLog] = useState('Heap is one big free block — nothing allocated yet.')

  const alloc = (size) => {
    setBlocks(prev => {
      const idx = findFreeBlock(prev, size)
      if (idx === -1) {
        const totalFree = prev.filter(b => b.free).reduce((s, b) => s + b.size, 0)
        if (totalFree >= size) {
          setLog(`malloc(${size}) FAILED — ${totalFree} bytes are free in total, but no single free block is large enough. This is external fragmentation.`)
        } else {
          setLog(`malloc(${size}) FAILED — only ${totalFree} bytes free in the whole heap.`)
        }
        return prev
      }
      const block = prev[idx]
      const next = [...prev]
      const newId = nextId
      if (block.size > size) {
        next.splice(idx, 1,
          { id: newId, size, free: false, color: COLORS[newId % COLORS.length] },
          { id: newId + 1000, size: block.size - size, free: true }
        )
      } else {
        next.splice(idx, 1, { id: newId, size, free: false, color: COLORS[newId % COLORS.length] })
      }
      setLog(`malloc(${size}) — first-fit found a free block, split off ${size} bytes, returned a pointer just past the header.`)
      return next
    })
    setNextId(n => n + 1)
  }

  const free = (id) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, free: true } : b))
    setLog(`free() — block marked free again. Notice it does NOT merge with neighboring free blocks (no coalescing in this minimal version) — that's exactly the fragmentation risk the chapter calls out.`)
  }

  const reset = () => {
    setBlocks([{ id: 0, size: HEAP_SIZE, free: true }])
    setNextId(1)
    setLog('Heap reset to one big free block.')
  }

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02] gap-3 flex-wrap">
        <span className="text-xs font-mono text-white/50">Free-List Heap — {HEAP_SIZE} bytes total, first-fit allocation</span>
        <button onClick={reset} className="p-1.5 rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all"><RotateCcw size={13} /></button>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex gap-1.5 h-14 rounded-lg overflow-hidden border border-white/[0.08]">
          <AnimatePresence initial={false}>
            {blocks.map(b => (
              <motion.button
                key={b.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => !b.free && free(b.id)}
                style={{
                  flexGrow: b.size,
                  flexBasis: 0,
                  backgroundColor: b.free ? 'rgba(255,255,255,0.03)' : `${b.color}30`,
                  borderRight: '1px solid rgba(0,0,0,0.4)',
                }}
                className="flex items-center justify-center text-[10px] font-mono relative group"
              >
                {!b.free && (
                  <span style={{ color: b.color }} className="font-bold">{b.size}B</span>
                )}
                {b.free && b.size > 20 && <span className="text-white/15">{b.size}B free</span>}
                {!b.free && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px]">
                    free()
                  </span>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap gap-2">
          {[32, 64, 128].map(size => (
            <button
              key={size}
              onClick={() => alloc(size)}
              className="btn-primary px-3.5 py-1.5 text-xs"
              style={{ backgroundColor: '#fb923c', '--btn-glow': 'rgba(251,146,60,0.5)' }}
            >
              kmalloc({size})
            </button>
          ))}
          <span className="text-[11px] text-white/25 self-center ml-2">click any allocated (colored) block to kfree() it</span>
        </div>

        <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <p className="text-[12px] text-white/50 leading-relaxed font-mono">{log}</p>
        </div>
      </div>
    </div>
  )
}

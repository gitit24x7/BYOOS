import { useState } from 'react'
import { motion } from 'framer-motion'

const BEFORE = [
  { label: 'CPU Exceptions', range: [0, 31], color: '#f87171' },
  { label: 'IRQ0-7 (master PIC)', range: [8, 15], color: '#fbbf24', collision: true },
  { label: 'IRQ8-15 (slave PIC)', range: [112, 119], color: '#fbbf24' },
]

const AFTER = [
  { label: 'CPU Exceptions', range: [0, 31], color: '#f87171' },
  { label: 'IRQ0-7 (master PIC)', range: [32, 39], color: '#42e08b' },
  { label: 'IRQ8-15 (slave PIC)', range: [40, 47], color: '#42e08b' },
]

function VectorStrip({ bands, highlightCollision }) {
  const max = 128
  return (
    <div className="space-y-2.5">
      <div className="relative h-8 rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.08]">
        {bands.map((b, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 flex items-center justify-center text-[9px] font-mono font-bold"
            style={{
              left: `${(b.range[0] / max) * 100}%`,
              width: `${((b.range[1] - b.range[0] + 1) / max) * 100}%`,
              backgroundColor: `${b.color}35`,
              borderRight: '1px solid rgba(0,0,0,0.3)',
              color: b.color,
            }}
          >
            {b.range[1] - b.range[0] > 8 ? `0x${b.range[0].toString(16)}` : ''}
          </div>
        ))}
        {highlightCollision && (
          <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="absolute top-0 bottom-0 border-2 border-red-400 rounded"
            style={{
              left: `${(8 / max) * 100}%`,
              width: `${(8 / max) * 100}%`,
            }}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {bands.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: b.color }} />
            <span className="text-white/50">{b.label}</span>
            <span className="font-mono text-white/25">0x{b.range[0].toString(16).toUpperCase()}-0x{b.range[1].toString(16).toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PicRemapSim() {
  const [remapped, setRemapped] = useState(false)

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02] gap-3 flex-wrap">
        <span className="text-xs font-mono text-white/50">PIC Vector Map — {remapped ? 'after remap' : 'before remap (default)'}</span>
        <button
          onClick={() => setRemapped(r => !r)}
          className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs"
          style={{ backgroundColor: remapped ? '#42e08b' : '#fbbf24', '--btn-glow': remapped ? 'rgba(66,224,139,0.5)' : 'rgba(251,191,36,0.5)' }}
        >
          {remapped ? 'Reset to default' : 'Remap the PIC'}
        </button>
      </div>

      <div className="p-5 space-y-5">
        <VectorStrip bands={remapped ? AFTER : BEFORE} highlightCollision={!remapped} />

        <motion.div
          key={remapped ? 'after' : 'before'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-4 rounded-xl border"
          style={{
            borderColor: remapped ? 'rgba(66,224,139,0.3)' : 'rgba(248,113,113,0.3)',
            backgroundColor: remapped ? 'rgba(66,224,139,0.06)' : 'rgba(248,113,113,0.06)',
          }}
        >
          {remapped ? (
            <p className="text-sm text-white/70 leading-relaxed">
              <strong className="text-[#42e08b]">Clear of the exception range.</strong> IRQ0-7 now land on vectors 0x20-0x27, and IRQ8-15 on 0x28-0x2F — both entirely outside 0x00-0x1F. A timer tick and a CPU double fault can never be confused again.
            </p>
          ) : (
            <p className="text-sm text-white/70 leading-relaxed">
              <strong className="text-red-400">Collision.</strong> IRQ0 (the timer) fires on vector 0x08 — the exact same vector Intel reserves for the Double Fault exception. Enable interrupts right now, and your IDT can't tell a routine timer tick from a fatal CPU error.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}

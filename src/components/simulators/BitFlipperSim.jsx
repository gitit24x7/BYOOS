import { useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

const toBinary = (n) => n.toString(2).padStart(8, '0')
const toHex = (n) => '0x' + n.toString(16).toUpperCase().padStart(2, '0')

function ByteToggle({ value, onChange, label, color }) {
  const bits = toBinary(value).split('').map(Number)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-white/40">{label}</span>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span style={{ color }}>{toHex(value)}</span>
          <span className="text-white/30">{value}</span>
        </div>
      </div>
      <div className="flex gap-1">
        {bits.map((bit, i) => (
          <button
            key={i}
            onClick={() => onChange(value ^ (1 << (7 - i)))}
            className="flex-1 aspect-square rounded-lg flex items-center justify-center text-sm font-mono font-bold transition-all duration-150"
            style={{
              backgroundColor: bit ? `${color}25` : 'rgba(255,255,255,0.03)',
              color: bit ? color : 'rgba(255,255,255,0.2)',
              border: `1px solid ${bit ? `${color}50` : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {bit}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {[128, 64, 32, 16, 8, 4, 2, 1].map((placeValue, i) => (
          <span key={i} className="flex-1 text-center text-[9px] text-white/15 font-mono">{placeValue}</span>
        ))}
      </div>
    </div>
  )
}

export default function BitFlipperSim() {
  const [a, setA] = useState(0b10110110)
  const [b, setB] = useState(0b00001111)
  const [op, setOp] = useState('AND')

  const result = {
    AND: a & b,
    OR: a | b,
    XOR: a ^ b,
    'NOT A': (~a) & 0xFF,
    'A << 1': (a << 1) & 0xFF,
    'A >> 1': a >> 1,
  }[op]

  const reset = () => { setA(0b10110110); setB(0b00001111); setOp('AND') }

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-xs font-mono text-white/50">Bit Flipper — click any square to toggle that bit</span>
        <button onClick={reset} className="p-1.5 rounded text-white/30 hover:text-white/60 transition-colors">
          <RotateCcw size={13} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <ByteToggle value={a} onChange={setA} label="BYTE A" color="#67e8f9" />
        <ByteToggle value={b} onChange={setB} label="BYTE B (used by AND / OR / XOR as the mask)" color="#818cf8" />

        {/* Operation picker */}
        <div className="flex gap-1.5 flex-wrap">
          {['AND', 'OR', 'XOR', 'NOT A', 'A << 1', 'A >> 1'].map(o => (
            <button
              key={o}
              onClick={() => setOp(o)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                op === o ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]'
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        {/* Result */}
        <motion.div
          key={op + a + b}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-white/40">
              RESULT — {op === 'NOT A' || op.startsWith('A ') ? op : `A ${op === 'AND' ? '&' : op === 'OR' ? '|' : '^'} B`}
            </span>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-cyan-300 font-bold">{toHex(result)}</span>
              <span className="text-white/40">{result}</span>
            </div>
          </div>
          <div className="flex gap-1">
            {toBinary(result).split('').map((bit, i) => (
              <div
                key={i}
                className="flex-1 aspect-square rounded-lg flex items-center justify-center text-sm font-mono font-bold"
                style={{
                  backgroundColor: bit === '1' ? 'rgba(103,232,249,0.15)' : 'rgba(255,255,255,0.02)',
                  color: bit === '1' ? '#67e8f9' : 'rgba(255,255,255,0.15)',
                }}
              >
                {bit}
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-[11px] text-white/25 leading-relaxed">
          Try this: set B to <code className="text-cyan-300/70">00001111</code> and pick AND — notice the top 4 bits of the result always die, no matter what A is. That's exactly how a bitmask "reads out" a subset of flags. Set B the same way and pick OR — notice it always forces the bottom 4 bits on. That's how kernel code sets flags without touching the ones it isn't interested in.
        </p>
      </div>
    </div>
  )
}

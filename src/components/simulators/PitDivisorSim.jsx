import { useState } from 'react'

const PIT_BASE = 1193182

export default function PitDivisorSim() {
  const [hz, setHz] = useState(100)

  const divisor = Math.min(65535, Math.max(1, Math.round(PIT_BASE / Math.max(1, hz))))
  const actualHz = PIT_BASE / divisor
  const error = Math.abs(actualHz - hz)
  const errorPct = hz > 0 ? (error / hz) * 100 : 0

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-xs font-mono text-white/50">PIT Divisor Calculator — base clock is fixed, only the divisor changes</span>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-mono text-white/40">Desired frequency (Hz)</label>
            <span className="font-mono text-sm text-white font-bold">{hz} Hz</span>
          </div>
          <input
            type="range"
            min={19}
            max={2000}
            value={hz}
            onChange={e => setHz(Number(e.target.value))}
            className="w-full accent-[#facc15]"
          />
          <div className="flex justify-between text-[10px] font-mono text-white/20 mt-1">
            <span>19 Hz (near the divisor ceiling)</span>
            <span>2000 Hz</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 mb-1">Base clock</p>
            <p className="font-mono text-sm text-white/70">1,193,182 Hz</p>
          </div>
          <div className="p-3 rounded-lg border text-center" style={{ borderColor: 'rgba(250,204,21,0.4)', backgroundColor: 'rgba(250,204,21,0.08)' }}>
            <p className="text-[10px] font-mono uppercase tracking-widest text-yellow-400/70 mb-1">Divisor sent to PIT</p>
            <p className="font-mono text-sm text-yellow-300 font-bold">{divisor}</p>
          </div>
          <div className="p-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 mb-1">Actual tick rate</p>
            <p className="font-mono text-sm text-white/70">{actualHz.toFixed(3)} Hz</p>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border" style={{
          borderColor: errorPct > 1 ? 'rgba(248,113,113,0.3)' : 'rgba(66,224,139,0.3)',
          backgroundColor: errorPct > 1 ? 'rgba(248,113,113,0.06)' : 'rgba(66,224,139,0.06)',
        }}>
          <p className="text-sm leading-relaxed" style={{ color: errorPct > 1 ? '#f87171' : '#42e08b' }}>
            {errorPct > 0.05
              ? `Requesting ${hz} Hz gives a divisor of ${divisor} — but 1,193,182 ÷ ${divisor} isn't exactly ${hz}. Integer division truncates the divisor, so your kernel actually ticks at ${actualHz.toFixed(3)} Hz — a ${errorPct.toFixed(2)}% difference from what you asked for.`
              : `${hz} Hz divides in almost exactly — this is one of the rare frequencies where the truncated divisor barely loses any precision.`}
          </p>
        </div>

        <p className="text-[11px] text-white/25 leading-relaxed">
          Try dragging near 19 Hz: the divisor hits its 16-bit ceiling (65535) and can't go any lower — which is exactly why very low frequencies are the hardest for the PIT to hit precisely, and why 18.2 Hz specifically became the ancient default IBM PC timer rate: it's what falls out of using the maximum possible divisor.
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

const ROWS = [
  [['Q', 0x10], ['W', 0x11], ['E', 0x12], ['R', 0x13], ['T', 0x14], ['Y', 0x15], ['U', 0x16], ['I', 0x17], ['O', 0x18], ['P', 0x19]],
  [['A', 0x1E], ['S', 0x1F], ['D', 0x20], ['F', 0x21], ['G', 0x22], ['H', 0x23], ['J', 0x24], ['K', 0x25], ['L', 0x26]],
  [['SHIFT', 0x2A, true], ['Z', 0x2C], ['X', 0x2D], ['C', 0x2E], ['V', 0x2F], ['B', 0x30], ['N', 0x31], ['M', 0x32]],
]

const ASCII_MAP = {
  0x10: 'q', 0x11: 'w', 0x12: 'e', 0x13: 'r', 0x14: 't', 0x15: 'y', 0x16: 'u', 0x17: 'i', 0x18: 'o', 0x19: 'p',
  0x1E: 'a', 0x1F: 's', 0x20: 'd', 0x21: 'f', 0x22: 'g', 0x23: 'h', 0x24: 'j', 0x25: 'k', 0x26: 'l',
  0x2C: 'z', 0x2D: 'x', 0x2E: 'c', 0x2F: 'v', 0x30: 'b', 0x31: 'n', 0x32: 'm',
}

export default function ScancodeTypingSim() {
  const [shiftHeld, setShiftHeld] = useState(false)
  const [buffer, setBuffer] = useState('')
  const [lastEvent, setLastEvent] = useState(null)

  const handlePress = (label, code, isShift) => {
    if (isShift) {
      setShiftHeld(true)
      setLastEvent({ scancode: code, kind: 'make', note: 'Shift press — tracked as held state, not buffered as a character' })
      return
    }
    const char = ASCII_MAP[code]
    const outChar = shiftHeld ? char.toUpperCase() : char
    setBuffer(b => (b + outChar).slice(-40))
    setLastEvent({ scancode: code, kind: 'make', char: outChar })
  }

  const handleRelease = (label, code, isShift) => {
    if (isShift) {
      setShiftHeld(false)
      setLastEvent({ scancode: code | 0x80, kind: 'break', note: 'Shift release — 0x2A | 0x80 = 0xAA' })
    }
  }

  const reset = () => { setBuffer(''); setShiftHeld(false); setLastEvent(null) }

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02] gap-3 flex-wrap">
        <span className="text-xs font-mono text-white/50">Scancode Typing — click keys, watch the raw port 0x60 bytes become characters</span>
        <button onClick={reset} className="p-1.5 rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all"><RotateCcw size={13} /></button>
      </div>

      <div className="p-5 space-y-4">
        {/* Terminal buffer output */}
        <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] font-mono text-sm min-h-[44px] text-emerald-300">
          {buffer || <span className="text-white/15">buffered characters appear here…</span>}
          <span className="inline-block w-2 h-4 bg-emerald-400 align-middle ml-0.5 animate-blink" />
        </div>

        {/* Virtual keyboard */}
        <div className="space-y-1.5">
          {ROWS.map((row, i) => (
            <div key={i} className="flex gap-1.5 justify-center">
              {row.map(([label, code, isShift]) => (
                <button
                  key={label}
                  onMouseDown={() => handlePress(label, code, isShift)}
                  onMouseUp={() => handleRelease(label, code, isShift)}
                  onMouseLeave={() => isShift && shiftHeld && handleRelease(label, code, isShift)}
                  className={`px-3 py-2.5 rounded-lg font-mono text-xs font-bold border transition-all ${
                    isShift && shiftHeld
                      ? 'bg-yellow-500/25 border-yellow-500/50 text-yellow-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:bg-white/[0.08] active:scale-95'
                  } ${isShift ? 'px-4' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Live scancode readout */}
        {lastEvent && (
          <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] font-mono text-[12px] space-y-1">
            <div className="flex justify-between">
              <span className="text-white/40">port 0x60 read</span>
              <span className="text-cyan-300 font-bold">0x{lastEvent.scancode.toString(16).toUpperCase().padStart(2, '0')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">code type</span>
              <span className={lastEvent.kind === 'make' ? 'text-emerald-300' : 'text-red-300'}>
                {lastEvent.kind === 'make' ? 'make (bit 7 = 0, key pressed)' : 'break (bit 7 = 1, key released)'}
              </span>
            </div>
            {lastEvent.char && (
              <div className="flex justify-between">
                <span className="text-white/40">pushed to ring buffer</span>
                <span className="text-white font-bold">'{lastEvent.char}'</span>
              </div>
            )}
            {lastEvent.note && <p className="text-white/30 pt-1">{lastEvent.note}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

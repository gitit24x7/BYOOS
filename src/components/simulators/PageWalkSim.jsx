import { useState } from 'react'

function hex(n, digits = 8) {
  return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(digits, '0')
}

export default function PageWalkSim() {
  const [addr, setAddr] = useState(0x00401000)

  const pdIndex = (addr >>> 22) & 0x3FF
  const ptIndex = (addr >>> 12) & 0x3FF
  const offset = addr & 0xFFF

  // Our identity-mapped example only has page_directory[0] present (first 4MB)
  const mapped = pdIndex === 0
  const physicalFrame = mapped ? ptIndex * 0x1000 : null
  const physicalAddr = mapped ? physicalFrame + offset : null

  const presets = [
    { label: 'Kernel code (identity-mapped)', value: 0x00401000 },
    { label: 'Still within the first 4MB', value: 0x003FF800 },
    { label: 'Outside the mapped range', value: 0x01000000 },
  ]

  return (
    <div className="my-8 rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0c0c14]">
      <div className="px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-xs font-mono text-white/50">Page Walk — translate a virtual address using this chapter's identity-mapped first_page_table</span>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p.value}
              onClick={() => setAddr(p.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all ${
                addr === p.value ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="p-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 mb-1">Virtual address</p>
          <p className="font-mono text-lg text-white font-bold">{hex(addr)}</p>
        </div>

        {/* Bit split */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg text-center border" style={{ borderColor: 'rgba(167,139,250,0.35)', backgroundColor: 'rgba(167,139,250,0.08)' }}>
            <p className="text-[9px] font-mono uppercase text-purple-300/70">bits 31-22 · PD index</p>
            <p className="font-mono text-sm text-purple-300 font-bold">{pdIndex}</p>
          </div>
          <div className="p-2.5 rounded-lg text-center border" style={{ borderColor: 'rgba(53,224,234,0.35)', backgroundColor: 'rgba(53,224,234,0.08)' }}>
            <p className="text-[9px] font-mono uppercase text-cyan-300/70">bits 21-12 · PT index</p>
            <p className="font-mono text-sm text-cyan-300 font-bold">{ptIndex}</p>
          </div>
          <div className="p-2.5 rounded-lg text-center border" style={{ borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.08)' }}>
            <p className="text-[9px] font-mono uppercase text-yellow-300/70">bits 11-0 · offset</p>
            <p className="font-mono text-sm text-yellow-300 font-bold">{hex(offset, 3)}</p>
          </div>
        </div>

        {/* Walk */}
        <div className="space-y-1.5 font-mono text-[12px]">
          <div className="flex justify-between p-2 rounded-lg bg-white/[0.02]">
            <span className="text-white/40">page_directory[{pdIndex}]</span>
            <span className={mapped ? 'text-emerald-300' : 'text-red-400'}>{mapped ? 'PRESENT → first_page_table' : 'not present'}</span>
          </div>
          {mapped ? (
            <>
              <div className="flex justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-white/40">first_page_table[{ptIndex}]</span>
                <span className="text-emerald-300">PRESENT → frame {hex(physicalFrame)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                <span className="text-white/60">physical address</span>
                <span className="text-emerald-300 font-bold">{hex(physicalAddr)} + offset {hex(offset, 3)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between p-2 rounded-lg border border-red-500/30 bg-red-500/10">
              <span className="text-white/60">result</span>
              <span className="text-red-400 font-bold">PAGE FAULT — no handler installed yet</span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-white/25 leading-relaxed">
          This chapter's paging_init() only marks page_directory[0] present — covering the first 4MB, identity-mapped so virtual and physical addresses match exactly. Try the third preset: it falls outside that range, and the walk stops at an absent PDE, exactly the page-fault-with-no-handler scenario this chapter's closing Socratic asks about.
        </p>
      </div>
    </div>
  )
}

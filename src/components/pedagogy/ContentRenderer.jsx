import CalloutBox from './CalloutBox'
import SocraticPause from './SocraticPause'
import ExplicitInsight, { WhatThisMeans } from './ExplicitInsight'
import ConnectionBridge from './ConnectionBridge'
import TraceChain from './TraceChain'
import Checkpoint from './Checkpoint'
import Troubleshoot from './Troubleshoot'
import CodePane from '../code/CodePane'
import CPUSchedulerSim from '../simulators/CPUSchedulerSim'
import BootSequenceSim from '../simulators/BootSequenceSim'
import MemoryMapSim from '../simulators/MemoryMapSim'
import SyscallTraceSim from '../simulators/SyscallTraceSim'
import ForkTreeSim from '../simulators/ForkTreeSim'
import BitFlipperSim from '../simulators/BitFlipperSim'
import ProtectedModeSim from '../simulators/ProtectedModeSim'
import InterruptTraceSim from '../simulators/InterruptTraceSim'
import PicRemapSim from '../simulators/PicRemapSim'
import InterruptStackSim from '../simulators/InterruptStackSim'
import PitDivisorSim from '../simulators/PitDivisorSim'
import PageWalkSim from '../simulators/PageWalkSim'
import HeapAllocatorSim from '../simulators/HeapAllocatorSim'
import ScancodeTypingSim from '../simulators/ScancodeTypingSim'
import KernelShellSim from '../simulators/KernelShellSim'

// Render inline markdown-ish text: **bold** and `code`
function RichText({ text }) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="font-mono text-[0.85em] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">{part.slice(1, -1)}</code>
        return part
      })}
    </>
  )
}

function TextBlock({ block }) {
  const paragraphs = block.content.split('\n\n').filter(Boolean)
  return (
    <div className="space-y-4 my-6">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-base md:text-lg leading-relaxed text-white/75">
          <RichText text={para} />
        </p>
      ))}
    </div>
  )
}

function HistoryBlock({ block }) {
  const paragraphs = block.content.split('\n\n').filter(Boolean)
  return (
    <div className="my-6 pl-4 border-l-2 border-amber-500/30 space-y-3">
      <p className="text-[11px] font-bold text-amber-400/60 uppercase tracking-widest">📜 Historical Context</p>
      {paragraphs.map((para, i) => (
        <p key={i} className="text-sm md:text-base leading-relaxed text-white/60 italic">
          <RichText text={para} />
        </p>
      ))}
    </div>
  )
}

function AnalogyBlock({ block }) {
  return (
    <div className="my-8 rounded-xl overflow-hidden border border-purple-500/20 bg-purple-950/10">
      <div className="px-4 py-2.5 border-b border-purple-500/15 bg-purple-500/5">
        <p className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">🪞 Analogy</p>
      </div>
      <div className="p-4 md:p-5 space-y-4">
        <p className="text-sm md:text-base leading-relaxed text-white/70 italic">{block.analogy}</p>
        <div className="bg-black/20 rounded-lg p-3.5 border border-purple-500/10">
          <p className="text-[11px] font-bold text-purple-400/60 uppercase tracking-widest mb-1">The connection</p>
          <p className="text-sm text-white/60 leading-relaxed">{block.connection}</p>
        </div>
      </div>
    </div>
  )
}

function SimulatorBlock({ block }) {
  if (block.id === 'cpu-scheduler-sim') return <CPUSchedulerSim />
  if (block.id === 'boot-sequence-sim') return <BootSequenceSim />
  if (block.id === 'memory-map-sim') return <MemoryMapSim />
  if (block.id === 'syscall-trace-sim') return <SyscallTraceSim />
  if (block.id === 'fork-tree-sim') return <ForkTreeSim />
  if (block.id === 'bit-flipper-sim') return <BitFlipperSim />
  if (block.id === 'protected-mode-sim') return <ProtectedModeSim />
  if (block.id === 'interrupt-trace-sim') return <InterruptTraceSim />
  if (block.id === 'pic-remap-sim') return <PicRemapSim />
  if (block.id === 'interrupt-stack-sim') return <InterruptStackSim />
  if (block.id === 'pit-divisor-sim') return <PitDivisorSim />
  if (block.id === 'page-walk-sim') return <PageWalkSim />
  if (block.id === 'heap-allocator-sim') return <HeapAllocatorSim />
  if (block.id === 'scancode-typing-sim') return <ScancodeTypingSim />
  if (block.id === 'kernel-shell-sim') return <KernelShellSim />
  return null
}

export default function ContentRenderer({ blocks }) {
  if (!blocks) return null
  return (
    <div>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'text':           return <TextBlock key={i} block={block} />
          case 'history':        return <HistoryBlock key={i} block={block} />
          case 'analogy':        return <AnalogyBlock key={i} block={block} />
          case 'callout':        return <CalloutBox key={i} block={block} />
          case 'code':           return <CodePane key={i} block={block} />
          case 'socratic':       return <SocraticPause key={i} block={block} />
          case 'simulator':      return <SimulatorBlock key={i} block={block} />
          case 'explicit-insight': return <ExplicitInsight key={i} block={block} />
          case 'connection-bridge': return <ConnectionBridge key={i} block={block} />
          case 'what-this-means': return <WhatThisMeans key={i} block={block} />
          case 'trace':           return <TraceChain key={i} block={block} />
          case 'checkpoint':      return <Checkpoint key={i} block={block} />
          case 'troubleshoot':    return <Troubleshoot key={i} block={block} />
          default:               return null
        }
      })}
    </div>
  )
}

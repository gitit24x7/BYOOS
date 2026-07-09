// b05_pit.js — Bring-Up 5: The Heartbeat
export const b05 = {
  id: 'B05',
  title: 'The Heartbeat',
  subtitle: 'Module 3 assumed a timer interrupt already existed. Nothing makes one exist yet.',
  estimatedMinutes: 20,

  mystery: {
    type: 'mystery',
    lines: [
      'Every scheduler in this course — Module 3\'s, and every real OS\'s — depends on one fact:',
      'something fires an interrupt at a regular, predictable interval, forever, without being asked twice.',
      'Your kernel has an IDT and a remapped PIC. It still has no ticking clock.',
      'What chip provides one, and how do you tell it exactly how fast to tick?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'Why 1,193,182 Is Such a Strange Number',
      number: '01',
      color: '#facc15',
      blocks: [
        {
          type: 'history',
          content: `It's 1981, and IBM is designing the original PC's timer circuit — the Intel 8253 Programmable Interval Timer. A dedicated crystal oscillator, precise enough for timing, costs real money on a machine where every component is being cost-optimized. IBM's engineers notice the CGA video card already needs a precise 3.579545 MHz crystal for generating its color TV signal (the NTSC colorburst frequency) — and rather than pay for a second crystal just for the timer, they divide that existing signal by 3, giving the PIT a base clock of exactly 1,193,182 Hz.

That's the whole story behind the strange number every OS developer eventually has to memorize: it isn't a carefully chosen round number, it's a video signal frequency, divided by three, chosen specifically to avoid paying for a part IBM already had a reason to include. Every PC-compatible timer since 1981 has kept this exact frequency for the same reason 0x7C00 and 0xAA55 never changed — an arbitrary early decision that became permanent the moment software started depending on it.`,
        },
      ],
    },
    {
      id: 'the-pit-and-divisor',
      title: 'You Can\'t Ask for a Frequency. You Can Only Ask for a Divisor.',
      number: '02',
      color: '#facc15',
      blocks: [
        {
          type: 'text',
          content: `The PIT has three channels, but only **channel 0** matters for this chapter: it's wired directly to IRQ0, the exact hardware line Module B03's PIC remap made safe to enable. The PIT itself has no concept of "tick at 100 Hz" — it only understands its own fixed 1,193,182 Hz internal clock, divided down by a 16-bit number you provide, called the **divisor**. The actual tick rate you get is always base clock ÷ divisor, never a frequency you specify directly.

This has a real consequence worth internalizing before writing any code: because the divisor must be a whole number, and 1,193,182 rarely divides evenly, most requested frequencies are only approximated, not hit exactly. And because the divisor is 16-bit (maximum 65,535), there's a floor on how slow the timer can tick — 1,193,182 ÷ 65,535 ≈ 18.2 Hz is the slowest rate achievable, which is exactly why 18.2 Hz became the default legacy PC timer rate: it's simply what falls out of using the largest divisor the hardware allows.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'pit.c',
          caption: 'Programming the PIT to tick at a chosen frequency — using only outb() from Module B01',
          code: `#include "io.h"

#define PIT_CHANNEL0  0x40
#define PIT_COMMAND   0x43
#define PIT_BASE_HZ   1193182

void pit_set_frequency(uint32_t hz) {
    uint16_t divisor = (uint16_t)(PIT_BASE_HZ / hz);

    outb(PIT_COMMAND, 0x36);
    outb(PIT_CHANNEL0, divisor & 0xFF);
    outb(PIT_CHANNEL0, (divisor >> 8) & 0xFF);
}`,
          annotations: [
            {
              lines: [7],
              label: 'uint16_t divisor = (uint16_t)(PIT_BASE_HZ / hz);',
              what: 'Computes the divisor for the requested frequency using integer division.',
              why: 'Integer division truncates — 1193182 / hz almost never divides evenly, so this divisor produces the closest achievable rate at or above the requested one, not necessarily the exact rate asked for. For most practical scheduler tick rates (100 Hz, 1000 Hz), the resulting error is small enough to ignore; for very precise timing needs, it matters.',
              note: null,
            },
            {
              lines: [9],
              label: 'outb(PIT_COMMAND, 0x36);',
              what: 'Sends a command byte to the PIT\'s command register, configuring channel 0\'s mode before any divisor bytes are sent.',
              why: '0x36 is 00110110 in binary — a packed bitfield, the same idiom as Module B03\'s ICW1. Reading it in groups: bits 7-6 (00) select channel 0. Bits 5-4 (11) select "lobyte/hibyte" access mode, meaning the divisor will be sent as two separate bytes, low byte first. Bits 3-1 (011) select mode 3, "square wave generator" — the standard mode for a periodic, repeating tick. Bit 0 (0) selects binary mode over BCD (binary-coded decimal, a legacy option no modern kernel uses).',
              note: 'The PIT must receive this command byte before either divisor byte — sending the divisor first would be silently interpreted as commands to whatever mode the PIT last had configured, almost never the intended result.',
            },
            {
              lines: [10, 11],
              label: 'outb(PIT_CHANNEL0, divisor & 0xFF); outb(PIT_CHANNEL0, (divisor >> 8) & 0xFF);',
              what: 'Sends the divisor\'s low byte, then its high byte, to the same channel 0 data port.',
              why: 'This is the identical shift-and-mask idiom from Module P01\'s bitwise chapter, and the same low-byte-then-high-byte pattern Module B02\'s Multiboot checksum and the boot signature construction from Module 1 all rely on. divisor & 0xFF isolates the low 8 bits; (divisor >> 8) & 0xFF shifts the high 8 bits down into range before masking them. The lobyte/hibyte access mode selected in the command byte specifically requires exactly this order — sending them reversed would silently program a completely different divisor.',
              note: null,
            },
          ],
        },
        {
          type: 'simulator',
          id: 'pit-divisor-sim',
          caption: 'Drag the frequency slider and watch the divisor, and the rounding error it introduces, update live',
        },
        {
          type: 'socratic',
          question: 'Why can\'t the PIT simply be told "tick at 100 Hz" directly, the way pit_set_frequency()\'s own function signature suggests?',
          options: [
            'It could be, but Intel chose the divisor-based interface for backward compatibility reasons only',
            'The PIT hardware itself has no concept of Hz at all — it only counts down a raw divisor against its fixed 1,193,182 Hz internal clock, so any "frequency" interface has to be software computing a divisor and handing that to the hardware, exactly as pit_set_frequency() does',
            'The PIT can be told a frequency directly, but only in BCD mode, not binary mode',
          ],
          answer: 1,
          explanations: [
            'This isn\'t a legacy compatibility choice layered on top of a more capable interface — the 8253/8254 chip\'s actual internal circuitry only implements counting down a divisor. There is no lower-level "Hz mode" being hidden.',
            'Exactly right. The PIT is, at the hardware level, a countdown circuit driven by a fixed clock — it has no built-in notion of Hertz whatsoever. Every "set the frequency" function you\'ll ever see for this chip, including this one, is software doing the base-clock-divided-by-divisor arithmetic and handing the hardware only the number it actually understands: the divisor.',
            'BCD versus binary mode (bit 0 of the command byte) only affects how the PIT interprets the divisor\'s digits internally — it has no bearing on whether frequency can be specified directly, which is never possible in either mode.',
          ],
        },
      ],
    },
    {
      id: 'putting-it-together',
      title: 'Four Modules, One Working Heartbeat',
      number: '03',
      color: '#fbbf24',
      blocks: [
        {
          type: 'text',
          content: `Trace what actually happens the instant pit_set_frequency(100) runs and interrupts are enabled: the PIT counts down its divisor at 1,193,182 Hz internally, and every time it reaches zero, it raises its output line — physically wired to IRQ0. Module B03's remapped PIC (which now sits between the PIT and the CPU) receives that signal and delivers it to the CPU as vector 0x20, exactly the vector Module B03's remap assigned to IRQ0. The CPU looks up vector 0x20 in the IDT (Module P05) and jumps to Module B04's isr32 stub — pusha, call the shared C handler, popa, iret — a hundred times every second, forever, with your C code never needing to know any of the hardware plumbing happened.`,
        },
        {
          type: 'connection-bridge',
          concept: 'Dividing a Fixed Clock to Reach an Arbitrary Rate',
          coreIdea: 'When hardware only provides one fixed, precise clock, generate any other useful rate by dividing that clock down with a chosen integer, accepting whatever rounding error results.',
          connections: [
            { icon: '🎵', domain: 'Digital audio sample rates', description: 'Audio hardware often derives multiple sample rates (44.1kHz, 48kHz, 96kHz) from one master clock crystal using divider circuits — the same base-clock-divided-by-N idea, which is also why some sample rate conversions introduce more error than others, depending on how evenly the divisor fits.' },
            { icon: '💡', domain: 'PWM frequency on microcontrollers', description: 'Generating a specific PWM (pulse-width modulation) frequency for controlling an LED\'s brightness or a motor\'s speed almost always means taking the microcontroller\'s fixed system clock and dividing it by a chosen prescaler value — conceptually identical to computing a PIT divisor.' },
            { icon: '⚙️', domain: 'CPU clock multipliers', description: 'A CPU\'s actual clock speed is traditionally the motherboard\'s base clock multiplied by a chosen ratio — the same relationship as this chapter\'s divisor, just inverted (multiplying instead of dividing) to go from a slower fixed reference to a faster target instead of a slower one.' },
          ],
          punchline: 'A precise, expensive oscillator is worth sharing across every subsystem that needs timing, by dividing (or multiplying) it to whatever specific rate each one actually needs. The PIT\'s divisor, an audio chip\'s sample-rate divider, and a CPU\'s clock multiplier are the same arithmetic relationship, solving the same underlying hardware-economics problem IBM faced in 1981.',
        },
        {
          type: 'what-this-means',
          text: 'Every scheduler tick, every setTimeout(), every animation frame on every computer with a PC-compatible heritage ultimately traces back through a chain like this one — a fixed hardware oscillator, divided down, raising an interrupt line, routed through a remapped PIC, delivered through an IDT, caught by a stub that makes it safe to reach C code. You just built every link in that chain yourself.',
        },
        {
          type: 'socratic',
          question: 'If Module B03\'s PIC remap had never been done, and you called pit_set_frequency(100) and enabled interrupts anyway, what would you actually expect to happen?',
          options: [
            'Nothing different — the PIT and the PIC are unrelated, so the timer would work exactly the same either way',
            'The timer would still physically tick, but IRQ0 would still map to vector 8 (Double Fault) instead of vector 0x20 — so every 100th-of-a-second tick would misfire your kernel into whatever code is installed at the Double Fault vector, not a timer handler',
            'The PIT would refuse to start counting down until the PIC was remapped first',
          ],
          answer: 1,
          explanations: [
            'The PIT and PIC are absolutely related here — the PIT\'s output is physically wired into the PIC\'s IRQ0 input, and the PIC decides which CPU vector that becomes. Skipping the remap changes what happens next, even though the PIT itself keeps ticking.',
            'Exactly right, and this is the exact collision Module P05 first warned about and Module B03 fixed. The PIT has no awareness of vector numbers at all — it just raises IRQ0. Without the remap, the PIC still faithfully translates that into vector 8, and the CPU still faithfully jumps to whatever your IDT has installed there. If that happens to be a Double Fault handler expecting a real CPU fault, it now runs 100 times a second for an entirely unrelated reason — a very confusing bug to trace without knowing this chapter\'s and Module B03\'s mechanism.',
            'The PIT has no dependency on the PIC\'s configuration at all — it counts down and raises its output line regardless of what, if anything, is listening on the other end.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: '1981: shared crystal', sublabel: 'The PIT\'s 1,193,182 Hz clock, borrowed from CGA\'s colorburst ÷ 3' },
      { label: 'Divisor, not frequency', sublabel: 'base ÷ divisor — the only rate the hardware understands' },
      { label: 'Command byte 0x36', sublabel: 'Channel 0, lobyte/hibyte, mode 3, binary' },
      { label: 'IRQ0 fires', sublabel: 'Physically wired from the PIT to the PIC' },
      { label: 'PIC → vector 0x20', sublabel: 'Module B03\'s remap, now doing real work' },
      { label: 'isr32 stub runs', sublabel: 'Module B04\'s pattern, firing for the first time, repeatedly' },
    ],
    finalInsight: 'Your kernel has a heartbeat now — a real, physical oscillator from 1981, divided down to a rate you chose, flowing through every mechanism the last four modules built, landing safely in C code a hundred times a second. Module 3\'s scheduler assumed this heartbeat existed. It does now, and you know exactly where every tick comes from.',
    nextChapter: 'Next: your kernel can react to timer ticks and remapped interrupts safely — but it still manages memory the way Module 2 simulated it: an array standing in for a real hardware structure. Module B06 replaces that simulation with the real thing: actual x86 paging, a page directory, and the exact bit layout the CPU itself reads on every memory access.',
  },
}

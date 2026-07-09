// b03_pic.js — Bring-Up 3: Taming the PIC
export const b03 = {
  id: 'B03',
  title: 'Taming the PIC',
  subtitle: 'Module P05 explained why IRQs collide with CPU exceptions. Here is the code that actually fixes it.',
  estimatedMinutes: 25,

  mystery: {
    type: 'mystery',
    lines: [
      'Right now, in your kernel, IRQ0 — the timer — and vector 8 — a CPU double-fault — point at the same number.',
      'If you enabled interrupts this instant, you could not tell a timer tick from a fatal CPU error.',
      'Module P05 told you this collision exists. It never showed you how to fix it.',
      'What three bytes, sent to two specific hardware ports, solve this permanently?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Fix That Became Universal',
      number: '01',
      color: '#10b981',
      blocks: [
        {
          type: 'history',
          content: `Module P05 already told you how this collision happened: IBM wired the original PC's interrupt controller to vectors 8-15 in 1981, and Intel reserved those exact vectors for CPU exceptions a few years later without knowing IBM had already claimed them. What P05 didn't tell you is what happened next.

Every OS vendor building for the PC hit this exact collision independently, and every one of them converged on the same fix: reprogram the interrupt controller to move hardware interrupts somewhere Intel would never reserve — starting at vector 0x20, immediately after Intel's reserved 0-31 range ends. This wasn't coordinated by a standards body. It became universal simply because it was the obvious fix and there was only one sensible place to move to. Every x86 OS you've ever used, including the one running whatever device is showing you this page, remaps its PIC to start at 0x20. You're about to write the exact same fix.`,
        },
      ],
    },
    {
      id: 'the-remap-sequence',
      title: 'Two Chips, Four Initialization Words',
      number: '02',
      color: '#10b981',
      blocks: [
        {
          type: 'text',
          content: `The original IBM PC doesn't have one interrupt controller — it has two 8259 PIC chips, **cascaded**: the master handles IRQ0-7 and talks directly to the CPU, while the slave handles IRQ8-15 and reports through one of the master's own input lines (conventionally IRQ2). Both chips need to be reprogrammed, not just one — a mistake that's easy to make since only the master's collision (vector 8) is what the mystery above calls out directly.

Each PIC is controlled through two I/O ports (Module B01's outb() and inb() — no new syntax needed for the rest of this chapter): a **command port** and a **data port**. The master sits at 0x20 (command) and 0x21 (data); the slave at 0xA0 (command) and 0xA1 (data). Reprogramming either chip means sending it a sequence of exactly four bytes, called **Initialization Command Words (ICW1-ICW4)**, in a fixed order:

**ICW1** (to the command port) — starts the initialization sequence and tells the chip to expect ICW4. **ICW2** (to the data port) — the new base vector number for this chip's interrupts (0x20 for the master, 0x28 for the slave). **ICW3** (to the data port) — cascade wiring information: the master is told which IRQ line the slave is attached to, and the slave is told its own identity on that line. **ICW4** — a mode flag telling the chip to operate in standard x86 mode.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'pic.c',
          caption: 'The complete PIC remap — four ICWs to each chip, using only outb() and inb() from Module B01',
          code: `#include <stdint.h>
#include "io.h"   // outb() / inb() from Module B01

#define PIC1_COMMAND 0x20
#define PIC1_DATA    0x21
#define PIC2_COMMAND 0xA0
#define PIC2_DATA    0xA1

#define ICW1_INIT    0x10
#define ICW1_ICW4    0x01
#define ICW4_8086    0x01

void pic_remap(int offset1, int offset2) {
    uint8_t mask1 = inb(PIC1_DATA);
    uint8_t mask2 = inb(PIC2_DATA);

    outb(PIC1_COMMAND, ICW1_INIT | ICW1_ICW4);
    outb(PIC2_COMMAND, ICW1_INIT | ICW1_ICW4);

    outb(PIC1_DATA, offset1);
    outb(PIC2_DATA, offset2);

    outb(PIC1_DATA, 4);
    outb(PIC2_DATA, 2);

    outb(PIC1_DATA, ICW4_8086);
    outb(PIC2_DATA, ICW4_8086);

    outb(PIC1_DATA, mask1);
    outb(PIC2_DATA, mask2);
}`,
          annotations: [
            {
              lines: [13, 14],
              label: 'uint8_t mask1 = inb(PIC1_DATA); uint8_t mask2 = inb(PIC2_DATA);',
              what: 'Reads and saves each PIC\'s current interrupt mask before touching anything else.',
              why: 'The data port doubles as the mask register once initialization is complete — but during initialization, it\'s reused to carry ICW2 through ICW4. Saving the existing masks first means whatever was already enabled or disabled stays that way after the remap, instead of being silently reset to whatever state the chip happens to power on with.',
              note: null,
            },
            {
              lines: [16, 17],
              label: 'outb(PIC1_COMMAND, ICW1_INIT | ICW1_ICW4);',
              what: 'Sends ICW1 to both chips\' command ports, starting the initialization sequence.',
              why: 'ICW1_INIT (0x10) is the bit that means "begin initialization" — every PIC on every PC checks for this exact bit. ICW1_ICW4 (0x01), OR-ed in using the exact bitmask-combining idiom from Module P01, tells the chip "expect a fourth initialization word (ICW4) later in this sequence" — without it, the chip would expect only three words and everything after would be misinterpreted.',
              note: null,
            },
            {
              lines: [19, 20],
              label: 'outb(PIC1_DATA, offset1); outb(PIC2_DATA, offset2);',
              what: 'Sends ICW2 — the new base vector — to each chip\'s data port.',
              why: 'This is the actual fix this chapter is about: whatever value offset1 is (Module B04 will call this with 0x20), IRQ0 through IRQ7 will now trigger vectors offset1 through offset1+7 instead of the colliding 8-15. The slave\'s offset2 (0x28) continues immediately where the master\'s range ends, so IRQ8-15 land on 0x28-0x2F — both ranges now sitting safely above Intel\'s reserved 0-31.',
              note: null,
            },
            {
              lines: [22, 23],
              label: 'outb(PIC1_DATA, 4); outb(PIC2_DATA, 2);',
              what: 'Sends ICW3 — cascade wiring — with different values to each chip.',
              why: 'The master and slave don\'t receive the same ICW3, because they\'re being told different things. 4 in binary is 00000100 — a bitmask (Module P01) with only bit 2 set, telling the master "the slave is physically wired to my IRQ line 2." The slave instead receives 2 — not a bitmask this time, just the plain number 2 — telling it "you are the device attached at IRQ2." Same word in the sequence, different meaning depending on which chip receives it.',
              note: 'This is the step most commonly gotten wrong or left out entirely when people first write this code, because unlike ICW1, ICW2, and ICW4, master and slave don\'t receive the same value — there\'s no obvious symmetry to copy from one line to the next.',
            },
            {
              lines: [25, 26],
              label: 'outb(PIC1_DATA, ICW4_8086); outb(PIC2_DATA, ICW4_8086);',
              what: 'Sends ICW4 — the final initialization word — identically to both chips.',
              why: 'ICW4_8086 (0x01) tells each chip to operate in 8086/88 mode rather than the older 8080-compatible mode the chip still technically supports for backward compatibility to systems built before the 8086 even existed. Every x86 OS sets this bit; the alternative mode is not used on any PC-compatible hardware.',
              note: null,
            },
            {
              lines: [28, 29],
              label: 'outb(PIC1_DATA, mask1); outb(PIC2_DATA, mask2);',
              what: 'Writes the saved masks back, now that initialization is complete and the data ports have returned to being mask registers.',
              why: 'This is the other half of the save at the top of the function. Without restoring the mask, both PICs would come out of initialization with an undefined or fully-open mask, potentially enabling interrupt lines nothing has set up handlers for yet — a real hazard once interrupts are turned back on.',
              note: null,
            },
          ],
        },
        {
          type: 'simulator',
          id: 'pic-remap-sim',
          caption: 'Toggle between the default and remapped vector layout, and see exactly where the collision was',
        },
        {
          type: 'socratic',
          question: 'The mystery at the top of this chapter only mentions IRQ0 colliding with vector 8. Why does pic_remap() still reprogram the slave PIC (IRQ8-15), which doesn\'t collide with Intel\'s reserved range in the same obvious way?',
          options: [
            'It doesn\'t need to — only the master PIC actually requires remapping',
            'On real IBM PC/AT hardware, IRQ8-15 default to vectors 0x70-0x77, which don\'t collide with Intel\'s 0-31 range either — but leaving them there instead of moving them to sit cleanly after the master\'s new range would leave the interrupt vector layout inconsistent and harder to reason about, and every real OS remaps both chips as a single coordinated unit',
            'The slave PIC does not support remapping at all, so this code has no effect on it'
          ],
          answer: 1,
          explanations: [
            'The most commonly cited collision is IRQ0/vector 8, but that\'s only the master. Both chips are genuinely reprogrammed in every real OS\'s PIC driver, including this one.',
            'Exactly right. IRQ8-15\'s default vectors (0x70-0x77) happen not to collide with CPU exceptions on their own, but remapping only the master while leaving the slave at its default would produce a fragmented, inconsistent vector layout — some hardware interrupts at 0x20+ and others still at 0x70+, for no real benefit. Every real-world PIC driver remaps both chips together, to the same contiguous range (0x20-0x2F), because there\'s no reason not to and it keeps the whole interrupt vector space easy to reason about.',
            'The 8259 fully supports remapping on both master and slave — that\'s the entire mechanism ICW2 provides, identically on either chip. Nothing in the hardware treats the slave differently here.',
          ],
        },
      ],
    },
    {
      id: 'connections',
      title: 'Remapping to Avoid a Reserved Range Is Everywhere',
      number: '03',
      color: '#059669',
      blocks: [
        {
          type: 'explicit-insight',
          text: 'The fix in this chapter is not "PIC-specific cleverness." It is the exact same move as Module P05\'s explanation of why syscalls and hardware interrupts both live above vector 32: reserve the low numbers for one authority (Intel), and require everyone else to operate above that line. You just implemented the actual bytes that make that boundary real in your own kernel.',
        },
        {
          type: 'connection-bridge',
          concept: 'Reserved Ranges to Prevent Identifier Collisions',
          coreIdea: 'When two independent parties might claim the same identifier, reserve a low range for one of them by convention or law, and require everyone else to start numbering above it.',
          connections: [
            { icon: '🖥️', domain: 'IOAPIC and interrupt remapping', description: 'Modern PCs replaced the two-chip 8259 PIC with the IOAPIC, which supports far more interrupt lines and flexible routing — but it still does fundamentally the same job this chapter\'s code does: mapping each hardware interrupt line to a chosen vector number, explicitly avoiding collisions.' },
            { icon: '🌐', domain: 'Reserved vs. ephemeral network ports', description: 'Ports 0-1023 are IANA-reserved "well-known" ports (80 for HTTP, 443 for HTTPS); anything your own program picks for an outgoing connection is assigned from a much higher range specifically so it can never collide with a well-known service. Different kind of "port" than Module B01\'s I/O ports, but the identical reserved-range pattern.' },
            { icon: '🗄️', domain: 'Sharded database ID ranges', description: 'Distributed databases often assign each shard or node a distinct range of primary key IDs to generate from, so two shards inserting rows simultaneously can never produce the same ID without needing to coordinate on every single insert.' },
          ],
          punchline: 'Intel reserved 0-31. IANA reserves 0-1023. A sharded database reserves a block per node. Every one of these is the same idea: draw a line, give one party everything below it, and require everyone else to operate above it. You didn\'t just fix a PIC — you implemented the general pattern, in the one place it happens to be a chip instead of a written specification.',
        },
        {
          type: 'what-this-means',
          text: 'Every interrupt that has fired while you\'ve been reading this course — every keystroke, every timer tick your own OS used to render this page smoothly — was routed through a PIC or IOAPIC that some kernel remapped exactly this way, the first few milliseconds after it booted.',
        },
        {
          type: 'socratic',
          question: 'Suppose you call pic_remap(0x20, 0x28), but a bug in your code accidentally skips the ICW3 step for both chips entirely (jumping straight from ICW2 to ICW4). Vector numbers would still be correctly moved to 0x20 and 0x28 — so what would you actually expect to go wrong?',
          options: [
            'Nothing — ICW3 only affects vector numbers, which are already set correctly by ICW2',
            'The master and slave would never be told about their cascade relationship, so interrupts arriving on the slave (IRQ8-15) would likely never correctly reach the CPU at all, even though the master\'s own interrupts (IRQ0-7) might work fine',
            'The chips would refuse to leave initialization mode, and no interrupts would work at all',
          ],
          answer: 1,
          explanations: [
            'ICW3 is not about vector numbers — that\'s entirely ICW2\'s job. ICW3 specifically establishes the physical cascade relationship between the two chips, which is a separate piece of configuration.',
            'Exactly right. ICW2 alone is enough to tell each chip which vector range to use, but the master and slave need ICW3 specifically to know how they\'re wired together — without it, the master doesn\'t know to listen for the slave\'s signal on its IRQ2 line, and the slave doesn\'t know its own cascade identity. The master\'s own IRQ0-7 lines don\'t depend on the cascade relationship at all, so they\'d likely still work — it\'s specifically the slave\'s IRQ8-15 lines, and only those, that would silently fail to reach the CPU.',
            'The 8259 does not have a hard failure mode like this — it will happily continue and leave initialization mode even with a malformed ICW3, running with whatever misconfigured cascade state resulted from the missing step. The failure here is silent, not a hang.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'Two 8259 chips, cascaded', sublabel: 'Master (IRQ0-7) reports directly; slave (IRQ8-15) reports through it' },
      { label: 'ICW1', sublabel: 'Begin initialization, expect ICW4' },
      { label: 'ICW2', sublabel: 'The new base vector — 0x20 and 0x28' },
      { label: 'ICW3', sublabel: 'Cascade wiring — different values to each chip' },
      { label: 'ICW4', sublabel: '8086 mode, identical on both chips' },
      { label: 'Masks restored', sublabel: 'Whatever was enabled before stays enabled after' },
    ],
    finalInsight: 'The collision Module P05 described as a historical accident is now fixed, permanently, in code you wrote and fully understand — four initialization words, sent to two chips, using nothing but the outb() and inb() functions from Module B01. Every hardware interrupt your kernel handles from this point forward arrives on a vector Intel never reserved for anything else.',
    nextChapter: 'Next: the PIC now delivers interrupts on safe vectors — but your IDT (Module P05) still only has C function addresses in it, and jumping the CPU directly into an ordinary C function the instant hardware fires is unsafe. Module B04 builds the actual assembly stub that stands between a raw hardware interrupt and your C handler.',
  },
}

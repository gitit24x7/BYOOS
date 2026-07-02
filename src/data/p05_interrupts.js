// p05_interrupts.js — Prerequisite 5: Interrupts and the IDT
export const p05 = {
  id: 'P05',
  title: 'Interrupts and the IDT',
  subtitle: 'A piece of hardware can stop your CPU mid-instruction, without asking. How is that allowed?',
  estimatedMinutes: 25,

  mystery: {
    type: 'mystery',
    lines: [
      'A timer chip on your motherboard fires a signal every few milliseconds.',
      'Your CPU stops whatever it is doing — between instructions — and jumps somewhere else entirely.',
      'No function call did this. Nothing in your code asked for it.',
      'What mechanism lets hardware interrupt a running program?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Bug That Explains Why IRQs Start at 32',
      number: '01',
      color: '#38bdf8',
      blocks: [
        {
          type: 'history',
          content: `It's 1981. IBM is building the original PC, and its hardware interrupt controller — the Intel 8259 PIC — defaults to signaling hardware events using interrupt vectors 8 through 15. Nobody thought twice about it at the time, because Intel hadn't reserved those numbers for anything yet.

Then Intel ships the 80286 and 80386, and reserves vectors 0 through 31 for CPU exceptions — divide-by-zero, invalid opcode, and so on — permanently. Vector 8 collided directly with IBM's keyboard IRQ mapping, meaning a keyboard interrupt could be silently misinterpreted as a CPU exception, or vice versa. Every PC-compatible OS since has had to explicitly remap the PIC's hardware interrupts up to vectors 32 and beyond, specifically to dodge a numbering collision from a decision made years before the conflicting numbers existed. You'll do exactly this remap yourself, and now you know why it's necessary instead of just being a checklist item.`,
        },
      ],
    },
    {
      id: 'idt-structure',
      title: 'The IDT: A Table of Handlers, Not Descriptors',
      number: '02',
      color: '#38bdf8',
      blocks: [
        {
          type: 'text',
          content: `The Interrupt Descriptor Table works structurally like Module P04's GDT — a fixed array in memory, loaded with its own dedicated instruction (lidt, the interrupt-table sibling of lgdt), pointed to by a hidden CPU register. But where a GDT entry describes a region of memory, an IDT entry — called a **gate** — describes something different: **which function to call when a specific interrupt number fires.**

Each gate packs together a handler address (split across the entry the same fragmented way the GDT split base addresses), a segment selector (almost always your kernel's code selector — the same 0x08 from Module P04's GDT), a Present bit, a Descriptor Privilege Level, and a gate type. The gate type matters more here than it did for the GDT: an **interrupt gate** automatically disables further interrupts the instant the CPU jumps into the handler (preventing a second interrupt from firing mid-handler and corrupting state), while a **trap gate** leaves interrupts enabled, typically used for exceptions where nested interrupts are less dangerous.

There are exactly 256 possible interrupt vectors, numbered 0 to 255. Intel permanently reserves 0 through 31 for CPU exceptions — vector 0 is divide-by-zero, vector 13 is general protection fault, vector 14 is page fault (the exact mechanism Module 2's virtual memory relies on to detect an invalid access). Vectors 32 and above are yours to assign: remapped hardware IRQs, and — as Module 4 already showed you — software-triggered interrupts like the classic int 0x80 syscall mechanism.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'idt.c',
          caption: 'An IDT gate as a packed struct, and installing one handler into the table',
          code: `#include <stdint.h>

struct idt_entry {
    uint16_t offset_low;    // handler address, bits 0-15
    uint16_t selector;      // GDT code selector (0x08 from Module P04)
    uint8_t  zero;          // always zero
    uint8_t  type_attr;     // gate type, present bit, DPL
    uint16_t offset_high;   // handler address, bits 16-31
} __attribute__((packed));

struct idt_entry idt[256];

void idt_set_gate(int vector, uint32_t handler, uint16_t selector, uint8_t type_attr) {
    idt[vector].offset_low  = handler & 0xFFFF;
    idt[vector].offset_high = (handler >> 16) & 0xFFFF;
    idt[vector].selector    = selector;
    idt[vector].zero        = 0;
    idt[vector].type_attr   = type_attr;
}

extern void timer_handler(void);   // defined in assembly, vector 32

void idt_init(void) {
    idt_set_gate(32, (uint32_t) timer_handler, 0x08, 0x8E);
    // 0x8E = present, ring 0, 32-bit interrupt gate
}`,
          annotations: [
            {
              lines: [3, 4, 5, 6, 7, 8, 9],
              label: 'struct idt_entry',
              what: 'A packed struct describing the exact byte layout of one IDT gate, matching what the CPU expects to find at each table entry.',
              why: 'This is the same technique from Module P02\'s freestanding-C chapter, applied to a new piece of hardware: define a struct whose layout matches real memory exactly, then read and write named fields instead of hand-rolling shifts and masks. The handler address is split into offset_low and offset_high for the same historical reason the GDT\'s base address was fragmented — the format was extended incrementally across CPU generations rather than redesigned from scratch.',
              note: null,
            },
            {
              lines: [11],
              label: 'struct idt_entry idt[256]',
              what: 'A statically-allocated array of exactly 256 gates — one for every possible interrupt vector.',
              why: 'This is Module P02\'s "no malloc yet, use a static array" pattern again — the IDT\'s size is fixed and known at compile time (always 256 entries, by CPU design), so a global array is not a workaround here, it\'s the correct, permanent representation.',
              note: null,
            },
            {
              lines: [13, 14, 15, 16, 17, 18],
              label: 'idt_set_gate(...)',
              what: 'Fills in one IDT entry: splits the handler\'s address into its two halves, and records the selector and type/attribute byte.',
              why: 'handler & 0xFFFF isolates the low 16 bits, and (handler >> 16) & 0xFFFF shifts the high bits down before masking them — the exact shift-and-mask idiom from Module P01\'s bitwise chapter, now splitting a function pointer instead of a boot signature.',
              note: null,
            },
            {
              lines: [23, 24, 25],
              label: 'idt_set_gate(32, (uint32_t) timer_handler, 0x08, 0x8E)',
              what: 'Installs timer_handler as the handler for interrupt vector 32 — the remapped timer IRQ from this chapter\'s history section.',
              why: '0x08 is the kernel code selector from Module P04\'s GDT — every interrupt handler runs with that selector loaded into CS, at ring 0, regardless of what ring the interrupted code was running at. 0x8E breaks down as: present=1, DPL=00 (ring 0 only — user code cannot trigger this vector directly), and a type field marking this specifically as a 32-bit interrupt gate rather than a trap gate.',
              note: 'Casting a C function pointer, timer_handler, into a plain uint32_t to split across offset_low/offset_high is exactly the kind of raw address manipulation Module P02 called out as normal in freestanding code, but would look deeply unusual in ordinary hosted C.',
            },
          ],
        },
        {
          type: 'socratic',
          question: 'An interrupt gate automatically disables further interrupts the moment the CPU jumps into its handler. Why does that specifically matter for a timer interrupt handler that itself calls into the scheduler?',
          options: [
            'It doesn\'t matter for timer interrupts specifically — this behavior only matters for exceptions like page faults',
            'Without it, a second timer interrupt could fire while the first one is still mid-context-switch, corrupting the very Process Control Block state Module 3\'s context switch depends on being consistent',
            'Interrupt gates only affect keyboard and mouse interrupts, not timer interrupts',
          ],
          answer: 1,
          explanations: [
            'This protection matters most exactly for cases like the timer handler — a handler that\'s doing multi-step, stateful work (like Module 3\'s context switch) is precisely the scenario where being interrupted mid-operation would be catastrophic.',
            'Exactly right. Picture the timer handler mid-way through Module 3\'s context switch — it has saved half of one process\'s registers into a PCB and hasn\'t finished loading the next one yet. If a second timer interrupt fired in that exact window, the handler would re-enter itself with the PCB in a half-updated, inconsistent state. The interrupt gate\'s automatic "disable interrupts on entry" is precisely what prevents that — the handler gets to finish its critical section undisturbed, every time.',
            'The interrupt-gate-vs-trap-gate distinction is a general property configurable per vector, applying identically to any interrupt source you assign it to — vector 32 for the timer, or any other vector for keyboard, syscalls, or anything else.',
          ],
        },
      ],
    },
    {
      id: 'interrupt-types',
      title: 'Three Flavors of Interrupt: Hardware, Software, and Exceptions',
      number: '03',
      color: '#818cf8',
      blocks: [
        {
          type: 'text',
          content: `Everything routed through the IDT falls into one of three categories, and it's worth being precise about which is which, because you've already met examples of each in earlier chapters without the label:

**Hardware interrupts** — triggered asynchronously by a physical device: the timer chip, the keyboard controller, a network card, a disk finishing a read. These can happen at literally any point between instructions, with no relationship to what your code is currently doing. Module 3's timer-driven preemptive scheduling depends entirely on this category.

**Software interrupts** — triggered deliberately, by an instruction in running code that explicitly asks for an interrupt to happen. The classic int 0x80 mechanism, and the modern syscall instruction, both from Module 4, are software interrupts: your own program's code is what causes the vector switch, on purpose, to ask the kernel for something.

**Exceptions** — triggered by the CPU itself, synchronously, in direct reaction to something the currently executing instruction did. Divide by zero. An invalid opcode. And critically: a **page fault** (vector 14) — the exact mechanism Module 2's virtual memory system depends on to detect that a program touched a virtual address with no valid physical mapping yet. A page fault isn't a separate concept from what you're learning here — it's this chapter's exact mechanism, with the CPU itself as the trigger instead of a device or a deliberate instruction.

All three funnel through the same IDT, the same gate structure, and the same push-frame / run-handler / iret sequence — the type only determines what triggers the vector switch, not what happens once it does.`,
        },
        {
          type: 'simulator',
          id: 'interrupt-trace-sim',
          caption: 'Trace a timer, keyboard, or syscall interrupt from trigger to resume — same mechanism, three different sources',
        },
        {
          type: 'explicit-insight',
          text: 'Hardware interrupts, software interrupts, and CPU exceptions are not three different mechanisms — they are three different triggers feeding into exactly one mechanism: look up a vector number in the IDT, save the interrupted state, run a handler at ring 0, restore the state, resume. A timer tick, a syscall instruction, and a page fault all end up in the same table, using the same gate structure, running through the same iret at the end. You already understood one of these three (syscalls, from Module 4) — you now understand the general mechanism all of them share.',
        },
        {
          type: 'connection-bridge',
          concept: 'Interrupt-Driven Execution',
          coreIdea: 'Instead of code constantly checking "did anything happen yet?" (polling), let the event itself actively signal the code that needs to react, the moment it occurs.',
          connections: [
            { icon: '🌐', domain: 'JavaScript event loop', description: 'A click handler, a fetch() callback, a setTimeout — none of these are "checked" by your code in a loop. The browser\'s event loop is notified when the event occurs and dispatches your callback, the same asynchronous-notification shape as a hardware interrupt, just implemented in software instead of silicon.' },
            { icon: '📡', domain: 'Unix signals', description: 'SIGINT (the signal sent when you press Ctrl+C), SIGSEGV, SIGKILL — the name "signal" is not a coincidence. Unix signals are the OS delivering an interrupt-like notification to a process, asynchronously, exactly mirroring how a hardware interrupt notifies the kernel.' },
            { icon: '💾', domain: 'DMA completion interrupts', description: 'When a disk or network card finishes a large data transfer via DMA (moving data directly into RAM without the CPU babysitting every byte), it signals completion with — precisely — a hardware interrupt, letting the CPU do other work during the transfer instead of polling "are we done yet?" in a loop.' },
            { icon: '🔔', domain: 'Webhooks / pub-sub systems', description: 'A webhook notifying your server the instant a payment completes, instead of your server polling a payment provider\'s API every few seconds, is the exact same architectural trade as interrupts versus polling — push a notification when something happens, instead of constantly asking.' },
          ],
          punchline: 'Interrupts exist to solve one universal problem: constantly asking "did anything happen yet?" wastes enormous amounts of time and energy compared to being notified the instant something does. Every event-driven system you have ever used — a browser, a signal handler, a webhook — made the same architectural choice the 8259 PIC made in 1981, just at a different layer of the stack.',
        },
        {
          type: 'what-this-means',
          text: 'Right now, while you are reading this sentence, your own keystrokes and mouse movements are being delivered to your operating system through exactly this mechanism — a hardware interrupt, an IDT lookup, a handler running at ring 0, an iret, and your browser resuming as if nothing happened. The timer interrupt from Module 3 has also fired roughly a thousand times since you started reading this paragraph. You have never noticed, because that is precisely the illusion this mechanism is built to maintain.',
        },
        {
          type: 'socratic',
          question: 'A page fault (vector 14) is triggered synchronously by the CPU itself, reacting to the instruction that just tried to execute — unlike a timer interrupt, which can happen at any arbitrary point unrelated to the current instruction. Why does that distinction matter for what a page fault handler is able to do that a timer handler generally isn\'t?',
          options: [
            'It doesn\'t matter — both handler types are equally restricted in what they can inspect',
            'Because a page fault is caused by the specific instruction that faulted, the handler can inspect exactly which instruction and which address triggered it (via CR2, a register the CPU sets specifically for this), fix the underlying problem, and then safely re-execute that exact instruction — something a timer handler, which fires at an arbitrary unrelated point, cannot meaningfully do',
            'Page faults cannot have handlers at all — they always immediately crash the program',
          ],
          answer: 1,
          explanations: [
            'The synchronous-vs-asynchronous distinction has a real, practical consequence for what the handler can do — treating them as equally restricted misses exactly the point this question is testing.',
            'Exactly right. Because a page fault is a direct, synchronous reaction to one specific instruction, the CPU can hand the handler precise context — including the faulting address, via the CR2 register — letting Module 2\'s virtual memory system map in the missing page and then simply resume execution at the exact instruction that faulted, as if the memory had been there all along. A timer interrupt has no such relationship to "the instruction that caused it," because nothing caused it except elapsed time — there is no equivalent fix-and-retry available.',
            'Page faults are exactly how Module 2\'s virtual memory system implements lazy page allocation and swapping — a handled, expected, and recoverable event, not an automatic crash. Crashing only happens when the handler determines the access was genuinely invalid, which is a decision the handler makes, not an automatic outcome.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'Event occurs', sublabel: 'Hardware device, software instruction, or CPU exception' },
      { label: 'Current instruction finishes', sublabel: 'Interrupts are never mid-instruction' },
      { label: 'IDT[vector] looked up', sublabel: '256 gates, 0-31 reserved by Intel, 32+ yours to assign' },
      { label: 'State pushed automatically', sublabel: 'Flags, CS, and RIP saved by the CPU itself' },
      { label: 'Handler runs at ring 0', sublabel: 'Same selector mechanism as Module P04\'s GDT' },
      { label: 'iret', sublabel: 'State restored, in one atomic step' },
      { label: 'Interrupted code resumes', sublabel: 'Unaware that anything happened at all' },
    ],
    finalInsight: 'One table, 256 entries, and one push/handle/iret sequence is the entire mechanism behind a timer preempting your scheduler, a keyboard interrupt delivering a keystroke, a syscall instruction crossing into the kernel, and a page fault triggering a lazy memory allocation. You have now seen the general case behind four things earlier modules described individually. There is no fifth mechanism waiting — everything privileged that "just happens" on a running computer happens through exactly this.',
    nextChapter: 'Next: you can build a GDT, switch into Protected Mode, and route interrupts through an IDT — the three pieces of infrastructure every real kernel needs before it can do anything else. Module P06 covers the last gap before you can actually produce a bootable kernel binary from your own source files: how a compiler and a linker turn separate .c files into one executable the hardware can actually load and run.',
  },
}

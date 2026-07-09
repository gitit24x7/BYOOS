// b01_port_io.js — Bring-Up 1: Talking to Hardware Through Ports
export const b01 = {
  id: 'B01',
  title: 'Talking to Hardware Through Ports',
  subtitle: 'Memory has its own address space. So does hardware. You have never touched it until now.',
  estimatedMinutes: 25,

  mystery: {
    type: 'mystery',
    lines: [
      'The VGA buffer you wrote to in Module P02 lived at a memory address — 0xB8000 — like any variable.',
      'The keyboard controller, the timer chip, and the interrupt controller do not work that way.',
      'They live in a completely separate address space your CPU has to reach with different instructions entirely.',
      'What is that other address space, and how do you actually talk to it?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'Why x86 Has Two Address Spaces Instead of One',
      number: '01',
      color: '#6ee7b7',
      blocks: [
        {
          type: 'history',
          content: `It's 1974. Intel is designing the 8080 processor, and memory is brutally expensive — every byte of address space feels precious. Engineers building hardware devices around this chip face a choice: let devices share the same address space as RAM (so reading a device looks exactly like reading a variable), or give devices their own, completely separate address space with its own dedicated instructions.

Intel chose the second option: a small, separate 256-address space, reachable only through two new instructions, IN and OUT, that never touch regular memory at all. When the 8086 arrived in 1978 (the chip Module 1's bootloader targets), Intel extended this separate space to 65,536 addresses — but kept the same fundamental split. Nearly fifty years later, the PC you're reading this on still has both: memory addresses for RAM and memory-mapped devices like your VGA buffer, and a completely separate set of addresses, called I/O ports, reachable only through IN and OUT. You've only used the first one so far.`,
        },
      ],
    },
    {
      id: 'the-io-space',
      title: 'Two Address Spaces, One CPU',
      number: '02',
      color: '#6ee7b7',
      blocks: [
        {
          type: 'text',
          content: `Module P02 wrote directly to address 0xB8000 using an ordinary pointer, because the VGA text buffer uses **memory-mapped I/O** — the video card's registers are wired to appear as if they were regular RAM addresses. Any instruction that reads or writes memory (mov, and everything built on it) works on them without any special handling.

**Port-mapped I/O** is a different mechanism entirely, not just a naming convention. The x86 CPU has a second, genuinely separate 16-bit address space — 65,536 addresses called **I/O ports** — that exists completely outside the memory address space P02 and Module 2 have been building on. Critically: **mov cannot reach this space at all.** No matter what address you compute, a mov instruction only ever touches RAM or memory-mapped devices. The only instructions that can read or write an I/O port are two dedicated ones: **in** and **out**.

This is why the timer chip, the keyboard controller, and the interrupt controller you'll meet over the next several modules can't just be read like a variable — they live at port addresses like 0x60 or 0x20, in a space your pointers can never accidentally wander into. Reaching them requires learning two new instructions, on purpose, for the first time in this course.`,
        },
        {
          type: 'callout',
          variant: 'warning',
          content: 'Watch out for a naming collision that trips up almost everyone the first time: an "I/O port" here has nothing to do with a network port (like port 80 or port 443). They are two completely unrelated concepts that happen to share the English word "port" — one is a CPU-level hardware address space from 1974, the other is a transport-layer addressing concept in networking. Nothing you learn in this chapter has anything to do with sockets or networking.',
        },
        {
          type: 'socratic',
          question: 'The keyboard controller lives at port 0x60. Suppose you write mov al, [0x60] in assembly, hoping to read the keyboard\'s data register. What actually happens?',
          options: [
            'It works, and reads whatever byte the keyboard controller has ready',
            'It reads whatever is stored at memory address 0x60 in RAM — completely unrelated to the keyboard, since mov cannot reach the I/O port address space at all',
            'It causes a CPU exception, because address 0x60 is reserved for hardware',
          ],
          answer: 1,
          explanations: [
            'mov has no way to know you "meant" the I/O space — it only ever operates on the memory address space, and 0x60 in memory is just wherever your program\'s data or the OS happens to have put something.',
            'Exactly right, and this is the entire point of this chapter. mov, and every instruction like it, only ever addresses the regular memory space. The keyboard controller is not "hiding" at memory address 0x60 — it lives at I/O port 0x60, a genuinely separate space that only in and out can reach. This instruction compiles and runs without error; it just silently does something completely unrelated to what you intended.',
            'There is no special protection here — 0x60 is simply treated as an ordinary, valid memory address, most likely pointing at whatever your program\'s own data happens to occupy. No exception fires, which is exactly what makes this mistake dangerous: it fails silently.',
          ],
        },
      ],
    },
    {
      id: 'the-instructions',
      title: 'in and out, and How to Call Them From C',
      number: '03',
      color: '#34d399',
      blocks: [
        {
          type: 'text',
          content: `The raw x86 instructions are almost suspiciously simple. **out dx, al** sends the byte in AL to the port number stored in DX. **in al, dx** reads a byte from the port number in DX into AL. That's the entire mechanism — no addressing modes, no complexity, just "send this byte to this port number" and "read a byte from this port number."

The catch: C has no built-in way to express "execute this exact CPU instruction." Neither in nor out corresponds to anything in the C language. To use them from C, you have to drop down to **inline assembly** — embedding raw assembly instructions directly inside a C function, using a GCC-specific syntax extension. You've seen tiny fragments of this before (Module 4's syscall example, Module P04's protected mode code), but this chapter is the first time you'll build and fully understand one from scratch, piece by piece.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'io.h',
          caption: 'The two functions every future Bring-Up module builds on — outb() and inb(), unpacked completely',
          code: `#include <stdint.h>

static inline void outb(uint16_t port, uint8_t value) {
    __asm__ volatile ("outb %0, %1"
                       :
                       : "a"(value), "Nd"(port));
}

static inline uint8_t inb(uint16_t port) {
    uint8_t result;
    __asm__ volatile ("inb %1, %0"
                       : "=a"(result)
                       : "Nd"(port));
    return result;
}`,
          annotations: [
            {
              lines: [3, 9],
              label: 'static inline void outb(...) / static inline uint8_t inb(...)',
              what: 'Declares outb and inb as static inline functions — ordinary-looking C functions that wrap the raw asm instructions.',
              why: 'static inline means two things at once: inline asks the compiler to paste this function\'s body directly into every call site instead of generating a real function call (so there\'s zero overhead — this compiles down to just the outb/inb instruction, nothing else). static means this function is private to whichever file includes this header, which avoids a "multiple definition" linker error (Module P06\'s linking chapter) if more than one .c file includes io.h.',
              note: 'This exact static inline pattern is how virtually every real OS kernel defines its port I/O helpers — you will not find a "real" outb() hiding somewhere in a library. You are writing the actual, standard implementation.',
            },
            {
              lines: [4, 10],
              label: '__asm__ volatile (...)',
              what: 'The GCC syntax for embedding raw assembly instructions inside a C function.',
              why: '__asm__ (also spelled asm — __asm__ is the version guaranteed to survive strict-mode compilation) tells the compiler "the following is not C, do not try to parse it as C." volatile is the critical second word: it tells the compiler this assembly has effects it cannot see or predict (in this case, talking to hardware), so it must never delete this block as a dead-looking no-op, reorder it relative to other volatile operations, or cache its result. Without volatile, an optimizing compiler could legally decide this instruction "does nothing observable" and remove it entirely.',
              note: null,
            },
            {
              lines: [4],
              label: '"outb %0, %1"',
              what: 'The assembly template string — the actual instruction to emit, with placeholders instead of concrete operands.',
              why: '%0 and %1 are not registers or values — they are placeholders, numbered in the order the operands are listed below (output operands are numbered first, then input operands, left to right). The compiler fills in %0 and %1 with whatever registers or values the constraint list further down assigns them. This indirection exists because you don\'t get to pick which physical register holds value or port — the compiler decides that, and the placeholders are how the template stays correct regardless of its choice.',
              note: 'outb %0, %1 uses AT&T syntax — source operand first, destination second — which is why it reads "outb value, port" even though the underlying instruction is "send value to port." This is the same operand-order convention used throughout this course\'s assembly listings since Module 1.',
            },
            {
              lines: [5, 6, 7],
              label: ': : "a"(value), "Nd"(port)',
              what: 'The two colon-separated sections after the template string: an empty output-operand list, then an input-operand list with two entries.',
              why: 'GCC\'s extended inline assembly syntax always has this shape: template-string : outputs : inputs : clobbers, with any section left blank if unused. outb() has no output section at all — the first colon is immediately followed by the second, leaving that list empty. The input list has two entries, each pairing a constraint string with a C expression: "a"(value) and "Nd"(port).',
              note: 'Every one of these colons matters positionally. Miscounting them — for example, accidentally putting an input where an output belongs — is one of the most common real mistakes when first writing inline assembly, and the compiler often won\'t catch it as an error; it will just generate wrong code.',
            },
            {
              lines: [6],
              label: '"a"(value)',
              what: 'A constraint string, "a", paired with the C variable value.',
              why: '"a" is a register constraint meaning "place this operand in the AL/AX/EAX register, matching the operand width" — here, an 8-bit value, so AL specifically. This is not arbitrary: the raw out instruction hard-requires its data operand to be in AL (for the byte form). The constraint is how you tell the compiler which exact register the assembly template is assuming, since %0 in the template doesn\'t say "AL" itself — the constraint does.',
              note: null,
            },
            {
              lines: [6],
              label: '"Nd"(port)',
              what: 'A two-character constraint, "Nd", paired with port.',
              why: '"d" means "place this in the DX register" — the register the out instruction expects to hold the port number for anything above port 255. "N" is an additional modifier meaning "if this value is a compile-time constant between 0 and 255, allow the compiler to encode it directly as an immediate byte in the instruction instead of loading it into DX first." Combined, "Nd" says: use an immediate if you can prove it fits in a byte at compile time, otherwise fall back to DX. This is a genuinely GCC-specific piece of syntax with no equivalent in ordinary C — there is no way to discover what "N" means except being told, which is exactly why it\'s spelled out here instead of left for you to guess.',
              note: null,
            },
            {
              lines: [11],
              label: 'uint8_t result;',
              what: 'A plain, uninitialized local variable that will hold whatever inb() reads.',
              why: 'This variable doesn\'t get its value from a normal C assignment — it gets it from the inline assembly block below, via the output constraint. Declaring it here just reserves the storage; the "=a" constraint on the next line is what actually connects it to the AL register\'s value after the instruction runs.',
              note: null,
            },
            {
              lines: [12, 13],
              label: ': "=a"(result)',
              what: 'The output-operand list for inb() — a single entry, "=a"(result).',
              why: 'The leading = is not optional decoration — it specifically means "this is a write-only output: the assembly block sets this value, and any value result held beforehand is irrelevant and can be discarded." Without the =, the constraint "a" alone would mean "this operand\'s current value is already in AL," which is backwards for a value you\'re about to receive. "=a" paired with result tells the compiler: after this instruction executes, copy whatever ends up in AL into the C variable result.',
              note: 'The rule in general: a bare register constraint like "a" describes an input (or an in-out value), while "=a" describes a pure output. This distinction — the presence or absence of that leading equals sign — is the single most common source of silently wrong inline assembly when people first write it, because both forms compile without any error.',
            },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'outb() and inb() are not library functions someone wrote for you to import — you just built the actual, standard way every real OS kernel touches port-mapped hardware, and you can now read every constraint string in it instead of copy-pasting it on faith. Every module from here through the rest of the Bring-Up track — the PIC, the PIT, the keyboard — is going to call exactly these two functions, over and over, and you will never need this level of explanation again, because the syntax itself is no longer new.',
        },
        {
          type: 'socratic',
          question: 'If you accidentally wrote "a"(port) instead of "=a"(result) as the output constraint for inb(), what would actually go wrong?',
          options: [
            'Nothing — "a" and "=a" behave identically for output operands',
            'The compiler would treat it as an input, not an output — meaning it would try to read port\'s current value into AL before the instruction runs, and never actually copy AL\'s result back into any C variable afterward',
            'It would fail to compile, since GCC requires the = symbol for every constraint'
          ],
          answer: 1,
          explanations: [
            'The leading = is exactly what distinguishes "this operand receives a value" from "this operand supplies one" — dropping it changes the meaning, not just the notation.',
            'Exactly right. Without the =, "a" describes an input constraint, so the compiler would treat that operand as something it needs to load into AL beforehand, not something it should read out afterward — and since it\'s no longer in the output position at all, the actual byte the CPU read from the port would simply be discarded, with result left completely unset. This compiles cleanly and produces a real, silent bug.',
            'GCC extended assembly happily accepts bare register constraints like "a" without an equals sign — that\'s the normal, valid way to write an input operand. There is no blanket requirement forcing every constraint to include =.',
          ],
        },
      ],
    },
    {
      id: 'why-two-spaces-remain',
      title: 'Why the Old Space Never Went Away',
      number: '04',
      color: '#10b981',
      blocks: [
        {
          type: 'text',
          content: `You might reasonably ask: if memory-mapped I/O (Module P02's approach) works fine and doesn't need special instructions, why does port I/O still exist on every x86 chip built since 1978? The honest answer, familiar by now from this course's recurring theme: **backward compatibility.** The original IBM PC wired its keyboard controller, timer, and interrupt controller to specific I/O ports in 1981, software was written against those exact port numbers, and every PC-compatible machine since has kept them working. Rewiring these devices to be memory-mapped instead would break decades of existing software for no real benefit.

Not every architecture made the same choice. ARM and RISC-V, among others, use memory-mapped I/O exclusively — they have no equivalent of in and out at all, and every hardware register a program touches looks like an ordinary memory address. x86 is somewhat unusual in keeping both mechanisms alive side by side, decades after the constraint (extremely scarce memory) that originally motivated the split has disappeared.`,
        },
        {
          type: 'connection-bridge',
          concept: 'Two Separate Address Spaces for Two Kinds of Resources',
          coreIdea: 'Give one category of resource its own dedicated addressing mechanism, separate from general-purpose memory, so the two can never be confused or accidentally overlap.',
          connections: [
            { icon: '🏛️', domain: 'x86 PCI configuration space', description: 'x86 has a third address space beyond regular memory and I/O ports: PCI configuration space, reached through yet another dedicated mechanism (ports 0xCF8/0xCFC acting as an index/data pair). The same "give this category of resource its own space" pattern shows up more than once even within x86 itself.' },
            { icon: '💾', domain: 'ARM and RISC-V memory-mapped I/O', description: 'These architectures deliberately chose the opposite design: no separate I/O instructions at all, ever. Every hardware register is just a memory address, accessed with the exact same load/store instructions as RAM. Neither design is "more correct" — they\'re different answers to the same tradeoff Intel faced in 1974.' },
            { icon: '🔌', domain: 'USB endpoint addressing', description: 'A USB device exposes numbered "endpoints" that are a separate addressing concept from anything in your computer\'s memory or I/O space — the host controller driver has to translate between USB\'s own addressing scheme and whatever mechanism (often memory-mapped registers on the host controller itself) the CPU actually uses to talk to it.' },
          ],
          punchline: 'Keeping hardware addressing separate from general memory addressing is not an x86 quirk — it is one recurring answer to a general problem: some resources are dangerous or unusual enough that you want them impossible to reach by accident. x86 solved it in 1974 with a second address space. Other systems solve the same underlying problem differently, but the problem — how do you keep "normal" addressing and "special" addressing from colliding — recurs everywhere.',
        },
        {
          type: 'what-this-means',
          text: 'Every module from here forward in the Bring-Up track — the PIC in Module B03, the PIT in Module B05, the keyboard controller in Module B09 — will start by looking up a port number and calling outb() or inb() on it, exactly as you built them in this chapter. You will not need this explained again. This was the one time the syntax itself was the lesson.',
        },
        {
          type: 'socratic',
          question: 'The next module (B03) will remap the PIC by sending specific byte sequences to ports 0x20, 0x21, 0xA0, and 0xA1. Given everything in this chapter, what is the one thing you now know for certain about how that code will be written?',
          options: [
            'It will use mov instructions directly on those addresses, since by then the PIC will be memory-mapped',
            'It will be built entirely out of calls to outb() and inb() from this chapter, since the PIC is a port-mapped device and those are the only two instructions capable of reaching it',
            'It will require a new, different inline assembly pattern, since the PIC has more complex behavior than a single byte read or write',
          ],
          answer: 1,
          explanations: [
            'The PIC has always been, and remains, a port-mapped device — nothing changes that in a later module. mov still cannot reach it, for the same reason established in this chapter.',
            'Exactly right, and this is the entire payoff of building outb() and inb() as reusable, static inline functions instead of one-off inline assembly blocks. Remapping the PIC is just a specific sequence of bytes sent to specific ports, in a specific order — every single step will be a call to outb() or inb(), with zero new inline assembly syntax required. The hard part of this chapter was the syntax; from here on, it\'s just knowing which bytes go to which ports, in which order.',
            'The PIC does need a specific sequence of several writes and reads in the right order, but each individual step is still just one byte to one port — exactly what outb() and inb() already do. No new assembly pattern is needed; only knowledge of the sequence itself.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: '1974: the 8080', sublabel: 'Intel gives hardware its own address space' },
      { label: '1978: the 8086', sublabel: 'The space grows to 65,536 ports — still true today' },
      { label: 'Two address spaces', sublabel: 'Memory (mov reaches it) vs. I/O ports (only in/out reach it)' },
      { label: '__asm__ volatile', sublabel: 'Embedding raw instructions inside C, safely' },
      { label: 'Constraint strings', sublabel: '"a", "=a", "Nd" — naming exactly which register, and how' },
      { label: 'outb() / inb()', sublabel: 'The two functions every future hardware module builds on' },
    ],
    finalInsight: 'You now have the one piece of syntax every remaining Bring-Up module assumes you already know: how to reach the 65,536 addresses mov can never touch. Nothing about inline assembly is mysterious anymore — you know what every colon separates, what a leading equals sign means, and why "Nd" is spelled that way. The next nine modules will use this constantly and explain it zero more times, because you already understand it completely.',
    nextChapter: 'Next: your kernel can talk to any single hardware port, but it still can\'t boot as a real, standalone kernel — right now it only exists as code Module 1\'s tiny bootloader would have no way to load. Module B02 builds the Multiboot header: the exact signature GRUB checks for before it will trust your kernel enough to load it at all.',
  },
}

// p02_freestanding_c.js — Prerequisite 2: C Without Training Wheels
export const p02 = {
  id: 'P02',
  title: 'C Without Training Wheels',
  subtitle: 'No malloc. No printf. No standard library. Is it still C?',
  estimatedMinutes: 30,

  mystery: {
    type: 'mystery',
    lines: [
      'Every C program you have ever written had a heap, a runtime,',
      'and a printf() that just worked.',
      'Your kernel will have none of those things —',
      'because your kernel is what has to build them.',
      'What is left of C when you take all of that away?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Language Built to Replace Assembly',
      number: '01',
      color: '#22d3ee',
      blocks: [
        {
          type: 'history',
          content: `It's 1972. Dennis Ritchie at Bell Labs is rewriting UNIX, which was originally hand-written in PDP-11 assembly — a language so tied to one specific chip that the OS couldn't run anywhere else. Assembly gave total control over the hardware, but every line was chip-specific and nothing was reusable.

Ritchie designs C to solve exactly that problem: give programmers assembly-level control — raw pointers, direct memory access, no hidden runtime — while staying portable across different processors. He deliberately leaves out anything that would require a "safety net" running underneath the program: no automatic memory management, no bounds checking, no garbage collector. The tradeoff is explicit — C trusts you completely, and gives you nothing you didn't ask for. That tradeoff is exactly why, fifty years later, C is still the language almost every operating system kernel on Earth is written in.`,
        },
      ],
    },
    {
      id: 'hosted-vs-freestanding',
      title: 'Two Different Languages Named "C"',
      number: '02',
      color: '#22d3ee',
      blocks: [
        {
          type: 'text',
          content: `Here's something most C tutorials never mention: the C standard actually defines **two separate environments**, and you have only ever used one of them.

**Hosted C** is the C you already know. It assumes an operating system is underneath your program: a runtime that sets up the stack before main() runs, a heap that malloc() can request memory from, a filesystem and console that printf() and fopen() can write to. When your program returns from main(), that runtime hands control back to the OS. All of this infrastructure is invisible because it's already there, provided by the OS your program runs on top of.

**Freestanding C** assumes none of that. The C standard says a freestanding implementation only has to provide the core language — types, control flow, pointers, structs — plus a tiny handful of headers like stddef.h and stdint.h. No guaranteed heap. No guaranteed I/O. No guaranteed runtime setup before your code starts. There is nothing underneath a freestanding program, because your kernel **is** the thing that's supposed to go underneath everything else.

You compile freestanding C with special flags — **-ffreestanding -nostdlib** — that tell gcc "don't assume any of the hosted environment exists, and don't link in the C runtime startup code." The language syntax doesn't change. What changes is that every convenience you've relied on for years quietly disappears, and you have to decide whether to rebuild it yourself.`,
        },
        {
          type: 'callout',
          variant: 'insight',
          content: 'This is why "just #include <stdio.h> and call printf() in your kernel" doesn\'t work, even though it compiles. printf() is a hosted-C function — internally, it eventually calls write(), which is a system call that asks the kernel to do something. But you ARE the kernel. There is no lower layer to ask. Calling printf() from freestanding code either fails to link (no libc available) or, worse, silently links against your regular OS\'s libc and tries to make a system call to an OS that isn\'t running — which crashes immediately.',
        },
        {
          type: 'socratic',
          question: 'A freestanding C environment is not a smaller version of the C language — the syntax is identical. What actually disappears when you compile with -ffreestanding -nostdlib?',
          options: [
            'Pointers, structs, and loops stop working, since those require the standard library',
            'The guarantee that any standard library function (malloc, printf, fopen, etc.) exists or does anything meaningful — the language itself is untouched',
            'The compiler stops producing real machine code and instead produces bytecode',
          ],
          answer: 1,
          explanations: [
            'Pointers, structs, loops, and every other core language feature are part of the C language itself, not the standard library — freestanding mode leaves all of that completely intact. If this weren\'t true, you couldn\'t write a kernel in C at all.',
            'Exactly right. -ffreestanding tells the compiler "don\'t assume a hosted environment exists," and -nostdlib tells the linker "don\'t link against libc or the normal C runtime startup." The language — types, pointers, structs, control flow — is exactly the same C you already know. What\'s gone is the assumption that a whole library of pre-written functions is sitting there ready to be called.',
            'The output is still native machine code for your target CPU, identical in kind to hosted C — nothing about freestanding mode changes what the compiler emits, only what it\'s allowed to assume exists at runtime.',
          ],
        },
      ],
    },
    {
      id: 'pointers-deep',
      title: 'Pointers: How You Talk to Fixed Hardware Addresses',
      number: '03',
      color: '#0ea5e9',
      blocks: [
        {
          type: 'text',
          content: `You've used pointers before, probably as "the thing that's annoying about C." In freestanding code, pointers stop being an annoyance and become the *only* way you have to reach specific, fixed hardware locations — because there's no OS underneath you to provide friendlier abstractions like files or device drivers yet.

Here's the one fact that makes everything else make sense: **a pointer is just a number that happens to mean "a memory address."** Declaring int* p doesn't store an int — it stores an address where an int lives. Writing *p means "go to that address and read (or write) what's there." Nothing more mysterious than that.

Some hardware on a PC lives at a **fixed, well-known memory address** — no lookup required, no driver needed, no permission asked. The classic example, and the first thing most freestanding kernels ever do: the VGA text-mode video buffer lives at physical address **0xB8000**. Every character currently on your screen (in text mode) is stored as 2 bytes at that address and the ones after it: one byte for the ASCII character, one byte for its color. Write to that address directly, and text appears on screen — with no OS, no driver, and no printf() involved at all.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'vga_hello.c',
          caption: 'Printing "Hello" with zero library functions — just a pointer to a fixed hardware address',
          code: `#include <stdint.h>

#define VGA_BUFFER   ((volatile uint16_t*) 0xB8000)
#define VGA_WHITE    0x0F   // white text on black background

void kernel_main(void) {
    const char* msg = "Hello, freestanding world!";
    volatile uint16_t* vga = VGA_BUFFER;

    for (int i = 0; msg[i] != '\\0'; i++) {
        vga[i] = ((uint16_t) VGA_WHITE << 8) | (uint16_t) msg[i];
    }

    while (1) { }   // nothing to return to — halt here forever
}`,
          annotations: [
            {
              lines: [3],
              label: '((volatile uint16_t*) 0xB8000)',
              what: 'Casts the raw number 0xB8000 into a pointer to a 16-bit value, and marks it volatile.',
              why: 'Normally you get a pointer by taking the address of a variable with &. Here there is no variable — the "variable" is the video card\'s memory-mapped hardware, at a fixed address the PC platform has guaranteed since the original IBM PC. Casting an integer literal directly to a pointer is exactly how freestanding code reaches hardware that has no C variable behind it.',
              note: 'volatile tells the compiler "do not optimize away or cache reads/writes to this address — assume its value can change for reasons outside this code, and every read/write in the source must actually happen in the compiled output." Without it, an optimizing compiler could decide your writes to VGA memory look "redundant" and skip them, since as far as it can tell, nothing ever reads that memory back.',
            },
            {
              lines: [7],
              label: 'const char* msg = "Hello, freestanding world!"',
              what: 'A pointer to the first character of a string literal, stored directly in the compiled binary.',
              why: 'String literals still work in freestanding C — they\'re just bytes baked into your compiled binary at compile time, requiring no runtime, no heap, no OS. msg points at the "H", and each subsequent byte is the next character, ending in an implicit \\0 the compiler adds automatically — the same null-terminator convention from Module 1\'s bootloader.',
              note: null,
            },
            {
              lines: [9, 10, 11],
              label: 'vga[i] = ((uint16_t) VGA_WHITE << 8) | (uint16_t) msg[i]',
              what: 'Writes one character cell — combining the color byte and the character byte into a single 16-bit write.',
              why: 'Each VGA text cell is 2 bytes: the low byte is the ASCII character, the high byte is its color attribute. Shifting VGA_WHITE left by 8 moves it into the high byte, then OR-ing in msg[i] fills the low byte — the exact shift-then-OR pattern from Module P01\'s bitwise chapter, now applied to real hardware instead of a toy example.',
              note: 'vga[i] uses pointer indexing, which is identical to *(vga + i) — but the + i is automatically scaled by sizeof(uint16_t) (2 bytes), so vga[1] correctly points at the second character cell, not the second byte. This scaling is what "pointer arithmetic" actually means in C.',
            },
            {
              lines: [14],
              label: 'while (1) { }',
              what: 'An infinite loop that never exits.',
              why: 'This is the exact same idea as the hang: jmp hang loop from Module 1\'s bootloader, at a higher level. kernel_main() has nowhere to "return" to — there is no caller, no OS, no shell waiting for an exit code. If execution fell off the end of this function, the CPU would start executing whatever bytes happen to sit in memory next. Halting deliberately is the only safe option.',
              note: null,
            },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'You just wrote a program that prints text to the screen using zero library functions — no printf, no puts, no OS. All it took was knowing one fixed memory address and the exact byte layout the hardware expects there. This is the pattern behind everything a freestanding kernel does: find the fixed address, know the byte layout, read or write it directly through a pointer. Every "driver" you will ever write is a more elaborate version of exactly this.',
        },
        {
          type: 'socratic',
          question: 'If you removed the volatile keyword from VGA_BUFFER\'s type, the code would still compile and might even still work when you test it. Why is it still a serious bug?',
          options: [
            'It isn\'t actually a bug — volatile is just a style convention with no real effect',
            'Without volatile, an optimizing compiler is allowed to assume nothing outside your code ever reads that memory, and may reorder, cache, or even delete writes it decides look redundant — it happens to work at low optimization levels but can silently break at higher ones',
            'volatile only matters for multi-threaded code, and a single-threaded kernel never needs it',
          ],
          answer: 1,
          explanations: [
            'volatile has a very real effect on what the compiler is allowed to do — the fact that unoptimized test builds "happen to work" is exactly what makes skipping it dangerous. It\'s a silent, optimization-level-dependent bug.',
            'Exactly right. A compiler\'s optimizer assumes memory it writes to and never reads back from (from its point of view) doesn\'t need every write to actually happen — so two writes to the "same" address in a row might get collapsed into just the last one. For a normal variable, that\'s a safe optimization. For a hardware address, it\'s catastrophic: the video card, or later a device register, genuinely needs every individual write. volatile is the one keyword that tells the compiler "this address has effects you can\'t see — stop optimizing around it."',
            'volatile matters for any memory that can change or needs to change outside the compiler\'s visibility — hardware is the single most common reason, entirely independent of threading. A single-threaded kernel talking to hardware needs volatile just as much as multi-threaded code needs it for shared memory.',
          ],
        },
      ],
    },
    {
      id: 'structs-and-no-stdlib',
      title: 'Structs Are Memory Layouts You Named — and Building What malloc() Used to Give You',
      number: '04',
      color: '#38bdf8',
      blocks: [
        {
          type: 'text',
          content: `A struct in hosted C feels like a convenient container. In freestanding C, a struct is something more literal: **a named description of exactly how bytes are laid out in memory, in order.**

Take a struct named vga_char with two single-byte fields, character and color, declared in that order. This struct describes exactly the 2-byte layout you wrote by hand in the code above — character in the low byte, color in the high byte. Once you have this struct, you can cast a raw pointer to it and read or write named fields instead of hand-rolling shifts and masks every time. This isn't a coincidence or a convenience feature: **struct layout in C is defined to match memory layout**, field by field, in declaration order (compilers may insert padding bytes between fields for alignment, which is why kernel code that maps a struct directly onto hardware often adds the packed attribute to forbid that padding). This is exactly how you will later read GDT entries, IDT entries, and page table entries — not through library functions, but by defining a struct that matches the hardware's byte layout and pointing it at the right address.

Now, the other half of "no training wheels": **there is no malloc() yet, either.** malloc() is a hosted-C function — internally, real implementations ask the *kernel's own* memory manager for pages via a system call. But your freestanding code has no OS underneath it to ask. So what do you do when you need memory?

The honest early answer: **you don't dynamically allocate at all.** You declare fixed-size global arrays and structs at compile time — a "static allocation" — and use those. It's restrictive, but it's exactly what every kernel does in its earliest bring-up code, before it has built its own memory manager (which is Module 2's entire subject). Writing your own allocator is something you *build*, later, using the exact tools in this chapter — not something you get for free.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'kernel_string.c',
          caption: 'Two functions every kernel writes for itself, because the standard library isn\'t there to provide them',
          code: `#include <stddef.h>
#include <stdint.h>

// A minimal replacement for memset() — the standard library's version
// does not exist yet, so we write our own.
void* k_memset(void* dest, int value, size_t count) {
    uint8_t* d = (uint8_t*) dest;
    for (size_t i = 0; i < count; i++) {
        d[i] = (uint8_t) value;
    }
    return dest;
}

// A minimal replacement for strlen() — same reasoning.
size_t k_strlen(const char* str) {
    size_t len = 0;
    while (str[len] != '\\0') {
        len++;
    }
    return len;
}

struct vga_char {
    uint8_t character;
    uint8_t color;
} __attribute__((packed));

void k_print(const char* msg) {
    struct vga_char* vga = (struct vga_char*) 0xB8000;
    size_t len = k_strlen(msg);
    for (size_t i = 0; i < len; i++) {
        vga[i].character = msg[i];
        vga[i].color = 0x0F;
    }
}`,
          annotations: [
            {
              lines: [6, 7, 8, 9, 10, 11],
              label: 'void* k_memset(void* dest, int value, size_t count)',
              what: 'Fills count bytes starting at dest with value — a from-scratch replacement for the standard library\'s memset().',
              why: 'The compiler itself sometimes generates hidden calls to memset() for things like zero-initializing a large struct — even in freestanding mode. If no memset() exists to link against, the build fails. Kernels almost universally implement their own tiny versions of a handful of these "compiler-expected" functions (memset, memcpy, memmove, memcmp) very early, precisely so nothing is missing when the compiler silently reaches for them.',
              note: 'The k_ prefix is a convention, not a requirement — it exists specifically so this function is never confused with (or accidentally conflicts with) the real memset() from a hosted environment, in case any hosted code or headers ever get mixed in by mistake.',
            },
            {
              lines: [22, 23, 24, 25],
              label: 'struct vga_char { ... } __attribute__((packed))',
              what: 'Defines the exact 2-byte memory layout of one VGA character cell, and forbids the compiler from inserting padding between the two fields.',
              why: 'Without __attribute__((packed)), the compiler is technically free to insert padding bytes between struct fields for alignment reasons, which would silently break the byte-for-byte match to the VGA hardware\'s actual layout. packed is the explicit instruction: "lay this out exactly as written, with no compiler-added gaps," which is mandatory any time a struct is meant to overlay real hardware memory instead of just holding your own program\'s data.',
              note: 'For two single-byte fields like this, padding wasn\'t actually going to happen anyway — but for structs mixing field sizes (a uint8_t next to a uint32_t, for example), padding is common and packed becomes essential. It\'s good practice to be explicit here regardless.',
            },
            {
              lines: [27, 28, 29, 30, 31, 32],
              label: 'void k_print(const char* msg)',
              what: 'Writes an entire string to the VGA buffer using the named struct fields instead of hand-written shifts and masks.',
              why: 'Compare this to the shift-and-OR version from the previous section — same underlying memory, same effect, but vga[i].character = msg[i] reads far more clearly than reconstructing a 16-bit value by hand every time. This is the entire value of mapping a struct onto hardware: you pay the layout precision once, in the struct definition, and every use afterward reads like ordinary C.',
              note: null,
            },
          ],
        },
        {
          type: 'connection-bridge',
          concept: 'Freestanding Execution — No Runtime Underneath You',
          coreIdea: 'Some environments deliberately provide none of the conveniences a "normal" program assumes exist, forcing code to either do without them or rebuild them from scratch.',
          connections: [
            { icon: '🦀', domain: 'Rust\'s #![no_std]', description: 'Rust has the exact same split as C, with the exact same name for the concept: a #![no_std] Rust program has no heap allocator, no standard collections, and no OS assumptions by default — used for embedded devices and, not coincidentally, for writing OS kernels in Rust.' },
            { icon: '🕸️', domain: 'WebAssembly modules', description: 'A raw WASM module has no console.log, no filesystem, no network — only what the host application explicitly imports into it. A WASM module with zero imports is freestanding in exactly the same sense your kernel.c is: it can compute, but it cannot talk to anything outside itself unless something provides that bridge.' },
            { icon: '🔌', domain: 'Arduino / embedded firmware', description: 'Firmware for a microcontroller runs on bare hardware with no OS underneath, the same way your kernel does. It reads and writes fixed hardware register addresses directly through pointers — often literally the same digitalWrite()-style pattern as this chapter\'s VGA example, just targeting a different fixed address.' },
            { icon: '🔒', domain: 'Sandboxed iframes', description: 'A cross-origin iframe with a strict sandbox attribute cannot touch the parent page\'s DOM, cookies, or storage by default — it runs "freestanding" relative to the rest of the page, and has to be deliberately granted capabilities the same way your kernel has to deliberately build its own I/O instead of assuming it.' },
          ],
          punchline: 'The distinction between "code with a runtime underneath it" and "code that IS the runtime" is not unique to operating systems. Rust chose to name it explicitly (#![no_std]) because it\'s exactly the same tradeoff you just made in C: give up the conveniences, keep the control, and build back only what you actually need.',
        },
        {
          type: 'what-this-means',
          text: 'Every time you have called malloc(), printf(), or strlen() in any C program before today, you were relying on thousands of lines of OS and library code you never had to think about. From here forward in this course, you are one layer below all of that — which means when Module 2 introduces virtual memory and a real heap allocator, you will understand exactly what problem it is solving, because you just felt the absence of that solution firsthand.',
        },
        {
          type: 'socratic',
          question: 'Your kernel needs to store a growing list of running processes, but there is no malloc() yet — only static global arrays. What is the actual tradeoff of using a fixed-size static array like struct pcb process_table[64] instead of dynamic allocation?',
          options: [
            'There is no real tradeoff — static arrays are strictly better and dynamic allocation was never necessary in the first place',
            'You trade flexibility (a hard cap of 64 processes, decided at compile time) for simplicity and zero dependency on a memory manager that does not exist yet — an acceptable, temporary limitation until Module 2 builds a real allocator',
            'Static arrays cannot be indexed with variables, so you would need 64 separately named variables instead',
          ],
          answer: 1,
          explanations: [
            'Dynamic allocation exists because fixed limits are a real cost — a hardcoded cap of 64 processes is a genuine constraint, not a non-issue. The question is whether that constraint is acceptable at this stage, not whether it exists.',
            'Exactly right. This is the honest tradeoff every early kernel makes: process_table[64] is simple, requires no allocator, and works today — at the cost of an arbitrary hard limit that a real OS can\'t ship with forever. That\'s precisely why Module 2 exists: virtual memory and a real allocator are what let you replace this fixed array with something that grows. The static array isn\'t a mistake — it\'s a deliberate, temporary simplification.',
            'Static arrays are indexed with a variable exactly like any other array — process_table[i] works fine with a runtime-computed i. The limitation is the fixed total size (64), decided once at compile time, not how you access individual elements.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'Hosted C', sublabel: 'The C you already know — OS, libc, and a runtime underneath it' },
      { label: 'Freestanding C', sublabel: 'Same language, none of the assumptions' },
      { label: 'Pointers to fixed addresses', sublabel: 'Reaching hardware with no driver in between' },
      { label: 'Structs as byte layouts', sublabel: 'Named fields matching real memory, exactly' },
      { label: 'Rebuilding what libc gave you', sublabel: 'k_memset, k_strlen, k_print — by hand' },
      { label: 'A working kernel print function', sublabel: 'Text on screen, zero library calls' },
    ],
    finalInsight: 'You now know exactly what survives when you strip away everything C usually hands you for free: the language itself, pointers to any address you name, structs that describe real memory byte-for-byte, and the discipline to build back only what you actually need. This is not a smaller C. It is C used for the one job it was originally designed for.',
    nextChapter: 'Next: you can read bits and write freestanding C — but everything you\'ve written so far assumes you already know where things live: which register holds what, what the stack actually is, how a function call really works underneath the C syntax. Module P03 opens up the CPU itself: the small, fixed set of registers that is the entire workspace you have before any memory abstraction exists.',
  },
}

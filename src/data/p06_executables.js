// p06_executables.js — Prerequisite 6: From Source to Executable
export const p06 = {
  id: 'P06',
  title: 'From Source to Executable',
  subtitle: 'gcc does not turn your C into something the CPU can run. Not directly. Not in one step.',
  estimatedMinutes: 25,

  mystery: {
    type: 'mystery',
    lines: [
      'You wrote one file, kernel.c.',
      'Running it took a compiler, an assembler, and a separate program called a linker —',
      'three tools, three formats, before you had one executable.',
      'What is each one actually doing,',
      'and why can none of them be skipped?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Linker Is Older Than C Itself',
      number: '01',
      color: '#818cf8',
      blocks: [
        {
          type: 'history',
          content: `It's the late 1950s, well over a decade before C exists. Programs are getting too large to compile as one single file in one pass — and programmers realize they want to compile pieces separately, then combine them, without recompiling everything every time one small piece changes. The problem: a piece of code compiled by itself often calls a function that lives in a different piece, not yet compiled, at an address nobody can possibly know yet.

The solution invented to solve this — decades before Unix, decades before C — is the linker: a separate program that takes multiple partially-compiled pieces, each with placeholder gaps for addresses it couldn't fill in alone, and stitches them together into one final program, filling in every gap only once everything is assembled and every real address is known. This two-phase idea — compile pieces independently, link them together afterward — is so foundational that it predates almost every programming language you've ever used, including the one this entire course is written in.`,
        },
      ],
    },
    {
      id: 'pipeline',
      title: 'Four Tools, Three Formats, Hidden Behind One Command',
      number: '02',
      color: '#818cf8',
      blocks: [
        {
          type: 'text',
          content: `When you type gcc kernel.c -o kernel, it feels like one tool doing one job. It is actually **four separate programs**, run in sequence, each one handing its output to the next:

**1. The preprocessor** expands everything textual before real compilation starts: #include pastes in the entire contents of a header file, #define expands every macro use, #ifdef strips out code for branches that don't apply. The output is still C source — just with every shortcut expanded into plain text.

**2. The compiler proper** translates that expanded C into assembly for your target CPU — the exact kind of assembly you've been reading since Module 1. This is the stage that turns for loops into jumps and comparisons, turns struct field access into address arithmetic, and applies every optimization the compiler is configured to attempt.

**3. The assembler** translates that assembly into actual machine code, packaged into an **object file** — but critically, not yet a runnable program. Any reference to a function or variable defined in a different source file is left as a placeholder, because the assembler working on this one file has no idea where that other file's code will eventually live.

**4. The linker** takes one or more object files, decides on final memory addresses for everything, and patches every placeholder from step 3 with a real, resolved address — producing one final executable. This is the linker from the history above, doing in the 2020s exactly what it did in the 1950s: filling in gaps that no single file could fill in alone.

Every one of these stages produces a different file format — preprocessed C, then assembly text, then a .o object file, then a final executable — and gcc simply automates running all four and cleaning up the intermediate files, so it looks like one step.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'the_four_stages.c',
          caption: 'The exact commands hidden behind one call to gcc — run separately, with intermediate files kept',
          code: `// kernel.c
#define VGA_WIDTH 80

void kernel_main(void) {
    int width = VGA_WIDTH;
}

/*
Stage 1 — preprocess only, stop before compiling:
    gcc -E kernel.c -o kernel.i
    (kernel.i now has "int width = 80;" — VGA_WIDTH is gone, replaced with its value)

Stage 2 — compile to assembly, stop before assembling:
    gcc -S kernel.i -o kernel.s
    (kernel.s is now real x86 assembly text, human-readable, matching Module 1's bootloader style)

Stage 3 — assemble to an object file, stop before linking:
    gcc -c kernel.s -o kernel.o
    (kernel.o is now machine code, but not runnable yet —
     any symbol defined in a DIFFERENT file is still just a placeholder)

Stage 4 — link into a final executable:
    ld kernel.o -o kernel
    (every placeholder from every .o file is now resolved to a real address)
*/`,
          annotations: [
            {
              lines: [2],
              label: '#define VGA_WIDTH 80',
              what: 'A macro definition — a pure text substitution rule, not a variable.',
              why: 'This line exists specifically to demonstrate stage 1: by the time the preprocessor finishes, every occurrence of VGA_WIDTH in this file has been replaced with the literal text 80, and #define itself has vanished entirely from the output. The compiler proper (stage 2) never even sees the name VGA_WIDTH — it only ever sees int width = 80;.',
              note: null,
            },
            {
              lines: [10, 11, 12],
              label: 'gcc -E kernel.c -o kernel.i',
              what: 'Runs only the preprocessor stage, saving its output instead of piping it straight into the compiler.',
              why: 'The -E flag is what lets you inspect a stage that\'s normally invisible. Opening kernel.i and searching for VGA_WIDTH would find nothing — proof that macro expansion is a pure text transformation that happens completely before "real" compilation begins.',
              note: null,
            },
            {
              lines: [18, 19, 20],
              label: 'gcc -c kernel.s -o kernel.o',
              what: 'Runs the assembler alone, producing an object file without attempting to link it into a final executable.',
              why: 'The -c flag ("compile, don\'t link") is the single most common gcc flag you\'ll use writing a kernel — every .c file in your kernel gets compiled to a .o object file independently, exactly the way the history section described, before a separate linker step combines all of them together.',
              note: null,
            },
            {
              lines: [22, 23, 24],
              label: 'ld kernel.o -o kernel',
              what: 'Invokes the linker directly, by its own name, instead of letting gcc call it implicitly.',
              why: 'ld is a completely separate program from gcc — gcc calls it automatically as its final step, but it exists and can be invoked on its own. This is the exact tool that will need a custom linker script later in this chapter, because its default behavior assumes it\'s linking an ordinary program for your host OS, not a freestanding kernel.',
              note: null,
            },
          ],
        },
        {
          type: 'socratic',
          question: 'kernel.o was produced by assembling kernel.s, and it contains a call to a function named vga_clear() that is actually defined in a different file, screen.c. What is kernel.o allowed to contain for that call, at this stage in the pipeline?',
          options: [
            'The exact final memory address of vga_clear(), since the assembler can figure that out from the source code alone',
            'A placeholder — a relocation entry marking "this call needs a real address, currently unknown, to be filled in by the linker later"',
            'Nothing — the assembler refuses to produce an object file if any function is undefined',
          ],
          answer: 1,
          explanations: [
            'The assembler working on kernel.s has no visibility into screen.c at all, and no way to know where vga_clear() will end up living once everything is combined — it cannot possibly know a real address at this stage.',
            'Exactly right — this is the relocation entry the history section was describing, made concrete. kernel.o is deliberately incomplete: it contains a marked gap where vga_clear()\'s address should go, plus a note (an "undefined symbol" reference) saying which name needs to be resolved there. The linker is the only stage that has visibility into every object file at once, which is exactly why it — and only it — can fill that gap in.',
            'This is exactly what separate compilation is designed to allow — object files routinely contain calls to functions that are correctly, deliberately undefined at this stage, resolved later by the linker. Refusing to produce output here would make separate compilation impossible.',
          ],
        },
      ],
    },
    {
      id: 'object-files-and-elf',
      title: "Inside an Object File: Sections and a Symbol Table",
      number: '03',
      color: '#a5b4fc',
      blocks: [
        {
          type: 'text',
          content: `Both object files and the final executable use the same overall container format on Linux: **ELF** (Executable and Linkable Format). Opening either one reveals the same basic structure — a handful of **sections**, plus a **symbol table** describing every named thing this file defines or needs.

The sections that matter most: **.text** holds actual machine code — the compiled instructions themselves. **.data** holds initialized global and static variables — anything declared with a starting value, like int counter = 5;. **.bss** holds uninitialized global and static variables — and critically, .bss doesn't actually store any bytes in the file at all; it just records a size, because "uninitialized" really means "starts as zero," and the loader can zero out that much memory far more cheaply than storing a file full of zero bytes to copy. **.rodata** holds read-only constants, like string literals.

The symbol table lists two kinds of entries for each name: **defined symbols** (functions or global variables this file actually implements, at a specific offset within .text or .data) and **undefined symbols** (names this file references but expects some other object file to define — exactly the vga_clear() placeholder from the code above). Linking, at its core, is nothing more than matching every undefined symbol in every object file against a defined symbol somewhere else in the set, and patching in the resulting address. If any undefined symbol never finds a match, you get the "undefined reference" linker error — one of the most common errors in all of C development, and now you know exactly what it means: the linker searched every object file it was given and found no one claiming to define that name.`,
        },
        {
          type: 'callout',
          variant: 'insight',
          content: 'This is also the exact format Module 5\'s execve() loads: when the kernel runs a program, it is reading this same ELF structure — sections, a header describing where each section belongs in memory, and an entry point address — and mapping it into the new process\'s virtual address space accordingly. The bridge from Module P02\'s freestanding C, through this chapter\'s compilation pipeline, to Module 5\'s process launching, is the same file format the entire way through.',
        },
        {
          type: 'socratic',
          question: 'A global variable is declared as int zero_buffer[10000]; with no initial values assigned. Why does storing this in .bss instead of .data matter for the size of your compiled kernel binary on disk?',
          options: [
            'It doesn\'t matter — .bss and .data both store their contents directly in the file either way',
            '.bss only records "reserve 40,000 bytes here, zeroed" as a number, adding almost nothing to the file\'s size — while .data would have to store all 40,000 actual zero bytes in the file itself',
            '.bss is not allowed for arrays, only for single variables',
          ],
          answer: 1,
          explanations: [
            'This is exactly backwards for .bss — its entire purpose is to avoid storing the actual bytes on disk. If it worked this way, the .bss/.data distinction would serve no purpose at all.',
            'Exactly right. Since every byte in zero_buffer starts as zero, there\'s no information to store — the file just needs to say "allocate 40,000 zeroed bytes at this location," a few bytes of metadata, versus 40,000 literal zero bytes if it were treated as initialized data. This is a real, meaningful size difference in any kernel or program with large uninitialized buffers, and it\'s the entire reason the .bss/.data split exists.',
            '.bss works identically for arrays and single variables — the size in the section header simply reflects however many bytes are needed, whether that\'s one int or ten thousand.',
          ],
        },
      ],
    },
    {
      id: 'linker-scripts',
      title: 'The Linker Script: Telling the Linker Where Your Kernel Actually Lives',
      number: '04',
      color: '#c4b5fd',
      blocks: [
        {
          type: 'text',
          content: `By default, ld assumes it's linking an ordinary program meant to run under your host operating system — it expects a C runtime startup routine to call, and it picks memory addresses appropriate for a normal userspace process on your development machine, not for a kernel that will be loaded directly by a bootloader like GRUB.

None of that is what you want. A kernel needs to tell the linker, explicitly: **where does execution actually start** (not a normal main(), since there's no C runtime to call it — this connects directly to Module P02's freestanding kernel_main()), and **what memory address should the very first byte of this kernel live at** (conventionally 0x100000 — exactly 1 megabyte — for a GRUB-loaded, "multiboot" kernel, deliberately placed above Module 1's Real Mode 1MB ceiling so there's no collision with anything still running down there).

A **linker script** is a small text file that overrides ld's defaults with exactly this information — entry point, and precisely where each section (.text, .data, .bss, .rodata) should be placed in memory, in what order.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'linker.ld',
          caption: 'A minimal linker script placing a kernel at the standard 1MB load address',
          code: `ENTRY(kernel_main)

SECTIONS
{
    . = 1M;

    .text : {
        *(.text)
    }

    .rodata : {
        *(.rodata)
    }

    .data : {
        *(.data)
    }

    .bss : {
        *(COMMON)
        *(.bss)
    }
}`,
          annotations: [
            {
              lines: [1],
              label: 'ENTRY(kernel_main)',
              what: 'Tells the linker which symbol is the program\'s actual starting point.',
              why: 'Without this, ld assumes the entry point is a symbol named _start, provided by the normal C runtime startup code — which does not exist in a freestanding kernel. This line replaces that assumption with the exact function Module P02\'s freestanding chapter wrote by hand: kernel_main(), the function with nowhere to return to.',
              note: null,
            },
            {
              lines: [5],
              label: '. = 1M;',
              what: 'Sets the linker\'s current memory-address counter to 1 megabyte before placing any sections.',
              why: 'The dot (.) is the linker script\'s built-in "location counter" — a running address that advances as each section is placed. Setting it to 1M here means every section that follows gets positioned starting at address 0x100000, the conventional load address a multiboot-compliant bootloader like GRUB expects to find a kernel at, safely above Module 1\'s Real Mode territory.',
              note: null,
            },
            {
              lines: [7, 8, 9, 11, 12, 13, 15, 16, 17, 19, 20, 21, 22],
              label: '.text : { *(.text) } ... .bss : { *(COMMON) *(.bss) }',
              what: 'Explicitly places each section type, in this specific order, gathering the matching section from every input object file.',
              why: 'The *(.text) syntax means "take the .text section from every object file being linked, and concatenate them here." This is where multiple .o files genuinely become one program: kernel.o\'s .text, screen.o\'s .text, and every other file\'s .text all get merged into one contiguous block, in the order this script specifies — code, then read-only data, then initialized data, then uninitialized data, a deliberate and conventional ordering.',
              note: '*(COMMON) alongside *(.bss) exists to also catch a specific older category of uninitialized global variable (a "common symbol") that some compilers handle slightly differently from ordinary .bss — including it here ensures nothing uninitialized gets silently dropped from the final layout.',
            },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'Every kernel you will build in this course exists at the address it does — 1 megabyte, above Real Mode\'s ceiling, code before data before uninitialized memory — because of a linker script exactly like this one, not because of anything magical the compiler or the CPU does automatically. The compiler produces code that could theoretically run from any address; the linker script is the one place that pins it down to a specific, deliberate memory layout your bootloader can actually find and load.',
        },
        {
          type: 'connection-bridge',
          concept: 'Static Linking — Combining Separate Pieces Into One Deployable Whole, With Every Address Fixed',
          coreIdea: 'Resolve every cross-reference between independently-built pieces once, ahead of time, producing one self-contained artifact with nothing left unresolved.',
          connections: [
            { icon: '📦', domain: 'JavaScript bundlers (Webpack, Rolldown, esbuild)', description: 'This entire site is built with Rolldown — a bundler that does, for JavaScript modules, exactly what a linker does for object files: takes many separately-authored files, resolves every import statement against the file that actually export()s that name, and produces one combined output. An unresolved import in JS produces an error with the same shape as a linker\'s "undefined reference."' },
            { icon: '☁️', domain: 'Dynamic linking vs. a CDN-hosted library', description: 'Bundling React directly into your JS bundle is static linking — resolved once, at build time, baked in. Loading React from a CDN script tag at runtime, shared across many sites, is dynamic linking — resolution happens later, at load time, against whatever copy happens to be available then. Both are the exact same tradeoff C programs make between statically linking a library and dynamically linking against a shared .so file.' },
            { icon: '☕', domain: 'JVM classloading', description: 'When a Java program calls a method on a class it hasn\'t loaded yet, the JVM resolves that reference at class-load time, not at compile time — a form of linking that happens later than C\'s, but solving the identical problem: matching a reference in one piece of code against a definition that lives somewhere else.' },
            { icon: '🗺️', domain: 'DNS resolution', description: 'A hostname in a URL is itself an unresolved reference — a symbol, in this chapter\'s terms — that has to be looked up and matched against a real IP address before a connection can happen. DNS is, structurally, a giant distributed symbol table, resolved at a different point in time than any of the other examples here, but doing the same fundamental job.' },
          ],
          punchline: 'You have now seen the same problem — "how do independently-built pieces find each other\'s addresses" — solved by a 1950s mainframe linker, this site\'s own JavaScript bundler, the JVM, and the DNS system that resolved the domain this page is hosted on. The specific mechanism (relocations, import resolution, classloading, DNS lookups) and the specific moment it happens (link time, build time, class-load time, request time) differ. The underlying problem does not.',
        },
        {
          type: 'what-this-means',
          text: 'The exact page you are reading right now was produced by a linking step — Rolldown resolved every import across every one of this site\'s source files and combined them into the JavaScript bundle your browser downloaded. You have been looking at the output of a linker this entire session, running the exact same kind of resolution this chapter just walked through by hand, on a completely different kind of source file.',
        },
        {
          type: 'socratic',
          question: 'You forget the linker script entirely and just run plain ld kernel.o -o kernel with no ENTRY() and no memory layout specified. What is the most likely practical consequence for a kernel meant to be loaded by GRUB at 1MB?',
          options: [
            'No difference — GRUB reads the ELF header regardless, so the linker script is a purely optional convenience',
            'ld falls back to its default assumptions (a _start symbol, addresses appropriate for a normal hosted program on your build machine) — which almost certainly do not match what a multiboot bootloader expects, producing a binary that fails to boot correctly even though it compiled and linked without error',
            'The linker automatically detects that kernel_main() has no return and infers it must be a kernel, adjusting its defaults accordingly',
          ],
          answer: 1,
          explanations: [
            'GRUB does read the ELF header, which is exactly why the header\'s contents matter — an ELF header built from the wrong defaults tells GRUB the wrong entry point and the wrong load addresses, which is a real, practical failure, not a non-issue.',
            'Exactly right, and this is a genuinely common early mistake in real OS development: the build succeeds with zero errors, because nothing about missing ENTRY() or a memory layout is actually invalid to the linker — it just silently falls back to defaults meant for an entirely different kind of program. The resulting binary boots into nothing, or crashes immediately, with no compiler or linker error anywhere to point at the actual cause.',
            'The linker has no special-case logic for detecting "this looks like a kernel" — it applies its ordinary defaults regardless of what the code inside actually does. Every one of those defaults has to be overridden explicitly, every time, which is the entire reason linker scripts exist as a tool in the first place.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'kernel.c', sublabel: 'One source file, human-written' },
      { label: 'Preprocessor', sublabel: 'Macros expanded, includes pasted in' },
      { label: 'Compiler', sublabel: 'C translated into assembly' },
      { label: 'Assembler', sublabel: 'Assembly → kernel.o, with placeholders for unresolved symbols' },
      { label: 'Linker + linker.ld', sublabel: 'Every placeholder resolved, addresses fixed at 1MB' },
      { label: 'One ELF executable', sublabel: 'The same format Module 5\'s execve() loads' },
    ],
    finalInsight: 'A single gcc command was never one step — it was four separate programs, three intermediate file formats, and a linker doing a job invented before C existed, before Unix existed, before almost anything you have learned in this course existed. You now know exactly what produces the file GRUB will eventually load: not magic, but a deliberate, inspectable pipeline you can run one stage at a time, and a linker script that pins your kernel to precisely the address a bootloader expects to find it at.',
    nextChapter: 'Next: you can read bits, write freestanding C, work the CPU\'s registers and stack, switch into Protected Mode, wire up interrupts, and now produce a real linked executable. Module P07 closes the Prerequisites track with the one thing left: the actual command-line tools — a cross-compiler, a Makefile, QEMU, and a debugger — that turn everything in this track into a kernel you can actually build and boot on your own machine.',
  },
}

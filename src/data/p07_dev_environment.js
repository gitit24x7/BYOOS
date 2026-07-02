// p07_dev_environment.js — Prerequisite 7: Your Dev Environment
export const p07 = {
  id: 'P07',
  title: 'Your Dev Environment',
  subtitle: 'The gcc on your machine cannot build an OS. You need a different one, on purpose.',
  estimatedMinutes: 20,

  mystery: {
    type: 'mystery',
    lines: [
      'You already have a C compiler installed.',
      'It has compiled hundreds of your programs correctly.',
      'It is also the wrong compiler for this project,',
      'and using it will silently produce a broken kernel.',
      'Why would a perfectly good compiler be the wrong tool here?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: "Compilers Have a Bootstrap Problem Too",
      number: '01',
      color: '#a5b4fc',
      blocks: [
        {
          type: 'history',
          content: `Module 1 opened with a chicken-and-egg problem: a computer needs an OS to load code, but loading the OS is itself code, and something has to run before any of that exists. Compilers had, and solved, the exact same shape of problem decades earlier. The first compiler for a brand-new CPU architecture can't be written in the language it's meant to compile, for the obvious reason that no compiler for that language exists yet on that CPU.

The standard fix, developed through the 1970s and formalized as "cross-compilation," is to build the new compiler on a *different*, already-working machine, deliberately configuring it to generate code for the *target* machine instead of for itself. The compiler runs on one architecture and produces binaries for a completely different one. This isn't a workaround anyone invented for OS development specifically — it's the general solution to "how do you get software running on hardware that has no software yet," and it's exactly the tool this chapter asks you to set up.`,
        },
      ],
    },
    {
      id: 'why-cross-compiler',
      title: 'Why Your Regular gcc Is the Wrong Tool',
      number: '02',
      color: '#a5b4fc',
      blocks: [
        {
          type: 'text',
          content: `The gcc already installed on your machine is a **hosted** compiler, built specifically to produce programs that run under your host OS. Even when you pass -ffreestanding -nostdlib (from Module P02), it can still quietly leak host-specific assumptions: it may search your system's standard include paths and find a real header file with the same name as one you meant to write yourself, or its default output format may assume ABI conventions your host OS expects but your bare-metal kernel never will.

The fix isn't a compiler flag — it's a **different compiler entirely**, built for what's called a different "target triple." A target triple describes architecture-vendor-OS: your host compiler is typically something like x86_64-pc-linux-gnu. A kernel cross-compiler is built for a target like i686-elf — the elf explicitly meaning "no operating system." A compiler built for that target has no concept of Linux, no path to your system's libc, and no ABI assumptions borrowed from any host OS, because it was never compiled with any of that knowledge in the first place. It isn't just configured to ignore your host environment — it structurally cannot see it. This is why OSDev.org's own documentation treats building a cross-compiler as the mandatory first step, not an optional optimization: it eliminates an entire category of "works on my machine, breaks on a real bootable image" bugs before you write a single line of kernel code.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'build_cross_compiler.sh',
          caption: 'The standard OSDev.org recipe for building an i686-elf cross-compiler from source',
          code: `# 1. Set up where the cross-compiler will live and what it targets
export PREFIX="$HOME/opt/cross"
export TARGET=i686-elf
export PATH="$PREFIX/bin:$PATH"

# 2. Build binutils first — the assembler and linker (ld) targeting i686-elf
cd binutils-build
../binutils-2.42/configure --target=$TARGET --prefix="$PREFIX" \\
    --with-sysroot --disable-nls --disable-werror
make
make install

# 3. Build gcc itself, targeting the same triple, using the binutils
#    we just built rather than the system's own binutils
cd ../gcc-build
../gcc-14.2.0/configure --target=$TARGET --prefix="$PREFIX" \\
    --disable-nls --enable-languages=c --without-headers
make all-gcc
make all-target-libgcc
make install-gcc
make install-target-libgcc`,
          annotations: [
            {
              lines: [2, 3, 4],
              label: 'export TARGET=i686-elf',
              what: 'Sets the target triple every subsequent build step will be configured against.',
              why: 'This single variable is what makes everything else in this script produce a cross-compiler instead of an ordinary one — every --target=$TARGET flag below tells the build system "generate code for this target, regardless of what machine you\'re building on right now."',
              note: null,
            },
            {
              lines: [7, 8, 9, 10],
              label: 'binutils configure/make/install',
              what: 'Builds and installs a version of binutils — which includes the assembler and the ld linker from Module P06 — specifically targeting i686-elf.',
              why: 'binutils has to be built first because gcc itself calls out to an assembler and a linker as part of its own build process. Building binutils for i686-elf before gcc ensures gcc\'s build process, and every future kernel build, uses a linker that understands the freestanding target — not your host system\'s regular /usr/bin/ld.',
              note: null,
            },
            {
              lines: [13, 14, 15, 16, 17, 18, 19],
              label: 'gcc configure --without-headers',
              what: 'Builds gcc itself, configured for the same i686-elf target, explicitly without any C standard library headers.',
              why: '--without-headers is the flag that makes this genuinely a freestanding-only compiler — it builds just enough of gcc (and libgcc, a small runtime support library for things like large integer division that even freestanding code sometimes needs) to compile C without ever assuming a hosted C library exists. This is Module P02\'s "freestanding vs hosted" distinction enforced at the compiler-build level, not just as a flag you remember to pass every time.',
              note: null,
            },
          ],
        },
        {
          type: 'socratic',
          question: 'You accidentally forget --without-headers when building your cross-compiler, and it links against your host machine\'s standard C headers instead. Your kernel.c still compiles without any errors. What is the actual risk this creates?',
          options: [
            'None — if it compiles without errors, the output is guaranteed correct',
            'Header files can silently pull in declarations, macros, or inline functions that assume a hosted environment exists — code can compile cleanly while quietly depending on host-OS assumptions that break the moment the kernel actually boots on real or emulated hardware',
            'The only risk is slightly slower compile times, since the compiler searches more directories',
          ],
          answer: 1,
          explanations: [
            'Compiling without errors only confirms the C syntax is valid — it says nothing about whether the code\'s behavior at runtime depends on assumptions (like an available libc, or specific host ABI conventions) that simply won\'t hold once this code is the very first thing running on bare hardware with nothing underneath it.',
            'Exactly right, and this is precisely why --without-headers exists rather than trusting programmers to just remember not to use forbidden functions. A stray #include might resolve to a real host header, quietly injecting host-specific type definitions or inline assumptions that compile fine, produce a kernel binary that looks correct, and then fail in confusing ways only once actually booted — the worst kind of bug, because nothing in the build process flagged it.',
            'Compile time is a real but minor side effect — the actual risk is correctness, not performance. A cross-compiler misconfigured this way can produce a kernel that builds successfully and still doesn\'t work.',
          ],
        },
      ],
    },
    {
      id: 'makefiles',
      title: 'The Build Script That Ties Every Chapter Together',
      number: '03',
      color: '#c4b5fd',
      blocks: [
        {
          type: 'text',
          content: `Module P06 walked through four pipeline stages by hand, one file at a time. A real kernel has many source files — a bootloader in assembly, a kernel entry point in C, an IDT setup module, a screen driver — and re-typing every compile and link command by hand, every time, for every file, doesn't scale. That's the job of **make**: a build tool that reads a **Makefile** describing *targets* (files to produce), their *dependencies* (files they're built from), and the *recipe* (shell commands) to build each one — then only rebuilds what actually needs rebuilding, based on file modification timestamps.

This is not a new tool invented for kernels specifically — make dates to 1976, and the exact same dependency-and-recipe model shows up in essentially every serious build system since. Once your Makefile exists, building your entire kernel — running the cross-compiler on every .c file, assembling every .asm file, and linking everything with Module P06's linker script — collapses back down to one command: make.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'Makefile',
          caption: 'A minimal kernel Makefile, tying together the cross-compiler, the linker script, and QEMU',
          code: `CC = i686-elf-gcc
CFLAGS = -ffreestanding -nostdlib -Wall -Wextra

OBJS = boot.o kernel.o idt.o screen.o

kernel.bin: $(OBJS) linker.ld
	$(CC) -T linker.ld -o kernel.bin $(CFLAGS) $(OBJS) -lgcc

kernel.o: kernel.c
	$(CC) -c kernel.c -o kernel.o $(CFLAGS)

boot.o: boot.asm
	nasm -f elf32 boot.asm -o boot.o

run: kernel.bin
	qemu-system-i386 -kernel kernel.bin

clean:
	rm -f *.o kernel.bin`,
          annotations: [
            {
              lines: [1, 2],
              label: 'CC = i686-elf-gcc / CFLAGS = -ffreestanding -nostdlib ...',
              what: 'Defines reusable variables for the cross-compiler\'s name and the flags every C file needs.',
              why: 'This is exactly the cross-compiler built in the previous section, referenced by name — and the exact -ffreestanding -nostdlib flags from Module P02, written once here instead of retyped for every file. Every rule below reuses $(CC) and $(CFLAGS) instead of repeating the full command.',
              note: null,
            },
            {
              lines: [4],
              label: 'OBJS = boot.o kernel.o idt.o screen.o',
              what: 'Lists every object file the final kernel needs to be linked from.',
              why: 'This single line is standing in for Module P06\'s entire "many .c files become many .o files, then get linked together" pipeline — each name here corresponds to one source file that make knows how to build, using the rules further down.',
              note: null,
            },
            {
              lines: [6, 7],
              label: 'kernel.bin: $(OBJS) linker.ld',
              what: 'A target rule: "to build kernel.bin, you need every file in $(OBJS) plus linker.ld to exist and be up to date first."',
              why: 'This is the dependency graph make is built around — before running this rule\'s recipe (the $(CC) -T linker.ld ... line below it), make checks each dependency, and if any .o file is missing or older than its source file, it runs that file\'s own rule first. This is exactly how make avoids rebuilding your entire kernel every time you change one line in one file.',
              note: null,
            },
            {
              lines: [9, 10],
              label: 'kernel.o: kernel.c',
              what: 'A rule for building one specific object file from one specific source file.',
              why: 'This is one instance of Module P06\'s "stage 3: assemble to an object file" step, expressed as a make rule instead of a manually-typed command. If kernel.c hasn\'t changed since kernel.o was last built, make skips this rule entirely and reuses the existing kernel.o — the entire reason make exists instead of a plain shell script that rebuilds everything unconditionally.',
              note: null,
            },
            {
              lines: [15, 16],
              label: 'run: kernel.bin',
              what: 'A target with no actual output file — a "phony" convenience target that just runs QEMU on the finished kernel.',
              why: 'Because kernel.bin is listed as a dependency, running make run first ensures the kernel is fully built (or rebuilt, if anything changed) before QEMU launches it — one command takes you from "I changed a line of code" to "watching it run," the same edit-build-run loop this chapter\'s next section covers in detail.',
              note: null,
            },
          ],
        },
        {
          type: 'socratic',
          question: 'You edit only screen.c and run make. boot.asm and kernel.c have not changed since the last build. What does make actually do?',
          options: [
            'Rebuilds every single file from scratch, including boot.o and kernel.o, to guarantee consistency',
            'Rebuilds only screen.o (since screen.c changed and is now newer than the existing screen.o), then re-links kernel.bin using the freshly built screen.o alongside the still-valid boot.o and kernel.o',
            'Does nothing, since kernel.bin already exists as a file',
          ],
          answer: 1,
          explanations: [
            'This is exactly the behavior make was invented to avoid — rebuilding unrelated, unchanged files every time wastes time on any project with more than a couple of source files, and defeats the entire purpose of dependency-based rebuilding.',
            'Exactly right. make compares screen.c\'s modification time against screen.o\'s — since screen.c is newer, that one rule reruns. boot.o and kernel.o are untouched because their source files didn\'t change, so make correctly reuses the existing object files. Then, because kernel.bin depends on $(OBJS) and one of those (screen.o) just changed, the final link step reruns too — producing a correct kernel.bin without redoing any unnecessary work.',
            'kernel.bin existing as a file doesn\'t make it up to date — make specifically checks whether any of kernel.bin\'s dependencies are newer than kernel.bin itself, which they are here, so the link step reruns regardless of whether the output file was already present.',
          ],
        },
      ],
    },
    {
      id: 'qemu-and-gdb',
      title: 'Testing Without a Second Computer: QEMU and GDB',
      number: '04',
      color: '#e0e7ff',
      blocks: [
        {
          type: 'text',
          content: `Early OS developers tested kernels by rebooting a real, physical machine — often a spare one, kept around specifically because a broken kernel could hang or crash the whole computer, with no way to debug it from the inside once it's crashed. **QEMU** solves this by emulating an entire PC — CPU, RAM, disk, video card — as an ordinary program running on your existing machine. Booting your kernel in QEMU means a crash costs you nothing but closing a window; there is no real hardware at risk, and no reboot required.

Debugging a kernel has its own version of the same problem M01's bootloader ran into with printf(): you can't easily set a breakpoint inside an OS using the OS's own tools, because if the kernel is broken enough, there may be no working tools left to run. QEMU's answer is a **GDB stub** — QEMU can expose a debugging interface that a separate copy of GDB, running on your host machine entirely outside the emulated environment, connects to over the network. From there, you can set breakpoints in your kernel's C code, step instruction by instruction, and inspect memory and registers — debugging your OS the same way you'd debug any ordinary program, because the debugger itself is running completely outside the fragile environment being debugged.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'debug_session.sh',
          caption: 'Booting a kernel in QEMU, then attaching GDB to step through it from outside',
          code: `# Terminal 1: boot the kernel, and wait for a debugger before running any code
qemu-system-i386 -kernel kernel.bin -s -S

# Terminal 2: connect GDB to QEMU's debug stub
i686-elf-gdb kernel.bin
(gdb) target remote localhost:1234
(gdb) break kernel_main
(gdb) continue
# execution now stops at kernel_main, exactly like debugging any normal program`,
          annotations: [
            {
              lines: [2],
              label: 'qemu-system-i386 -kernel kernel.bin -s -S',
              what: 'Boots kernel.bin inside QEMU, but with two extra flags: -s opens a GDB stub on port 1234, and -S pauses the CPU immediately at power-on instead of running.',
              why: 'The -S flag matters specifically because kernel code starts executing immediately — without it, your kernel could run past the exact instructions you wanted to debug before GDB even has a chance to connect. Pausing at power-on guarantees GDB attaches before a single instruction of your kernel has executed.',
              note: null,
            },
            {
              lines: [5],
              label: 'i686-elf-gdb kernel.bin',
              what: 'Starts GDB, loading kernel.bin so it can match memory addresses back to your actual function and variable names.',
              why: 'This is the same cross-compiler toolchain from earlier in this chapter, extended to include a matching gdb build — i686-elf-gdb understands the same target as your cross-compiler, letting it correctly interpret the kernel\'s symbols instead of misreading them through your host architecture\'s assumptions.',
              note: null,
            },
            {
              lines: [6],
              label: 'target remote localhost:1234',
              what: 'Connects this GDB instance to the debug stub QEMU opened with the -s flag.',
              why: 'This is the moment the two terminals become one debugging session: GDB is running as an ordinary program on your host machine, completely unaffected by whatever state your kernel is in, while controlling and inspecting the emulated machine over this connection — exactly the "debugger outside the fragile environment" idea from the text above.',
              note: null,
            },
            {
              lines: [7, 8],
              label: 'break kernel_main / continue',
              what: 'Sets a breakpoint at kernel_main — the exact entry point named in Module P06\'s linker script — then resumes execution until that breakpoint is hit.',
              why: 'This is the payoff of the entire chapter: kernel_main() is no longer a black box that either works or silently doesn\'t. You can now stop execution at that exact function, inspect every register and every variable, and step forward one line at a time — the same debugging workflow you already know from ordinary application development, now available for code with no operating system underneath it at all.',
              note: null,
            },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'The entire loop this course has been building toward is now complete: write C and assembly, cross-compile it with a compiler that cannot accidentally leak host assumptions, link it with a script that places it at exactly the address a bootloader expects, boot it in an emulator that risks nothing if it crashes, and step through it with a debugger running safely outside the environment being debugged. This is not a simplified version of how real kernels get built — this is, almost exactly, the actual workflow behind Linux, and every hobbyist OS on osdev.org.',
        },
        {
          type: 'connection-bridge',
          concept: 'The Edit-Build-Run Loop, Made Safe',
          coreIdea: 'Isolate the thing you\'re testing from the machine you\'re working on, so a crash costs you nothing and every run starts from a known, clean state.',
          connections: [
            { icon: '🐳', domain: 'Docker / VMs for local development', description: 'Running a database or a whole backend stack inside Docker instead of directly on your laptop is the same QEMU idea: isolate the thing being tested, so breaking it costs you a container restart instead of your actual machine.' },
            { icon: '🧪', domain: 'CI runners and sandboxed test environments', description: 'A GitHub Actions job running your test suite in a disposable container is testing in an isolated, disposable environment for the exact same reason QEMU exists here — a broken test run should never be able to damage the environment it ran in.' },
            { icon: '🐛', domain: 'Browser DevTools debugger', description: 'Setting a breakpoint in Chrome DevTools and stepping through JavaScript line by line is the exact same workflow as this chapter\'s GDB session — a debugger, external to the page\'s own execution, pausing and inspecting state on demand.' },
            { icon: '🔄', domain: 'npm run dev hot-reload', description: 'A local dev server that rebuilds and refreshes automatically on every file save is the same edit-build-run loop as make run — just with the rebuild triggered by a file watcher instead of a manual command, and a browser tab instead of QEMU as the "run" target.' },
          ],
          punchline: 'Isolating what you\'re testing from what you\'re working on, and closing the loop between editing code and seeing it run, are not kernel-development-specific ideas — they\'re the same two decisions behind Docker, CI pipelines, browser debuggers, and hot-reloading dev servers. QEMU and GDB are this course\'s version of tools you likely already rely on every day, applied to code with no operating system underneath it yet.',
        },
        {
          type: 'what-this-means',
          text: 'Every tool in this chapter — the cross-compiler, the Makefile, QEMU, GDB — exists to answer one question safely: does this code actually work, without risking the machine you\'re developing on to find out. That question, and that answer, is the same one behind virtually every safe software development workflow you have ever used, including whichever one built the page you are reading right now.',
        },
        {
          type: 'socratic',
          question: 'You could, in principle, skip QEMU entirely and boot your kernel directly on a real spare PC by writing kernel.bin to a USB drive. What is the actual practical cost of doing that instead of using QEMU during development?',
          options: [
            'None — a real PC and QEMU behave identically for testing purposes, so there is no meaningful difference',
            'Every test cycle requires physically rewriting a USB drive and rebooting real hardware, a crash can hang the machine with no way to inspect what happened, and there is no equivalent of GDB\'s external, safe debugging connection into real hardware in the way this chapter describes for QEMU',
            'Real hardware is strictly better for testing, since it eliminates any risk of emulator-specific bugs that wouldn\'t occur on physical hardware',
          ],
          answer: 1,
          explanations: [
            'They are not equivalent for iteration speed or safety — this is precisely the gap QEMU exists to close, and it\'s a real, practical difference every early OS developer historically ran into.',
            'Exactly right. Every one of the costs listed here was a genuine, daily friction point for OS developers before tools like QEMU existed: slow, physical iteration cycles, crashes with no way to inspect what went wrong short of a hardware reset, and no safe way to attach a debugger to a machine that might not even be responding anymore. QEMU\'s entire value proposition in this chapter is removing all three costs at once.',
            'Emulator-specific discrepancies are a real, if secondary, concern serious OS developers do eventually test for on real hardware — but that tradeoff only matters after the tight, safe development loop QEMU provides has already done most of the debugging work. It is not a reason to skip QEMU during development.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'Cross-compiler built', sublabel: 'i686-elf-gcc — structurally blind to your host OS' },
      { label: 'Makefile written', sublabel: 'Every source file, one dependency graph, one command' },
      { label: 'make', sublabel: 'Only what changed gets rebuilt' },
      { label: 'kernel.bin produced', sublabel: 'Linked with Module P06\'s linker script, at 1MB' },
      { label: 'QEMU boots it', sublabel: 'A crash costs nothing — no real hardware at risk' },
      { label: 'GDB attaches', sublabel: 'Breakpoints and stepping, from outside the fragile environment' },
    ],
    finalInsight: 'The Prerequisites track is complete. You can read and write the bits and bytes underneath every hex constant. You can write C with nothing underneath it. You understand the CPU\'s own workspace before memory exists. You can switch the CPU out of its 1978 compatibility mode. You can route hardware and software events through an interrupt table. You can turn separate source files into one linked executable. And now you have a safe, real, repeatable way to build and test all of it — the exact toolchain a real OS developer uses today, not a simplified stand-in for it.',
    nextChapter: 'Next: everything in this track was building toward one moment — Module 2\'s virtual memory, which needs a working C toolchain, Protected Mode already active, interrupts already wired up (page faults are interrupts, exactly as Module P05 showed), and a real build loop to test it in. You are no longer reading about how an OS works. From here, every module gives you something you could actually build, boot in QEMU, and watch run.',
  },
}

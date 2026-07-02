// p03_registers.js — Prerequisite 3: Registers, Segments, and the Stack
export const p03 = {
  id: 'P03',
  title: 'Registers, Segments, and the Stack',
  subtitle: "The CPU's scratch paper — and the only workspace you have before any memory abstraction exists.",
  estimatedMinutes: 25,

  mystery: {
    type: 'mystery',
    lines: [
      'Your program has variables, arrays, structs, function calls —',
      'dozens, sometimes thousands of named things.',
      'The CPU itself has about fifteen storage slots, and no names at all. Just letters.',
      'How does everything your code does',
      'collapse down into fifteen slots?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Scratch Paper That Started It All',
      number: '01',
      color: '#06b6d4',
      blocks: [
        {
          type: 'history',
          content: `It's 1978. Intel is designing the 8086 processor, and every transistor is expensive — there is no room for generous amounts of on-chip storage. Reading from main memory takes many CPU cycles; reading from a location wired directly into the processor's own circuitry takes almost none. Intel's engineers had to choose a small, fixed number of these ultra-fast storage slots, name each one, and hard-wire that naming directly into the instruction set itself.

They picked eight general-purpose slots — AX, BX, CX, DX, SI, DI, BP, SP — each with a specific habit baked into different instructions (multiplication results always land in AX, string operations always use SI and DI). That set of eight, doubled to sixteen when 64-bit mode arrived decades later, is still exactly what every x86 CPU you have ever used provides. Compatibility is why the count stayed small even as everything else about the chip grew a thousandfold: change how many registers exist, and every program ever compiled for x86 stops working.`,
        },
      ],
    },
    {
      id: 'gp-registers',
      title: 'General-Purpose Registers: Your Only Storage Before Memory Exists',
      number: '02',
      color: '#06b6d4',
      blocks: [
        {
          type: 'text',
          content: `Here's the fact that makes registers make sense: **reading from a register costs roughly zero cycles. Reading from RAM costs somewhere around 100-300 cycles.** That gap — two to three orders of magnitude — is why the CPU keeps a tiny set of values on-die instead of just using memory for everything. Every register is, physically, a handful of transistors sitting directly next to the arithmetic circuitry that uses them.

On x86-64, the sixteen general-purpose registers are named rax, rbx, rcx, rdx, rsi, rdi, rbp, rsp, and r8 through r15. Each one is 64 bits wide — but here's the part that trips people up: **the same physical register can be accessed at four different widths**, using different names. rax is the full 64-bit register. eax is its lower 32 bits. ax is the lower 16 bits of that. al is the lower 8 bits of that. They are not four separate registers — writing to eax zeroes the upper 32 bits of rax, and writing to al only touches the lowest byte, leaving the rest of rax untouched. This sub-register aliasing exists purely for backward compatibility: eax and ax are literally the same names the 8086 used in 1978, kept alive inside every modern 64-bit register.

A handful of these registers have conventional jobs baked in by the calling convention (the agreed-upon rules for how functions pass arguments and return values) — rax typically holds a function's return value, rdi and rsi typically hold the first two arguments on Linux x86-64. You already saw this in Module 4's syscall code: rax held the syscall number, rdi/rsi/rdx held the arguments. That wasn't an arbitrary choice in that chapter — it's the standard convention every C compiler on Linux follows.`,
        },
        {
          type: 'analogy',
          analogy: "A carpenter's workbench with exactly four tool slots built into the surface — a hammer slot, a screwdriver slot, two general slots — versus an entire warehouse of tools in the next room. Anything in the workbench slots is instantly at hand. Anything in the warehouse has to be walked over, fetched, and carried back before it can be used, and then walked back out to make room for the next tool.",
          connection: "Registers are the workbench. RAM is the warehouse. A CPU instruction that only touches registers executes in roughly one cycle — pure workbench work. An instruction that has to reach into RAM (a load or a store) pays the warehouse round-trip, hundreds of times slower. This is exactly why compilers work so hard to keep frequently-used values in registers as long as possible, and only \"spill\" a value out to memory when it genuinely runs out of workbench slots.",
        },
        {
          type: 'code',
          language: 'asm',
          filename: 'registers_demo.asm',
          caption: 'The same physical register accessed at four widths, and moving values between registers and memory',
          code: `section .text
global _start

_start:
    mov rax, 0x1122334455667788   ; load a full 64-bit value into rax
    mov ebx, eax                  ; ebx = lower 32 bits of rax (0x55667788)
    mov cx, ax                    ; cx  = lower 16 bits of rax (0x7788)
    mov dl, al                    ; dl  = lower 8 bits  of rax (0x88)

    mov [my_variable], rax        ; STORE: rax's value goes out to memory
    mov rsi, [my_variable]        ; LOAD:  memory's value comes back into rsi

    add rax, rbx                  ; pure register-to-register arithmetic

section .data
my_variable: dq 0`,
          annotations: [
            {
              lines: [5],
              label: 'mov rax, 0x1122334455667788',
              what: 'Loads a 64-bit immediate value directly into the full rax register.',
              why: 'This is the widest form of rax — all 8 bytes are meaningful here. Every other line in this snippet reads a narrower slice of this exact same value, not a copy of it, because eax/ax/al are not separate storage — they are aliases into the low bits of the same 64-bit physical register.',
              note: null,
            },
            {
              lines: [6, 7, 8],
              label: 'mov ebx, eax / mov cx, ax / mov dl, al',
              what: 'Copies progressively narrower slices of rax\'s value into ebx, cx, and dl.',
              why: 'This demonstrates the sub-register aliasing directly: eax is rax\'s low 32 bits, ax is rax\'s low 16 bits, al is rax\'s low 8 bits. Each mov here only reads the width it names — mov dl, al touches exactly one byte, not the other seven sitting in the same physical register.',
              note: 'One asymmetry worth knowing: writing to a 32-bit register name (like eax) automatically zeroes the upper 32 bits of the full 64-bit register — but writing to a 16-bit or 8-bit name (ax, al) leaves the untouched upper bits exactly as they were. This inconsistency is a real, well-known x86 quirk, not a typo in this explanation.',
            },
            {
              lines: [10],
              label: 'mov [my_variable], rax',
              what: 'Stores rax\'s value out to a location in RAM.',
              why: 'The square brackets are what turn this from "move a value into a register" into "move a value to the memory address that my_variable represents." This is the CPU paying the warehouse round-trip from the analogy above — a store instruction, meaningfully slower than the pure register moves in the lines above it.',
              note: null,
            },
            {
              lines: [11],
              label: 'mov rsi, [my_variable]',
              what: 'Loads the value at my_variable\'s memory address back into rsi.',
              why: 'This is the same round-trip in reverse — a load. Notice the register on the left has no brackets (we\'re writing INTO the register itself), while the memory operand on the right has brackets (we\'re reading THROUGH an address). This bracket convention is how x86 assembly distinguishes "the register" from "the memory the register\'s value points at" everywhere in this course.',
              note: null,
            },
          ],
        },
        {
          type: 'socratic',
          question: 'You write mov eax, 0xFFFFFFFF, then later read the full 64-bit rax. What do you find in the upper 32 bits of rax?',
          options: [
            'Whatever was there before — writing to eax only ever touches the lower 32 bits',
            'Zero — writing to a 32-bit register name automatically zeroes the upper 32 bits of the full 64-bit register',
            '0xFFFFFFFF as well — the value gets sign-extended to fill the whole register',
          ],
          answer: 1,
          explanations: [
            'This is the behavior for 16-bit and 8-bit register names (ax, al) — but 32-bit names are the one documented exception on x86-64. This inconsistency is exactly the kind of detail worth memorizing, because it silently produces different results depending on which register width you write to.',
            'Exactly right, and this is a genuinely useful architectural quirk: writing to eax, ebx, or any other 32-bit register name always zero-extends into the full 64-bit register. Compilers exploit this constantly — it\'s often the cheapest way to zero the upper half of a 64-bit register without a separate instruction.',
            'Sign-extension does not happen automatically here — that would require a distinct instruction (like movsx) specifically meant for sign-extending. A plain mov to a 32-bit register name zero-extends, full stop, regardless of whether the value looks like it could represent a negative number.',
          ],
        },
      ],
    },
    {
      id: 'segments-addressing',
      title: 'Segments and Addressing Modes: How a Register Becomes a Memory Address',
      number: '03',
      color: '#0ea5e9',
      blocks: [
        {
          type: 'text',
          content: `Beyond the general-purpose registers, x86 has a small family of **segment registers**: CS, DS, SS, ES, FS, GS. In Module 1's Real Mode bootloader, these mattered enormously — Real Mode addresses memory as segment:offset, where the actual physical address is computed as (segment × 16) + offset. That's the entire reason a 16-bit CPU with 16-bit registers could still reach a full megabyte of RAM: the segment register supplied extra high-order bits the offset alone couldn't reach.

Once a kernel switches into Protected Mode (which Module P04 covers next), segment registers stop meaning "multiply by 16 and add" and instead become indexes into a table of memory-region descriptors — but the registers themselves, CS/DS/SS/ES/FS/GS, are the same six names, still used for exactly this purpose. Two of them, FS and GS, survive in modern 64-bit kernels for an entirely different job: pointing at small per-CPU or per-thread data structures, letting the kernel find "the current CPU's private data" with a single instruction no matter which CPU core is running.

The other half of "how a register becomes a memory address" is the **addressing mode** — the syntax for combining a register with a constant to compute one address. The general form looks like:

**[base + index × scale + displacement]**

base is a register holding a starting address, index is a register that increments (typically used for walking through an array), scale multiplies the index by 1, 2, 4, or 8 (matching the size of an int, a pointer, a double...), and displacement is a constant offset added on top. This single addressing mode is how the compiled version of arr[i] turns into one CPU instruction: base = the array's starting address, index = i, scale = sizeof(each element).`,
        },
        {
          type: 'callout',
          variant: 'insight',
          content: 'This is exactly why Module P04 exists as its own chapter. Right now, in Real Mode, your segment registers are doing 1978-era segment:offset math with a hard 1-megabyte ceiling — the same limitation Module 1 introduced. The moment you load a Global Descriptor Table and flip one bit in a control register, those same six segment register names start meaning something completely different: indexes into descriptors that can describe a 4-gigabyte (or, in long mode, effectively unlimited) address space with real memory protection. Same register names. Completely different meaning, depending on which mode the CPU is in.',
        },
        {
          type: 'socratic',
          question: 'A C compiler needs to translate arr[i] — where arr is an array of 4-byte ints — into one CPU instruction. Which piece of the [base + index × scale + displacement] addressing mode does the compiler use to account for each int being 4 bytes wide, not 1?',
          options: [
            'displacement — the compiler adds 4 to the address for every element',
            'scale — the index register (holding i) gets automatically multiplied by 4 before being added to the base',
            'base — the compiler picks a different base register depending on the element size',
          ],
          answer: 1,
          explanations: [
            'displacement is a single fixed constant added once — it can\'t scale per-element, because it doesn\'t know the value of i at compile time. It\'s the wrong field for a per-element adjustment.',
            'Exactly right. scale exists specifically so index doesn\'t have to be pre-multiplied by hand — the CPU does index × scale as part of the address computation in a single instruction. For an array of 4-byte ints, the compiler sets scale = 4, so arr[i] becomes [base + i × 4], computing the correct byte offset for element i automatically, no matter what i is at runtime.',
            'base just holds the array\'s starting address — it stays the same regardless of element size. Element size is exactly what the scale field exists to encode.',
          ],
        },
      ],
    },
    {
      id: 'the-stack',
      title: 'The Stack: The One Piece of Memory Every Function Call Depends On',
      number: '04',
      color: '#38bdf8',
      blocks: [
        {
          type: 'text',
          content: `Everything so far has been about registers — a fixed, tiny set of on-die storage. But function calls need more than that: local variables, saved register values, a way to know where to return to when a function finishes. That's the job of the **stack** — a region of memory managed by one dedicated register, rsp (the stack pointer), following one rule: **last in, first out**.

On x86, the stack grows *downward* — pushing a value **decreases** rsp and writes the value there; popping **increases** rsp and reads the value that was there. This is a historical convention, not a law of physics, but it's universal across x86 and worth internalizing exactly backward from what "stack" might suggest.

Two instructions do almost all the work: **push** writes a value to the address rsp points at, then decrements rsp by 8 (on 64-bit). **pop** increments rsp by 8, then reads the value from the address it now points at. And two more instructions build function calls on top of that: **call** pushes the address of the very next instruction (the "return address") onto the stack, then jumps to the target function. **ret** pops that address back off the stack and jumps to it — which is exactly how a function "knows" where to resume the caller. You saw this exact mechanism, at a higher level, in Module 3's context-switch discussion of iretq: it's the same push-the-address-then-jump-back-to-it idea, just for a normal function call instead of a full process switch.`,
        },
        {
          type: 'code',
          language: 'asm',
          filename: 'stack_demo.asm',
          caption: 'push, pop, call, and ret — building and tearing down a stack frame by hand',
          code: `section .text
global _start

_start:
    mov rax, 10
    mov rbx, 20
    push rax             ; save rax before we call add_numbers
    push rbx             ; save rbx too

    call add_numbers     ; pushes return address, jumps to add_numbers

    pop rbx              ; restore rbx
    pop rax              ; restore rax
    ; rax now holds the sum, returned from add_numbers

    jmp exit

add_numbers:
    push rbp             ; save caller's base pointer
    mov rbp, rsp          ; establish our own stack frame

    mov rax, [rbp + 24]   ; read the saved rax argument off the stack
    mov rcx, [rbp + 16]   ; read the saved rbx argument off the stack
    add rax, rcx           ; rax = rax + rcx

    pop rbp               ; restore caller's base pointer
    ret                    ; pop return address, jump back to _start

exit:
    ; ...`,
          annotations: [
            {
              lines: [7, 8],
              label: 'push rax / push rbx',
              what: 'Writes rax and rbx onto the stack, decrementing rsp each time.',
              why: 'These values need to survive the call to add_numbers, whose body is free to overwrite rax and rcx internally. Pushing them onto the stack is a deliberate save — the exact same idea as the context-switch PCB from Module 3, just at the scale of "one function call" instead of "one whole process."',
              note: null,
            },
            {
              lines: [10],
              label: 'call add_numbers',
              what: 'Pushes the address of the instruction right after this call, then jumps to add_numbers.',
              why: 'This pushed return address is what makes ret possible later. Without call doing this automatically, add_numbers would have no way of knowing where execution should resume once it finishes — it would need to be told the return address some other way.',
              note: null,
            },
            {
              lines: [19, 20],
              label: 'push rbp / mov rbp, rsp',
              what: 'Saves the caller\'s base pointer, then sets rbp to the current top of the stack — establishing this function\'s own "stack frame."',
              why: 'rbp becomes a stable reference point for this function\'s locals and arguments, even as rsp itself moves around during the function body (from further pushes and pops). This two-line pattern is so common it has a name: the function prologue, and it appears at the start of nearly every non-trivial function ever compiled from C.',
              note: null,
            },
            {
              lines: [22, 23],
              label: 'mov rax, [rbp + 24] / mov rcx, [rbp + 16]',
              what: 'Reads the two pushed arguments back off the stack, using rbp as a fixed reference point.',
              why: 'This is the [base + displacement] addressing mode from the previous section, applied to the stack itself. Because rbp stayed fixed at the top of the stack from the moment this function started, rbp + 24 and rbp + 16 reliably point at the same two saved values (the pushed rbx, then rax, then the return address pushed by call, in that specific order) no matter what this function does with rsp afterward.',
              note: 'The exact offsets (16, 24) depend on how many bytes were pushed before this point — return address (8 bytes) + saved rbx (8 bytes) = 16, then the next 8 bytes up is the saved rax. Getting these offsets wrong is one of the most common sources of real stack-corruption bugs in hand-written assembly.',
            },
            {
              lines: [26, 27],
              label: 'pop rbp / ret',
              what: 'Restores the caller\'s base pointer, then pops the return address and jumps to it.',
              why: 'This is the function epilogue — the exact mirror of the prologue. ret specifically only works correctly if the stack is in exactly the state call left it in: the return address must be sitting at the current top of the stack. Any bug that pushes one more value than it pops before ret executes will cause ret to jump to garbage — a real and common category of stack-corruption bug.',
              note: null,
            },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'A function call is not a special CPU feature — it is push (save the return address), jmp (go run the function), and eventually pop plus a jump back (ret). Local variables are not a special language feature either — they are just space reserved on the stack, addressed relative to a fixed register (rbp). Every abstraction your programming language gives you for "calling a function" compiles down to exactly this: a handful of pushes, pops, and jumps, operating on one register, rsp, that never stops moving while your program runs.',
        },
        {
          type: 'connection-bridge',
          concept: 'The Call Stack',
          coreIdea: 'A single last-in-first-out region of memory tracks "where to return to" and "what local state belongs to this call," nested automatically as functions call other functions.',
          connections: [
            { icon: '🌐', domain: 'JavaScript stack traces', description: 'When a browser prints "Uncaught Error" with a list of function names and line numbers, it is reading the exact same mechanism — a call stack of return addresses (translated back to source locations) — that push and call built in the assembly above, just with a JS engine\'s own managed stack instead of raw rsp.' },
            { icon: '🔁', domain: 'Recursion and stack overflow', description: 'A "stack overflow" error in any language is rsp (or its managed-language equivalent) running out of reserved stack memory because a recursive function kept calling itself, pushing a new frame each time, without ever reaching a base case that starts popping them back off.' },
            { icon: '🧵', domain: 'OS threads', description: 'Every thread the OS creates gets its own separate stack — its own private region of memory and its own rsp value. This is why threads can each be "in the middle of" a different function call simultaneously without stepping on each other\'s local variables: same mechanism as this chapter, one instance per thread.' },
            { icon: '🐍', domain: 'Python\'s call stack limit', description: 'Python\'s RecursionError and its configurable sys.setrecursionlimit() exist because Python tracks its own call stack (built on top of the real hardware stack) and deliberately caps its depth — a software-enforced limit sitting on top of the same underlying push/pop mechanism from this chapter.' },
          ],
          punchline: 'Every programming language you have ever used gives you function calls, local variables, and recursion as if they were fundamental features of computing. They are not. They are a specific, disciplined pattern of push, pop, call, and ret, applied to one register that never stops moving. You just watched that pattern with nothing hidden.',
        },
        {
          type: 'what-this-means',
          text: 'Right now, as your browser renders this page, thousands of JavaScript function calls are happening — event handlers, animation callbacks, framework internals. Every single one of them pushed a return address onto some stack, ran, and popped back off, exactly like add_numbers did above. You do not see rsp moving. It has been moving the entire time you have been reading this sentence.',
        },
        {
          type: 'socratic',
          question: 'A function pushes rbp and two local variables onto the stack in its prologue (3 pushes total), but due to a bug, its epilogue only pops 2 values before executing ret. What actually happens?',
          options: [
            'Nothing breaks — ret always knows where the real return address is regardless of extra values on the stack',
            'ret pops whatever value is currently on top of the stack and jumps to it as if it were a return address — but because one extra value was never popped, that value is actually one of the local variables, not the real return address, so execution jumps to garbage',
            'The CPU detects the mismatch and automatically triggers a controlled error before jumping anywhere',
          ],
          answer: 1,
          explanations: [
            'ret has no awareness of "which value is the real return address" — it simply pops whatever is currently on top of rsp and jumps there, trusting the code around it to have kept the stack balanced. There\'s no built-in safety check here.',
            'Exactly right, and this is one of the most common real-world classes of bugs (and historically, security vulnerabilities) in hand-written assembly and unsafe C. Every push before a call must be matched by an equal number of pops before the matching ret — the stack has no way to know "which value was meant to be the return address" versus "which value was a local variable." Get the count wrong, and ret confidently jumps to whatever garbage address happened to be sitting where the real return address should have been.',
            'x86 has no built-in stack-balance checking — this is precisely why stack-corruption bugs are dangerous rather than automatically caught. Modern defenses like stack canaries exist as software add-ons specifically because the hardware itself does not check this.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'Registers: on-die storage', sublabel: 'Roughly zero-cycle access, versus ~100-300 cycles for RAM' },
      { label: 'Sub-register aliasing', sublabel: 'rax / eax / ax / al — one physical register, four widths' },
      { label: 'Segment registers', sublabel: 'Segment:offset today, descriptor-table indexes after P04' },
      { label: '[base + index × scale + displacement]', sublabel: 'How a register becomes a memory address' },
      { label: 'The stack: push, pop, call, ret', sublabel: 'Function calls, with nothing hidden' },
      { label: 'rbp-relative addressing', sublabel: 'A stable reference point for locals and arguments' },
    ],
    finalInsight: 'You now know exactly what the CPU has to work with before any memory abstraction exists: about fifteen named slots for values, a handful of addressing-mode rules for turning those slots into memory addresses, and one disciplined pattern — push, pop, call, ret — that gives you function calls out of nothing but a moving pointer. Every higher-level language feature you have ever used compiles down to this. There is no layer underneath it except the transistors themselves.',
    nextChapter: 'Next: you now understand the workspace a CPU has before memory is set up. Module P04 uses exactly that workspace to do something concrete — load a table of descriptors into the CPU, flip one bit, and leave Real Mode\'s 1-megabyte ceiling behind for good. This is the literal next instruction your bootloader from Module 1 needs to execute.',
  },
}

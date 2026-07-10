// b04_isr_stubs.js — Bring-Up 4: From Interrupt to C
export const b04 = {
  id: 'B04',
  title: 'From Interrupt to C',
  subtitle: 'A C function cannot safely be an interrupt handler. Something has to stand between them.',
  estimatedMinutes: 30,

  mystery: {
    type: 'mystery',
    lines: [
      'Your IDT, from Module P05, points every vector at a function address.',
      'But the CPU jumping directly into an ordinary C function the instant hardware fires an interrupt',
      'would silently corrupt registers your C code never agreed to save.',
      'What has to run first — before a single line of your C handler — to make this safe?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'Why Compilers Still Can\'t Fully Solve This',
      number: '01',
      color: '#059669',
      blocks: [
        {
          type: 'history',
          content: `It's 2012, and GCC finally adds a genuine language feature for this exact problem: __attribute__((interrupt)), letting a function be marked as a real interrupt handler that the compiler itself generates correct entry and exit code for. It took decades to arrive, and even now it has sharp edges — different calling conventions depending on whether the vector has a hardware error code, platform-specific quirks, and behavior that varies across compiler versions.

Because of that, the technique nearly every real hobby OS still uses — including the one you're building — predates that compiler feature and never fully went away: a short, hand-written assembly stub for each interrupt vector, written once, that does exactly what a compiler-generated prologue would do, with nothing hidden and nothing version-dependent. You're about to write the actual, industry-standard version of this pattern, not a simplified stand-in for it.`,
        },
      ],
    },
    {
      id: 'why-not-plain-c',
      title: 'What a Normal Function Call Assumes — and Why an Interrupt Breaks It',
      number: '02',
      color: '#059669',
      blocks: [
        {
          type: 'text',
          content: `Module P03's stack chapter explained call: it pushes a return address and jumps, trusting an agreement called a **calling convention** — a set of rules both the caller and the callee follow about which registers the callee is free to overwrite (**caller-saved**) and which it must preserve (**callee-saved**). A normal C function compiled with the standard convention assumes the code that called it already saved anything in a caller-saved register (EAX, ECX, EDX) that it still needed — because it trusts there was a real call, following real rules, made by code that knew that convention existed.

An interrupt breaks that trust completely. The CPU doesn't call your handler — it jumps to it directly, via the address sitting in your IDT (Module P05), with zero awareness of any C calling convention. Whatever arbitrary code the CPU interrupted had its own values sitting in EAX, ECX, EDX, and every other register, and it fully expects them to still be there the instant it resumes. If the CPU jumped straight into an ordinary compiled C function, that function would run its normal prologue, immediately treat EAX/ECX/EDX as fair game exactly like it always does, and silently corrupt the interrupted code's registers with no error, no warning, and no way to detect it until something mysteriously breaks far later.`,
        },
        {
          type: 'analogy',
          analogy: "A colleague steps away from their desk for two minutes, leaving several documents mid-edit, expecting to return and pick up exactly where they left off. A normal function call is like a coworker who needs the desk: they know the convention (leave a sticky note, put things back exactly as found) because everyone at this company was trained on it. An interrupt is a fire alarm: someone else sits down at that desk immediately, with no idea whose desk it is or what convention applies, and starts working.",
          connection: "If that fire-alarm responder is well-trained (your assembly stub), the first thing they do — before touching anything — is photograph exactly how everything was arranged, so it can be restored perfectly. If they're not (a raw C function used directly as a handler), they just start moving things immediately, and the original desk owner returns to a mess with no idea what changed.",
        },
        {
          type: 'socratic',
          question: 'Suppose the interrupted code had the value 42 sitting in ECX, expecting to use it immediately after resuming. If the CPU jumped directly into a plain C function as the interrupt handler, and that function happened to use ECX internally (perfectly legal under the standard calling convention), what would the interrupted code see in ECX after the interrupt finishes and it resumes?',
          options: [
            'Still 42 — the CPU automatically protects all registers during an interrupt, the same way it protects EFLAGS, CS, and EIP',
            'Whatever value the C function left in ECX, likely not 42 — because ECX is a caller-saved register the function had every right to overwrite, and nothing told it an interrupted caller was depending on its old value',
            'A CPU exception, since using a register during an interrupt without saving it first is not permitted by the hardware',
          ],
          answer: 1,
          explanations: [
            'The CPU only automatically saves EFLAGS, CS, and EIP (Module P05) — general-purpose registers like ECX are never touched by the hardware\'s own interrupt-entry behavior. This is exactly the gap this chapter is about.',
            'Exactly right. ECX is caller-saved by convention, meaning any function is free to clobber it without asking — and the plain C function has no way of knowing this particular "call" was actually an interrupt with a very unusual, uninformed caller. The interrupted code resumes at exactly the instruction it left off at, reads ECX expecting 42, and silently gets garbage instead.',
            'There is no hardware enforcement here at all — using or overwriting any general-purpose register during an interrupt handler is completely legal from the CPU\'s point of view. The danger is a logic error, not something the hardware detects or prevents.',
          ],
        },
      ],
    },
    {
      id: 'the-stub',
      title: 'The Stub: Save Everything, Call C, Restore Everything',
      number: '03',
      color: '#10b981',
      blocks: [
        {
          type: 'text',
          content: `The fix is a small assembly routine, one per interrupt vector, that runs before any C code at all. Its entire job: save every register the hardware didn't already save, call a single shared C function to actually handle the interrupt, then restore everything and return — using iret (Module P05), not a normal ret, since this is resuming interrupted code rather than returning from an ordinary call.

One detail needs handling first: some CPU exceptions (vector 8, the double fault; 13, general protection; 14, page fault) push a real hardware error code onto the stack automatically, right after EIP. Most vectors don't. Left alone, this would mean two different stack layouts depending on which vector fired — so every stub that doesn't get a real error code pushes a dummy 0 itself, making every vector's stack layout identical by the time the shared C handler runs.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'isr_stub.asm + isr.c',
          caption: 'One concrete stub (vector 32, the timer — Module B05 will fire this for real), and the shared C dispatcher it calls',
          code: `; ---- isr_stub.asm ----
isr32:
    push dword 0          ; vector 32 has no hardware error code — push a dummy
    push dword 32          ; the interrupt number itself
    jmp isr_common_stub

isr_common_stub:
    pusha                   ; save all 8 general-purpose registers, one instruction
    push esp                ; pass a pointer to everything just pushed
    call isr_handler         ; the one shared C function below
    add esp, 4                ; discard that pointer argument
    popa                       ; restore all 8 general-purpose registers
    add esp, 8                  ; discard the error code and interrupt number
    iret                          ; resume the interrupted code exactly where it left off

// ---- isr.c ----
typedef struct {
    uint32_t edi, esi, ebp, esp_unused, ebx, edx, ecx, eax;
    uint32_t int_no, err_code;
    uint32_t eip, cs, eflags;
} registers_t;

void isr_handler(registers_t* regs) {
    // dispatch based on regs->int_no
}`,
          annotations: [
            {
              lines: [2, 3],
              label: 'push dword 0 / push dword 32',
              what: 'Pushes a dummy error code, then the interrupt number itself.',
              why: 'Vector 32 (this stub) never gets a real hardware error code, so pushing 0 keeps the stack layout identical to vectors that do. Pushing the number 32 explicitly is the only way the shared C handler below will know which of the 256 possible vectors actually fired — nothing else on the stack identifies it.',
              note: null,
            },
            {
              lines: [4],
              label: 'jmp isr_common_stub',
              what: 'Jumps into the one shared tail every vector\'s stub uses.',
              why: 'Every vector needs the exact same pusha / call / popa / iret sequence — writing it once and jumping to it from each small per-vector stub avoids duplicating that sequence 32 or 256 times. Real kernels generate the small per-vector stubs (like isr32 here) with an assembler macro for exactly this reason, though the underlying pattern is exactly what\'s written out explicitly here.',
              note: null,
            },
            {
              lines: [7],
              label: 'pusha',
              what: 'Pushes all eight 32-bit general-purpose registers — EAX, ECX, EDX, EBX, the original ESP, EBP, ESI, EDI — in that order, as a single instruction.',
              why: 'This is the actual fix for the danger described earlier in this chapter: every register a plain C function would feel entitled to clobber is now safely preserved before any C code runs at all. One instruction does the work eight individual push instructions would otherwise need.',
              note: null,
            },
            {
              lines: [8, 9],
              label: 'push esp / call isr_handler',
              what: 'Pushes the current stack pointer as an argument, then calls the C handler.',
              why: 'This is the detail most people find surprising the first time: nothing has been explicitly packaged into a "struct" yet — but at this exact moment, esp already points at the base of exactly the layout registers_t describes, because that\'s precisely what the CPU\'s automatic pushes and this stub\'s own pushes just built, field by field, in order. Pushing esp and calling isr_handler is indistinguishable, from the C function\'s point of view, from calling isr_handler(some_pointer) normally — the standard cdecl calling convention reads its first argument from the stack, and the stack already has exactly the right value sitting there.',
              note: 'This trick — treating raw, already-pushed stack contents as if they were a normal function argument — only works because the registers_t struct\'s field order was deliberately written to match pusha\'s exact push order. Get that order wrong, and isr_handler would read every field as the wrong register\'s value, with no compiler error to catch it.',
            },
            {
              lines: [10, 11, 12, 13],
              label: 'add esp, 4 / popa / add esp, 8 / iret',
              what: 'Cleans up the pushed pointer argument, restores all eight registers, discards the interrupt number and error code, then returns via iret.',
              why: 'add esp, 4 undoes the push esp from two lines above — cdecl requires the caller (this stub) to clean up its own arguments, unlike some other calling conventions. popa is pusha in reverse, restoring every register to exactly what it held before the interrupt. add esp, 8 discards the interrupt number and dummy/real error code, since neither the CPU nor the interrupted code ever expects them to still be there. Only after the stack is back to exactly its pre-interrupt shape does iret run — the same instruction from Module P05\'s IDT chapter, now shown completing the exact frame that chapter only described in the abstract.',
              note: null,
            },
            {
              lines: [17, 18, 19, 20, 21],
              label: 'typedef struct { ... } registers_t;',
              what: 'A C struct whose field order exactly matches the order values were pushed onto the stack — Module P02\'s packed-struct-over-memory technique, applied to the CPU\'s own stack instead of a hardware register.',
              why: 'Because pusha pushes EAX last (making it end up lowest in memory, closest to the current ESP) and EDI first, the struct\'s fields are ordered edi, esi, ebp, esp_unused, ebx, edx, ecx, eax specifically to mirror that — not alphabetically, not by convention, but by the literal order bytes ended up in memory. This is the exact same discipline Module B02\'s Multiboot header and Module P02\'s VGA struct both relied on: the struct is correct because its layout matches real memory, not because the names look reasonable.',
              note: 'esp_unused exists purely as a placeholder — pusha does push the pre-interrupt ESP value at that position, but by the time anyone reads it back, it\'s already stale (ESP has moved many times since), so real kernels almost universally ignore this field entirely.',
            },
          ],
        },
        {
          type: 'simulator',
          id: 'interrupt-stack-sim',
          caption: 'Watch the exact stack frame build, push by push, from the CPU\'s automatic pushes through pusha',
        },
        {
          type: 'explicit-insight',
          text: 'The struct that isr_handler receives is not a copy of anything, and it is not built by any special mechanism — it is literally the raw stack, read as a C struct instead of as a sequence of push instructions. You now understand the exact mechanical link between an interrupt firing and a C function safely running in response: pusha to make it safe, a struct whose layout matches the stack exactly to make it readable, and popa plus iret to make resuming the interrupted code invisible to it.',
        },
        {
          type: 'socratic',
          question: 'The registers_t struct lists esp_unused between ebp and ebx, matching pusha\'s exact push order. If you reordered the struct\'s fields to something that looked more "logical" — say, alphabetically — what would actually happen when isr_handler runs?',
          options: [
            'Nothing — the compiler matches struct fields to stack values by name, not by position',
            'Every field would read whatever register actually ended up at that position in memory, regardless of what the field is named — so regs->eax might silently contain what was really pushed as ebp, or any other mismatched value',
            'The program would fail to compile, since C validates that struct field order matches the data\'s actual layout',
          ],
          answer: 1,
          explanations: [
            'A struct has no runtime awareness of names at all once compiled — field access compiles down to a fixed byte offset from the struct\'s base address. Reordering fields changes those offsets, not what\'s actually sitting in memory at each one.',
            'Exactly right, and this is precisely the danger the earlier annotation flagged. A struct overlaying raw memory is correct only because its declared field order matches the real byte layout — reordering the fields doesn\'t reorder what pusha actually pushed, it just changes which offset each field name points at. regs->eax would silently read whatever value happens to sit at that now-mismatched offset, with the program compiling and running without any visible error.',
            'C performs no such validation, at compile time or runtime — a struct overlaying raw memory is exactly as correct, or exactly as wrong, as the programmer\'s own bookkeeping makes it. This is a real, well-known category of bug in low-level C for precisely that reason.',
          ],
        },
      ],
    },
    {
      id: 'the-real-dispatch',
      title: 'What the Handler Actually Does',
      number: '04',
      color: '#0d9488',
      blocks: [
        {
          type: 'text',
          content: `The isr_handler() shown above ended with a comment and nothing else: // dispatch based on regs->int_no. That was never finished code — it was a placeholder, the same kind of honest "not yet" this course has used before (Module P02's malloc, Module B07's coalescing). It's time to finish it, because a dispatcher that does nothing has a real, ugly consequence: right now, any CPU exception — a stray divide-by-zero, a bad pointer dereference — reaches isr_handler(), does nothing, returns through popa and iret as if nothing happened, and the interrupted code resumes running with whatever corrupted state caused the exception in the first place. Usually, that just triple-faults a moment later somewhere else entirely, with no indication of what actually went wrong.

The fix has two halves, because int_no means two different things depending on its value. Below 32, it's one of Intel's reserved CPU exceptions (Module P05) — something the CPU itself detected as fatally wrong, and the only sane response is to stop, loudly. At 32 and above, it's a hardware IRQ arriving through Module B03's remapped PIC — something to handle and then explicitly tell the PIC "I'm done," a step this course hasn't mentioned yet but is not optional.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'panic.c + isr.c (completed)',
          caption: 'A real panic screen for CPU exceptions, and the EOI hardware interrupts require but have never needed until now',
          code: `// ---- panic.c ----
#define COLOR_PANIC 0x4F   // white text on red — Module P02's high-byte attribute, a different color

static const char* exception_names[32] = {
    "Divide By Zero", "Debug", "NMI", "Breakpoint", "Overflow", "Bound Range",
    "Invalid Opcode", "Device Not Available", "Double Fault", "Coprocessor Overrun",
    "Invalid TSS", "Segment Not Present", "Stack Fault", "General Protection Fault",
    "Page Fault", "Reserved", "x87 FPU Error", "Alignment Check", "Machine Check",
    "SIMD FP Exception", "Virtualization", "Control Protection",
    "Reserved", "Reserved", "Reserved", "Reserved", "Reserved", "Reserved",
    "Reserved", "Reserved", "Reserved", "Reserved",
};

void panic(registers_t* regs) {
    vga_clear(COLOR_PANIC);
    vga_puts("KERNEL PANIC: ");
    vga_puts(exception_names[regs->int_no]);

    for (;;) {
        __asm__ volatile ("hlt");
    }
}

// ---- isr.c ----
void (*irq_handlers[16])(void) = { 0 };

void isr_handler(registers_t* regs) {
    if (regs->int_no < 32) {
        panic(regs);
    }

    int irq = regs->int_no - 32;
    if (irq < 16 && irq_handlers[irq]) {
        irq_handlers[irq]();
    }

    if (irq >= 8) outb(0xA0, 0x20);   // EOI to the slave too, for IRQ8-15
    outb(0x20, 0x20);                  // EOI to the master — every hardware IRQ, no exceptions
}`,
          annotations: [
            {
              lines: [4, 5, 6, 7, 8, 9, 10, 11, 12],
              label: 'static const char* exception_names[32] = { ... };',
              what: 'An array of strings, indexed directly by exception vector — the exact same array-as-lookup-table idiom Module B09\'s scancode_ascii[] uses, just holding text instead of characters.',
              why: 'regs->int_no is already, by construction, the exact index this table expects — Module B04\'s own stub pushed it there deliberately. exception_names[regs->int_no] turns an opaque number into something a human reading the screen can actually act on, instead of a bare digit that means nothing without the Intel manual open next to it.',
              note: null,
            },
            {
              lines: [15, 16, 17, 18, 19],
              label: 'panic()',
              what: 'Clears the screen to a distinct color, prints which exception fired, and halts forever.',
              why: 'vga_clear and vga_puts are Module P02\'s original freestanding functions, unchanged — panic() needs no new output mechanism, only a new color (COLOR_PANIC) to make a crash visually unmistakable from normal output. for (;;) __asm__ volatile ("hlt"); is a deliberate infinite loop: hlt stops the CPU until the next interrupt, and looping on it forever means this task never resumes and never returns through the stub\'s popa/iret — the interrupted, exception-causing state is simply never restored, which is exactly the point.',
              note: null,
            },
            {
              lines: [23],
              label: 'void (*irq_handlers[16])(void) = { 0 };',
              what: 'An array of 16 function pointers, one slot per possible IRQ line, all starting as null.',
              why: 'This is what lets Module B09\'s keyboard_handler(), or any future driver, plug into this shared dispatcher without isr_handler() needing to know about every driver by name. Something else — Module B11\'s kernel_main() — assigns irq_handlers[1] = keyboard_handler; once, during setup; isr_handler() only ever calls whatever is sitting in the slot for the IRQ that actually fired.',
              note: null,
            },
            {
              lines: [26, 27, 28],
              label: 'if (regs->int_no < 32) { panic(regs); }',
              what: 'Routes every CPU exception straight to panic(), before anything else in the function runs.',
              why: 'panic() never returns — its for (;;) loop is deliberately infinite — so nothing below this if actually matters for an exception; execution simply never reaches it. This single branch is the entire difference between "a bad pointer dereference silently corrupts something and crashes mysteriously three functions later" and "a bad pointer dereference stops the machine immediately, on a red screen, naming exactly what went wrong."',
              note: null,
            },
            {
              lines: [30, 31, 32, 33],
              label: 'int irq = regs->int_no - 32; if (irq < 16 && irq_handlers[irq]) { irq_handlers[irq](); }',
              what: 'Converts the raw vector back into an IRQ number (undoing Module B03\'s remap offset), and calls whatever driver registered itself for that line, if anything did.',
              why: 'regs->int_no is 32 for IRQ0, 33 for IRQ1, and so on — subtracting 32 recovers the original IRQ number Module B03\'s pic_remap(0x20, ...) shifted away from. The irq < 16 && ... check matters because int_no can legally be higher than 47 for other reasons in a larger kernel; guarding the array access here is the same bounds-safety discipline Module B09\'s own socratic question flagged as missing from its scancode table.',
              note: null,
            },
            {
              lines: [35, 36],
              label: 'if (irq >= 8) outb(0xA0, 0x20); outb(0x20, 0x20);',
              what: 'Sends the PIC End-Of-Interrupt (EOI) command — 0x20 — to the master, and to the slave too if the IRQ came from the slave\'s range (IRQ8-15).',
              why: 'This is new, and it is not optional: the 8259 tracks which IRQ line it\'s currently servicing, and it will not deliver another interrupt on that same line — or, depending on priority, on lower-priority lines either — until it\'s explicitly told "I\'m done," by writing 0x20 to its command port. Module B05\'s upcoming timer, and Module B09\'s keyboard, will each fire exactly once and then silently stop forever without this line. Because IRQ8-15 physically cascade through the master (Module B03\'s own chapter), servicing one of them requires telling both chips, not just the slave.',
              note: 'This step has nothing to do with CPU exceptions, which is exactly why the int_no < 32 branch above returns out of the function before ever reaching it — panic() halts forever, and even if it didn\'t, exceptions were never PIC-managed interrupt lines to begin with. EOI is purely PIC bookkeeping, relevant only to real hardware IRQs.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          content: 'Forgetting outb(0x20, 0x20) is one of the single most common real bugs in hobby OS development — and one of the most confusing to diagnose, because everything appears to work for exactly one tick or one keypress, then goes completely silent with no crash, no error, and no obvious cause. If Module B05\'s timer or Module B09\'s keyboard ever seems to fire once and never again, this line is the first thing to check.',
        },
        {
          type: 'checkpoint',
          label: 'Checkpoint: Trigger a Deliberate Exception',
          command: '// temporarily add this one line inside kernel_main(), after idt_install():\n__asm__ volatile ("int $0x0");',
          output: `KERNEL PANIC: Divide By Zero`,
          note: 'The screen should turn solid white-on-red and stop responding entirely — not a triple fault, not a silent reboot back to the GRUB menu. If you see this, the exact chain this module built — stub, struct, dispatcher, panic() — is working end to end. Remove the int $0x0 line once you\'ve confirmed it.',
        },
        {
          type: 'socratic',
          question: 'panic()\'s for (;;) loop means execution never falls through to the EOI-sending lines at the bottom of isr_handler(). Given that, does skipping EOI on the CPU-exception path (int_no < 32) ever actually cause a problem?',
          options: [
            'Yes — every interrupt, exception or IRQ, must always send EOI or the PIC will permanently stop delivering any further interrupts at all',
            'No — CPU exceptions aren\'t PIC-managed interrupt lines in the first place, so there is no PIC bookkeeping to close out, and panic() halting forever means there is no "resume" to protect against either way',
            'It only matters if the exception happens to share a vector number with a remapped IRQ',
          ],
          answer: 1,
          explanations: [
            'EOI is specifically how software tells the 8259 PIC "this hardware interrupt is handled, you may deliver another." CPU exceptions are raised internally by the CPU itself, never routed through the PIC at all — there is no PIC-side state for an exception that needs closing out.',
            'Exactly right, on both counts. Module B03\'s PIC only manages hardware IRQ lines (vectors 32 and up, after the remap) — it has no involvement in vectors 0-31, which the CPU generates directly. And separately, panic()\'s infinite hlt loop means this code path never returns to resume anything, so there\'s no scenario where a "missing EOI" could later cause a hang or a stuck interrupt line on this path — the machine is already halted, deliberately, forever.',
            'Vector numbers below 32 are permanently reserved by Intel and never overlap with the remapped IRQ range (32-47) — Module B03\'s entire chapter was built specifically to guarantee this never happens.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'CPU auto-pushes', sublabel: 'EFLAGS, CS, EIP — the frame Module P05 described' },
      { label: 'Stub pushes err_code + int_no', sublabel: 'Same layout, every vector, no exceptions' },
      { label: 'pusha', sublabel: 'All 8 general-purpose registers, safely preserved' },
      { label: 'push esp; call isr_handler', sublabel: 'The stack itself becomes the function argument' },
      { label: 'registers_t struct', sublabel: 'The same raw memory, read as named fields' },
      { label: 'int_no < 32 → panic()', sublabel: 'A visible, permanent stop — never a silent triple fault' },
      { label: 'int_no >= 32 → dispatch + EOI', sublabel: 'The registered driver runs, then the PIC is told "done"' },
    ],
    finalInsight: 'Nothing about a C function makes it safe to run the instant hardware interrupts your CPU — that safety comes entirely from the stub you just built, saving exactly what a normal function call would never bother to save, and handing the C world a struct that is, byte for byte, the real stack. The dispatcher this section finished is what turns that safety into something useful: exceptions become a readable panic screen instead of a mysterious crash, and hardware IRQs become handled, acknowledged, and ready to fire again. Every future interrupt handler in this course — the timer in Module B05, the keyboard in Module B09 — is built on exactly this pattern.',
    nextChapter: 'Next: the pieces are all in place — safe hardware access (Module B01), a kernel GRUB will load (Module B02), a PIC that won\'t collide with CPU exceptions (Module B03), and a safe, complete path from raw interrupt to C, including what happens when things go wrong (this module). Module B05 uses all four to build something your kernel has never had: a heartbeat, ticking at a rate you choose.',
  },
}

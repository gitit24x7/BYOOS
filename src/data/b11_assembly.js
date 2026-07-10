// b11_assembly.js — Bring-Up 11: Assembling Your Kernel
export const b11 = {
  id: 'B11',
  title: 'Assembling Your Kernel',
  subtitle: 'Ten modules built real, working pieces. None of them told you what folder to put them in.',
  estimatedMinutes: 40,

  mystery: {
    type: 'mystery',
    lines: [
      'You have working code for ports, GRUB, the PIC, interrupts, a timer, paging, an allocator,',
      'a scheduler, a keyboard, and a shell — verified, one chapter at a time, in isolation.',
      'No chapter has ever shown you all of it sitting in one directory, built by one command,',
      'in the one order that actually boots. What does the whole, real thing look like at once?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Discipline of Testing the Whole Thing at Once',
      number: '01',
      color: '#fbbf24',
      blocks: [
        {
          type: 'history',
          content: `It's 1963, and NASA's Apollo program is badly behind schedule. The standard engineering practice of the era was to test each component in isolation — the guidance computer alone, the engine alone, the capsule alone — only integrating everything once every individual piece had been separately proven. George Mueller, newly in charge of NASA's manned spaceflight program, made a decision that seemed reckless to many senior engineers: test the entire stack together, "all-up," on the very first flight, rather than incrementally.

Mueller's reasoning was specific to Apollo's actual deadline, not a general claim that integration testing beats unit testing — but the underlying insight generalizes cleanly to this exact moment in this course: components that are each individually correct can still fail the instant they depend on each other in an order, a shared memory layout, or a timing assumption that no single component's own test ever exercised. Every module in the Bring-Up track was verified on its own. This module is where that stops being enough — where boot.asm's stack, kernel.c's init order, and the Makefile's dependency graph either agree with each other or don't, and the only way to find out is to build the whole thing and boot it.`,
        },
      ],
    },
    {
      id: 'file-tree',
      title: 'Every File, and Which Chapter Wrote It',
      number: '02',
      color: '#fbbf24',
      blocks: [
        {
          type: 'text',
          content: `Nothing in this section is new code. It's a map — every file a real build of this kernel needs, and the exact module that already taught you what goes inside it. The one genuinely new piece is boot.asm, and it exists to close a gap no earlier chapter had a natural home for: Module B02's linker script points ENTRY at kernel_main directly, but the Multiboot specification never guarantees GRUB leaves you a usable stack pointer — and Module P03 was very clear that no C function, kernel_main included, can safely run without one.`,
        },
        {
          type: 'code',
          language: 'text',
          filename: 'byoos-kernel/',
          caption: 'The complete source tree — twelve files, ten different chapters, one kernel',
          code: `byoos-kernel/
├── boot/
│   ├── boot.asm        # NEW — a real stack, then call kernel_main (fills a gap B02 left open)
│   └── multiboot.c      # Module B02 — the 12-byte GRUB contract
├── kernel/
│   ├── kernel.c          # NEW — kernel_main() and idt_install(): the init sequence itself
│   ├── screen.c            # Module P02 — vga_putchar / vga_puts / vga_clear
│   ├── idt.c                # Module P05 — idt_set_gate()
│   ├── isr_stub.asm          # Module B04 — isr0..isr31, isr32..isr47
│   ├── isr.c                  # Module B04 — registers_t, isr_handler(), panic()
│   ├── pic.c                    # Module B03 — pic_remap()
│   ├── pit.c                     # Module B05 — pit_set_frequency()
│   ├── paging.c                   # Module B06 — page_directory, paging_init()
│   ├── kmalloc.c                    # Module B07 — bump_alloc(), kmalloc(), kfree()
│   ├── task.c                        # Module B08 — task_t, schedule(), task_create()
│   ├── keyboard.c                     # Module B09 — scancode_ascii[], keyboard_handler()
│   └── shell.c                         # Module B10 — shell_task(), shell_execute()
├── linker.ld                # Module P06 + B02 — section placement, ENTRY(_start)
├── grub.cfg                  # Module B02 — the menu entry GRUB uses to find kernel.bin
└── Makefile                   # Module P07 — extended from four files to all of these`,
          annotations: [],
        },
        {
          type: 'code',
          language: 'c',
          filename: 'boot/boot.asm',
          caption: 'The one genuinely new file — a real stack before kernel_main runs, correcting Module B02\'s simplification',
          code: `[bits 32]

section .bss
align 16
stack_bottom:
    resb 16384          ; 16KB — plenty for a kernel this size
stack_top:

section .text
global _start
extern kernel_main
_start:
    mov esp, stack_top   ; the CPU's own workspace, Module P03's chapter, made real
    call kernel_main       ; never expected to return

.hang:
    cli
    hlt
    jmp .hang`,
          annotations: [
            {
              lines: [4, 5, 6, 7],
              label: 'section .bss / stack_bottom: resb 16384 / stack_top:',
              what: 'Reserves 16 kilobytes of uninitialized space in .bss, labeling the address just past it stack_top.',
              why: 'resb (reserve bytes) allocates space without initializing it — the same .bss idea Module B07\'s allocator sits on top of, just used directly here instead of through kmalloc(). A stack needs real, reserved memory to grow into; this is that memory, claimed before a single line of C runs.',
              note: null,
            },
            {
              lines: [11, 12],
              label: 'global _start / extern kernel_main',
              what: 'Exposes _start so the linker script can name it as the entry point, and declares kernel_main as defined elsewhere (kernel.c).',
              why: 'This is the same extern discipline Module B07\'s extern uint32_t end; relied on — a promise to the assembler that a symbol exists somewhere else, resolved later at link time. _start needs to be global specifically because ENTRY() in the linker script references it by name from a different file entirely.',
              note: null,
            },
            {
              lines: [13, 14, 15],
              label: 'mov esp, stack_top / call kernel_main',
              what: 'Points ESP at the top of the reserved stack region (stacks grow downward, Module P03), then calls into C for the first time.',
              why: 'This is the single instruction every earlier chapter\'s code silently assumed had already happened. kernel_main() can push local variables, call other functions, and trigger interrupts safely from this point forward specifically because ESP now points at real, dedicated memory instead of whatever arbitrary value GRUB happened to leave behind.',
              note: null,
            },
            {
              lines: [17, 18, 19, 20],
              label: '.hang: cli / hlt / jmp .hang',
              what: 'A safety net in case kernel_main() ever actually returns, which it never should — disables interrupts, halts the CPU, and if woken by an NMI, loops back to halting again.',
              why: 'shell_task() (Module B10) runs forever by design, so in practice this code never executes — but leaving kernel_main with nothing to return to would mean falling off the end of _start into whatever garbage bytes follow it in memory. This is the same "never trust an unhandled edge case" instinct behind Module B09\'s bounds-checking socratic question, applied here as a deliberate last line of defense instead of a bug.',
              note: null,
            },
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          content: 'One correction to Module B02\'s linker script: ENTRY(kernel_main) works only if GRUB happens to leave a usable stack pointer, which the Multiboot specification never actually promises. This chapter\'s linker.ld changes that one line to ENTRY(_start), pointing at boot.asm\'s stub instead — everything else about Module B02\'s and Module P06\'s section layout is unchanged.',
        },
      ],
    },
    {
      id: 'kernel-main',
      title: 'kernel_main(): Order Is the Whole Chapter',
      number: '03',
      color: '#f59e0b',
      blocks: [
        {
          type: 'text',
          content: `Every function called below already exists, fully built, in an earlier module. The only genuinely new decision this section makes is what order to call them in — and that order is not arbitrary. Each step depends on every step before it having already completed: interrupts can't be safely enabled before the IDT has real entries in every gate; the IDT's exception vectors are useless without a panic() to call; hardware IRQs can't be acknowledged without Module B03's remap already having moved them off Intel's reserved range; and nothing that calls kmalloc() can run before Module B07's heap has been initialized.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'kernel/kernel.c',
          caption: 'idt_install(), and the init sequence that ties all ten Bring-Up modules together',
          code: `#include <stdint.h>

extern void isr0(void); extern void isr1(void);  /* ... isr2 through isr46 ... */ extern void isr47(void);
static void (*isr_table[48])(void) = { isr0, isr1, /* ... */ isr47 };

void idt_install(void) {
    for (int i = 0; i < 48; i++) {
        idt_set_gate(i, (uint32_t) isr_table[i], 0x08, 0x8E);
    }
    idt_load();
}

typedef struct task { uint32_t esp; struct task* next; } task_t;
task_t* current_task;
static task_t boot_task = { 0, &boot_task };   // a ring of exactly one task, for this minimal kernel

void scheduler_init(void) {
    current_task = &boot_task;
}

void kernel_main(uint32_t magic, uint32_t mbd) {
    vga_clear(COLOR_WHITE);
    vga_puts("BYOOS booting...\\n");

    idt_install();                          // Module P05 — every gate real before anything can fire
    pic_remap(0x20, 0x28);                    // Module B03 — must happen before interrupts are enabled
    irq_handlers[1] = keyboard_handler;        // Module B09 — one slot in Module B04's dispatcher
    pit_set_frequency(100);                     // Module B05 — the heartbeat, silent until sti
    paging_init();                                // Module B06 — real memory translation active
    bump_alloc_init();                             // Module B07 — heap ready before any kmalloc()
    scheduler_init();                                // Module B08 — current_task is real

    __asm__ volatile ("sti");                         // only now — every handler above is ready

    shell_task();                                       // Module B10 — never returns
}`,
          annotations: [
            {
              lines: [3, 4, 5, 6, 7, 8, 9, 10],
              label: 'isr_table[48] / idt_install()',
              what: 'A 48-entry array of function pointers — one per exception vector (0-31) and remapped IRQ vector (32-47) — installed into the IDT by one loop instead of 48 individual idt_set_gate() calls.',
              why: 'Module B04 already told you real kernels generate the 48 tiny per-vector stubs (isr0 through isr47) with a repetitive assembler macro rather than hand-writing each one — isr_table[] is that same repetition, one level up, turned into data instead of hand-typed calls. idt_load() is the C-callable wrapper around the lgdt-style lidt instruction Module P05\'s own chapter described loading the IDT register with.',
              note: null,
            },
            {
              lines: [12, 13, 14, 15, 16],
              label: 'static task_t boot_task = { 0, &boot_task }; scheduler_init()',
              what: 'A single task struct whose next pointer points at itself — a ring with exactly one member — assigned directly to current_task, with no call to task_create() at all.',
              why: 'The code currently executing kernel_main() and, soon, shell_task() is already running on a real stack (boot.asm\'s stack_top) — there\'s no second task to create yet, only the one already in progress. The first time Module B08\'s schedule() ever runs, it will record this already-running stack into boot_task.esp, advance current_task to current_task->next (itself), and hand that same value back — mov esp, eax becomes a no-op reassigning ESP to what it already held. No special-casing needed: Module B08\'s exact mechanism already handles a ring of one correctly.',
              note: 'Growing this into real multitasking later means exactly what Module B08 already promised: build more task_t nodes with task_create(), link them into this same ring, and nothing about schedule() itself needs to change.',
            },
            {
              lines: [22],
              label: 'irq_handlers[1] = keyboard_handler;',
              what: 'Assigns Module B09\'s keyboard handler directly into the slot Module B04\'s dispatcher array reserved for IRQ1.',
              why: 'This is the entire "installation" Module B09\'s driver needs — one array write, using the exact mechanism Module B04 built for this specific purpose. No new function, no new concept, just filling in the one slot that was always left empty until something claimed it.',
              note: null,
            },
            {
              lines: [19, 20, 21, 22, 23, 24, 25, 26, 27],
              label: 'The full init sequence, in order',
              what: 'Seven setup calls, then sti, then a function that never returns.',
              why: 'Notice what never appears here: a call to build a GDT. Module B02\'s own chapter already established why — GRUB leaves the CPU already in Protected Mode, with a working GDT of its own, before kernel_main ever runs. Module P04\'s hand-written GDT and mode transition remain exactly correct — they\'re simply not this kernel\'s problem, because GRUB already solved it. Everything else follows one rule: nothing that depends on interrupts being safe runs before sti, and sti never runs before everything it depends on is ready.',
              note: null,
            },
          ],
        },
        {
          type: 'connection-bridge',
          concept: 'An Init Sequence Is a Dependency Graph',
          coreIdea: 'A correct startup order isn\'t a style preference — it\'s the same dependency-before-dependent relationship a build system enforces, just applied to function calls instead of files.',
          connections: [
            { icon: '🛠️', domain: 'Module P07\'s own Makefile', description: 'make already refused to link kernel.bin before every .o file it depends on was built — kernel_main() enforces the identical rule at runtime: sti refuses to make sense (even though nothing stops you from calling it early) until every subsystem it depends on has already run.' },
            { icon: '🐳', domain: 'Docker Compose depends_on', description: 'A docker-compose.yml service declaring depends_on: [database] doesn\'t start until its dependency is at least running — the same "don\'t start a step whose prerequisites aren\'t satisfied yet" rule, for containers instead of interrupt handlers.' },
            { icon: '📦', domain: 'Package manager install order', description: 'npm, apt, and every other package manager compute a dependency graph and install packages in an order that guarantees every package\'s dependencies are already present — a general solution to exactly the ordering problem kernel_main() solves by hand here, at a much smaller scale.' },
          ],
          punchline: 'You already understood this rule — Module P07\'s Makefile is a dependency graph, and you\'ve used dozens of tools built on the identical idea. kernel_main() is that same rule, written out as seven ordinary function calls instead of a declarative graph, because a kernel booting for the very first time has no scheduler and no package manager yet to enforce it for you.',
        },
        {
          type: 'checkpoint',
          label: 'Checkpoint: Boot to a Shell',
          command: 'make run',
          output: `BYOOS booting...
byoos> help
commands: help, clear, uptime, meminfo
byoos> uptime
ticks since boot: 214
byoos> _`,
          note: 'Everything above this line — the boot banner, the prompt, the response to uptime — is the combined, real output of 25 modules, none of them faked or narrated. If this is what you see, every ordering decision in kernel_main() held.',
        },
        {
          type: 'socratic',
          question: 'Suppose kernel_main() called __asm__ volatile ("sti") as its very first line, before idt_install() or pic_remap() ran at all. What would you actually expect?',
          options: [
            'Nothing different — the CPU only consults the IDT and PIC once a real hardware event fires, so the order relative to sti doesn\'t matter as long as both eventually run',
            'The instant interrupts are enabled, any hardware interrupt already pending or about to fire — the PIT in particular, since nothing has told it not to run yet — would be delivered through IDT entries that were never set, almost certainly crashing before setup finishes',
            'sti would silently fail and interrupts would stay disabled until idt_install() explicitly re-enables them',
          ],
          answer: 1,
          explanations: [
            'This is exactly the assumption this section\'s ordering argues against — an interrupt doesn\'t wait politely for setup to finish. The CPU consults the IDT the instant one fires, whatever state that table happens to be in at that exact moment.',
            'Exactly right, and this is precisely why sti is the very last line before shell_task() runs, not the first line of kernel_main(). An uninitialized or partially-built IDT contains garbage or null entries; an interrupt firing into one of those jumps the CPU to an unpredictable address — not a clean error, just undefined behavior, most likely an immediate crash with no useful diagnostic at all.',
            'sti is an unconditional CPU instruction with no dependency check built in — the hardware has no way to know your IDT isn\'t ready yet, and will not refuse to enable interrupts on your behalf. The ordering discipline is entirely the programmer\'s responsibility, which is the entire point of this section.',
          ],
        },
      ],
    },
    {
      id: 'the-build',
      title: 'The Real Build: Makefile and grub.cfg',
      number: '04',
      color: '#eab308',
      blocks: [
        {
          type: 'text',
          content: `Module P07's Makefile built four files as a teaching example. This is the same Makefile, structurally unchanged, extended to every file in the tree above — plus one target P07 never needed: turning kernel.bin into a real bootable ISO image GRUB can load, using the exact grub.cfg menu entry Module B02's own chapter described GRUB scanning for.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'Makefile + grub.cfg',
          caption: 'Every object file this kernel needs, plus the iso target that makes it bootable in real GRUB',
          code: `# ---- Makefile ----
CC      = i686-elf-gcc
AS      = nasm
CFLAGS  = -ffreestanding -nostdlib -Wall -Wextra
LDFLAGS = -T linker.ld -ffreestanding -nostdlib

OBJS = boot/boot.o boot/multiboot.o \\
       kernel/kernel.o kernel/screen.o kernel/idt.o \\
       kernel/isr_stub.o kernel/isr.o kernel/pic.o kernel/pit.o \\
       kernel/paging.o kernel/kmalloc.o kernel/task.o \\
       kernel/keyboard.o kernel/shell.o

kernel.bin: $(OBJS) linker.ld
	$(CC) $(LDFLAGS) -o kernel.bin $(OBJS) -lgcc

%.o: %.c
	$(CC) -c $< -o $@ $(CFLAGS)

%.o: %.asm
	$(AS) -f elf32 $< -o $@

iso: kernel.bin grub.cfg
	mkdir -p isodir/boot/grub
	cp kernel.bin isodir/boot/kernel.bin
	cp grub.cfg isodir/boot/grub/grub.cfg
	grub-mkrescue -o byoos.iso isodir

run: iso
	qemu-system-i386 -cdrom byoos.iso

clean:
	rm -f $(OBJS) kernel.bin byoos.iso
	rm -rf isodir

# ---- grub.cfg ----
menuentry "BYOOS" {
    multiboot /boot/kernel.bin
    boot
}`,
          annotations: [
            {
              lines: [8, 9, 10, 11],
              label: 'OBJS = boot/boot.o boot/multiboot.o ...',
              what: 'Lists every object file this kernel now needs — twelve source files, up from Module P07\'s four.',
              why: 'This is the exact same $(OBJS) variable from Module P07\'s chapter, doing the exact same job — make still only rebuilds whatever changed, whether that\'s 4 files or 12. Nothing about how make works changed; only the list grew, because the kernel grew.',
              note: null,
            },
            {
              lines: [17, 18],
              label: '%.o: %.c / %.o: %.asm',
              what: 'Two pattern rules replacing Module P07\'s individual per-file rules — any .c file becomes a matching .o via $(CC), any .asm file via $(AS).',
              why: 'Module P07 wrote out kernel.o: kernel.c and boot.o: boot.asm as separate, explicit rules because there were only two source files. With twelve, one pattern rule per file type expresses the identical relationship without repeating it twelve times — make\'s % wildcard matches any filename, applying the same recipe to every match.',
              note: null,
            },
            {
              lines: [20, 21, 22, 23, 24],
              label: 'iso: kernel.bin grub.cfg ...',
              what: 'A new target, absent from Module P07: packages kernel.bin and grub.cfg into a real, bootable ISO using grub-mkrescue.',
              why: 'Module P07\'s qemu-system-i386 -kernel kernel.bin flag is a QEMU-specific shortcut that skips GRUB entirely — genuinely useful for fast iteration, but not what happens on real hardware or a fully accurate boot test. grub-mkrescue builds an actual CD-ROM image containing a real GRUB installation and this chapter\'s grub.cfg, so booting it exercises the exact Multiboot handshake Module B02\'s chapter described GRUB performing, not a QEMU convenience path around it.',
              note: null,
            },
            {
              lines: [37, 38, 39, 40],
              label: 'menuentry "BYOOS" { multiboot /boot/kernel.bin boot }',
              what: 'The GRUB configuration file itself — one menu entry, naming this kernel and the multiboot command that loads it.',
              why: 'This is the file GRUB actually reads at boot time to know what to offer and how to load it. multiboot /boot/kernel.bin tells GRUB "load this file using the Multiboot protocol" — the exact handshake Module B02\'s entire chapter was about, now triggered by a real, if tiny, configuration file instead of an abstract description.',
              note: null,
            },
          ],
        },
      ],
    },
    {
      id: 'troubleshooting',
      title: "When It Doesn't Boot",
      number: '05',
      color: '#f87171',
      blocks: [
        {
          type: 'text',
          content: `Every failure below is a real, common failure mode — not a hypothetical. Each one traces back to a specific chapter's own mechanism, which is exactly why understanding the mechanism, not just copying the code, is what makes a failure like this diagnosable instead of mysterious.`,
        },
        {
          type: 'troubleshoot',
          title: "When It Doesn't Boot",
          items: [
            {
              symptom: 'GRUB drops to a "grub rescue>" prompt instead of booting your kernel',
              cause: 'Module B02\'s Multiboot header either isn\'t within the first 8KB of kernel.bin, or magic + flags + checksum doesn\'t sum to zero — GRUB scanned, found nothing valid, and refused to load the file at all.',
              fix: 'Confirm linker.ld places .multiboot before every other section (Module B02\'s own linker chapter), and that MULTIBOOT_FLAGS wasn\'t changed without recomputing the checksum to match.',
            },
            {
              symptom: 'Linker error: "undefined reference to memcpy" or "memset"',
              cause: 'Some GCC-generated code — often struct copies or array initialization — silently calls these standard library functions even in freestanding mode, and Module P02\'s freestanding kernel has no libc providing them.',
              fix: 'Write minimal memcpy()/memset() yourself, the exact same "no library, build it yourself" discipline Module P02 and Module B10\'s k_streq() already established — or confirm -lgcc is linked (it provides compiler support routines, though not full libc functions like these).',
            },
            {
              symptom: 'The kernel triple-faults instantly — QEMU flashes and immediately resets',
              cause: 'Almost always an ordering bug: interrupts enabled (sti) before the IDT or PIC were fully set up, or a page fault immediately after CR0.PG with code that wasn\'t identity-mapped (Module B06\'s own socratic question about this exact failure).',
              fix: 'Check kernel_main()\'s call order against this chapter\'s version exactly — idt_install() and pic_remap() must both complete before sti runs, with no exceptions.',
            },
            {
              symptom: 'The timer or keyboard fires exactly once, then the system goes completely silent',
              cause: 'Missing PIC End-Of-Interrupt — Module B04\'s isr_handler() never sent outb(0x20, 0x20) (and outb(0xA0, 0x20) for IRQ8-15), so the PIC believes that IRQ line is still being serviced and will never deliver another interrupt on it.',
              fix: 'Confirm the EOI lines from Module B04\'s completed isr_handler() are actually present and unconditional for every hardware IRQ path.',
            },
            {
              symptom: 'QEMU opens a window but shows only a blinking cursor, forever',
              cause: 'Usually make iso silently produced an empty or malformed ISO — grub-mkrescue depends on the host having grub-pc-bin and xorriso installed, and fails quietly if either is missing.',
              fix: 'For fast iteration, skip GRUB entirely and boot the raw kernel with Module P07\'s qemu-system-i386 -kernel kernel.bin — if that boots correctly but make run does not, the problem is in ISO packaging, not the kernel itself.',
            },
            {
              symptom: 'The shell prompt appears, but typing produces no characters at all',
              cause: 'irq_handlers[1] was never assigned to keyboard_handler before sti ran, or Module B03\'s saved-and-restored PIC mask left IRQ1 disabled.',
              fix: 'Confirm irq_handlers[1] = keyboard_handler; runs inside kernel_main() before sti, and that nothing after pic_remap() re-masks IRQ1.',
            },
          ],
        },
        {
          type: 'what-this-means',
          text: 'Every one of these failures has a specific, nameable cause because every mechanism in this kernel is one you built and fully understand — there is no black-box vendor code to suspect, no framework internals to reverse-engineer. A triple fault is not "the computer being mysterious." It is one of a small number of well-understood things this course already taught you, in the wrong order or with one line missing.',
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'boot.asm', sublabel: 'A real stack, closing the one gap B02 left open' },
      { label: 'idt_install()', sublabel: '48 gates, one loop, Module P05\'s mechanism at full scale' },
      { label: 'pic_remap(); irq_handlers[1] = ...', sublabel: 'Module B03 and B09, wired into Module B04\'s dispatcher' },
      { label: 'paging_init(); bump_alloc_init()', sublabel: 'Real memory, ready before anything asks for it' },
      { label: 'scheduler_init()', sublabel: 'A ring of one — Module B08\'s exact mechanism, no special case' },
      { label: 'sti — only now', sublabel: 'Every dependency satisfied, in the order this chapter proved matters' },
      { label: 'shell_task()', sublabel: 'Never returns — twenty-five modules, one running system' },
    ],
    finalInsight: 'Nothing in this chapter taught you a new mechanism. Every function called here was already real, working code from an earlier module. What this chapter added was the thing no single module could teach in isolation: the order, the file layout, the build graph, and the honest list of what breaks when any one of those is wrong. This is the difference between having ten correct pieces and having one correct kernel — and you now have both.',
    nextChapter: 'You have built a real, minimal, kernel-mode operating system, assembled end to end: it boots under real GRUB, handles hardware and its own exceptions safely, keeps real time, manages real paged memory, runs as a real (if minimal) scheduled task, reads your keyboard, and talks back through a shell you can actually type into, on a build you could run today. Ring 3 — real user mode, a TSS, and the isolation a production OS needs — is the next harder phase, whenever you\'re ready for it.',
  },
}

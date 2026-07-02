// m07_scenarios.js — Module 7: Tracing Real Events Through the OS
export const m07 = {
  id: 'M07',
  title: 'Tracing Real Events Through the OS',
  subtitle: 'Every subsystem you learned, watched working together in one continuous chain.',
  estimatedMinutes: 30,

  mystery: {
    type: 'mystery',
    lines: [
      'You have learned six subsystems in isolation:',
      'booting, memory, scheduling, syscalls, processes, interrupts.',
      'A real computer never runs just one of them at a time.',
      'What does it actually look like when all six fire together, in order,',
      'for one ordinary thing you do every day?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Tool Built Just to Answer This Question',
      number: '01',
      color: '#f87171',
      blocks: [
        {
          type: 'history',
          content: `It's 2003. Bryan Cantrill and his team at Sun Microsystems are debugging production systems where something is slow, intermittently, for reasons nobody can reproduce on demand — and every subsystem involved (scheduler, memory manager, syscalls, drivers) has its own separate, disconnected logging, none of which shows the whole picture at once. Existing tools could tell you what the scheduler was doing, or what syscalls were being made, but never the full causal chain connecting one to the other for a single real event as it actually happened.

Their answer, released in 2005, was DTrace: a tool that could trace a single request as it crossed every subsystem boundary — scheduler, memory, syscalls, drivers — in one continuous, ordered timeline, on a live production system, safely. Every operating system covered in this course now ships some descendant of that idea (Linux has eBPF and ftrace; Windows has ETW). This chapter does by hand, on paper, exactly what those tools do automatically: follow one real event across every subsystem boundary it crosses, in the order it actually happens.`,
        },
      ],
    },
    {
      id: 'scenario-boot-to-app',
      title: 'Scenario One: Power Button to Running App',
      number: '02',
      color: '#5e9eff',
      blocks: [
        {
          type: 'text',
          content: `You press the power button and, moments later, double-click an icon to open a text editor. Between those two actions, every mechanism from Modules 1 through 6 fires, in this exact order, with nothing skipped.`,
        },
        {
          type: 'trace',
          title: 'Trace: Power Button → Running App',
          color: '#5e9eff',
          steps: [
            { label: 'Power on', module: 'M01', detail: 'Electricity reaches the CPU. There is no OS, no drivers, nothing — just a chip waiting for its hardwired first instruction, exactly as Module 1 opened.' },
            { label: 'BIOS / POST', module: 'M01', detail: 'The BIOS or UEFI firmware runs from a ROM chip, checks that RAM and the CPU are alive, and searches attached storage for a bootable device.' },
            { label: 'Bootloader loaded', module: 'M01', detail: 'The BIOS reads 512 bytes from disk, checks for the 0xAA55 signature, and loads them to address 0x7C00 — the exact bootloader you wrote by hand in Module 1.' },
            { label: 'Real Mode → Protected Mode', module: 'P04', detail: 'The bootloader (or a second-stage loader it chains into) builds a GDT, disables interrupts, flips the PE bit in CR0, and performs the far jump into 32-bit Protected Mode.' },
            { label: 'IDT installed', module: 'P05', detail: 'The kernel builds its Interrupt Descriptor Table and re-enables interrupts, so hardware devices and syscalls have somewhere to route to from this point forward.' },
            { label: 'Kernel memory manager starts', module: 'M02', detail: 'The kernel sets up its own page tables, establishing the virtual memory system every future process will rely on for isolation.' },
            { label: 'PID 1 created', module: 'M05', detail: 'The kernel manually creates the first user-space process — init or systemd — the root of the entire process tree, not via fork() (there is no parent yet) but by directly loading its code.' },
            { label: 'Desktop environment launched', module: 'M05', detail: 'PID 1 forks and execs a chain of system services, eventually launching your desktop environment — each step, fork() then exec(), exactly Module 5\'s mechanism.' },
            { label: 'You double-click the icon', module: 'M05', detail: 'The desktop environment calls fork() to copy itself, then exec() in the child to replace that copy with the text editor\'s program.' },
            { label: 'ELF loaded', module: 'P06', detail: 'execve() reads the text editor\'s ELF header — the same format Module 5 first mentioned and Module P06 covered in full — and maps its code and data sections into the new process\'s virtual address space.' },
            { label: 'First page fault', module: 'M02', detail: 'The new process\'s page table entries exist but most point at nothing yet. The instant the CPU tries to execute the editor\'s first instructions, a page fault (interrupt vector 14, from Module P05) fires, and the kernel maps in the actual code pages on demand.' },
            { label: 'Scheduler takes over', module: 'M03', detail: 'The new process joins the run queue. The timer interrupt, firing roughly every millisecond, preempts it fairly alongside every other running process — including the desktop environment that spawned it.' },
            { label: 'Window appears', module: 'M04', detail: 'The editor calls syscalls to open a window and start drawing — crossing Ring 3 → Ring 0 exactly as Module 4 described, using the exact syscall instruction from that chapter.' },
          ],
        },
        {
          type: 'socratic',
          question: 'In this trace, the first page fault for the newly launched text editor happens after the scheduler has already added it to the run queue conceptually, but the fault itself is handled before the editor\'s first instruction actually completes. What does this tell you about when the kernel decides to actually load a program\'s code into physical RAM?',
          options: [
            'All of a program\'s code is loaded into RAM immediately when execve() runs, before the process ever starts executing',
            'Code is loaded lazily, on demand — the page table entries exist from execve() onward, but the actual physical pages are only fetched the moment the CPU genuinely tries to execute or access them, via the page fault mechanism',
            'The scheduler itself is responsible for loading code into memory, separately from the memory manager',
          ],
          answer: 1,
          explanations: [
            'If this were true, there would be no first page fault to trace here at all — the fault only happens because the mapping exists but the actual physical page doesn\'t, yet.',
            'Exactly right, and this is Module 2\'s virtual memory system and Module P05\'s interrupt mechanism working together, exactly as this trace shows. execve() sets up the mapping (which addresses this process is allowed to use) without necessarily committing physical RAM to all of it immediately — the page fault is the mechanism that fills in physical pages precisely when they\'re actually needed, not a moment sooner.',
            'The scheduler (Module 3) only decides who gets the CPU next — it has no involvement in memory mapping or page faults, which are entirely the memory manager\'s (Module 2) and the interrupt system\'s (Module P05) responsibility.',
          ],
        },
      ],
    },
    {
      id: 'scenario-multitasking',
      title: 'Scenario Two: Typing While Music Plays in the Background',
      number: '03',
      color: '#4ade80',
      blocks: [
        {
          type: 'text',
          content: `Your text editor is now running — and so is a music player you opened earlier. You start typing. The music never stutters. Here is exactly why, traced through every subsystem that makes it possible.`,
        },
        {
          type: 'trace',
          title: 'Trace: One Keystroke, While Another Process Keeps Running',
          color: '#4ade80',
          steps: [
            { label: 'You press a key', module: 'P05', detail: 'The keyboard controller latches the scancode and raises IRQ1 — an asynchronous hardware interrupt, with no relationship to whatever either process was doing at that exact instant.' },
            { label: 'IDT lookup', module: 'P05', detail: 'The CPU finishes whatever instruction it was mid-executing (never interrupting mid-instruction), then looks up IDT[0x21] — the remapped keyboard vector.' },
            { label: 'ISR reads the scancode', module: 'P05', detail: 'The keyboard interrupt handler runs at Ring 0, reads the raw scancode from the keyboard controller\'s I/O port, and translates it into a character.' },
            { label: 'Character delivered to the editor', module: 'M04', detail: 'The kernel routes the character to whichever process currently has keyboard focus — your text editor — the same kernel-mediated boundary from Module 4\'s syscall chapter, just triggered by hardware instead of a direct request.' },
            { label: 'Meanwhile: the timer never stopped', module: 'M03', detail: 'Independently of any of this, the timer interrupt has kept firing roughly every millisecond the entire time, exactly as Module 3\'s history section described — completely unrelated to your keystroke.' },
            { label: 'Context switch to the music player', module: 'M03', detail: 'On a timer tick, the scheduler saves the editor\'s registers into its task_struct (Module 3 and P03\'s stack chapter), loads the music player\'s saved registers, and resumes it via iretq — mid-song, exactly where it left off.' },
            { label: 'Music player writes more audio', module: 'M04', detail: 'The music player calls a syscall to hand the next chunk of decoded audio samples to the sound device — the same Ring 3 → Ring 0 crossing as every other syscall in this course.' },
            { label: 'Separate page tables the whole time', module: 'M02', detail: 'The editor and the music player each have their own page table (Module 2), so nothing about handling your keystroke or feeding the sound device ever risks either process corrupting the other\'s memory.' },
          ],
        },
        {
          type: 'connection-bridge',
          concept: 'Tracing Tools — Watching This Chain in Real Systems',
          coreIdea: 'Every subsystem this course taught has a real, standard tool built specifically to observe it on a live operating system.',
          connections: [
            { icon: '📞', domain: 'strace (Linux)', description: 'Shows the exact syscall crossings from Module 4 — every write(), every execve(), every fork() a real running program makes, in order, as they happen.' },
            { icon: '📊', domain: 'perf / ftrace (Linux)', description: 'Shows the scheduler decisions from Module 3 — which process ran on which CPU, for how long, and exactly when a context switch happened.' },
            { icon: '🐝', domain: 'eBPF', description: 'The modern, safe, sandboxed descendant of the original DTrace idea from this chapter\'s history section — capable of tracing across syscalls, scheduling, and networking simultaneously, on live production systems, which is precisely the "one continuous chain across every subsystem" this chapter has been doing by hand.' },
            { icon: '🪟', domain: 'ETW (Windows) / Instruments (macOS)', description: 'Each platform\'s own equivalent tracing infrastructure — different names, same underlying need: observe scheduling, memory, and syscall activity as one connected timeline instead of disconnected logs.' },
          ],
          punchline: 'You just did, by hand, exactly what a professional debugging a real production slowdown does with these tools: followed one event across every subsystem boundary it touches, in the order it actually happens. The only difference is they get to press a button and watch it happen on a live system — you now understand well enough to know what you\'d be looking at.',
        },
        {
          type: 'socratic',
          question: 'In this trace, the keyboard interrupt and the timer interrupt are completely independent of each other — one fires because you pressed a key, the other fires on a fixed schedule regardless of anything you do. What would happen to the music player if the timer interrupt did not exist, and only keyboard and other device interrupts could trigger a context switch?',
          options: [
            'Nothing would change — the music player would still get regular turns on the CPU',
            'The music player could only ever run again once some other interrupt happened to fire — if you stopped typing and no other device event occurred, whichever process was currently running (possibly the editor, doing nothing) could hold the CPU indefinitely, starving the music player',
            'The OS would automatically fall back to running every process at once, using multiple CPU cores',
          ],
          answer: 1,
          explanations: [
            'The music player getting "regular turns" is specifically what the timer interrupt guarantees — without a fixed, predictable interrupt source, there is nothing forcing the scheduler to ever run again on any particular schedule.',
            'Exactly right, and this is the entire reason Module 3\'s preemptive scheduling depends on the timer interrupt specifically, rather than relying on whatever interrupts happen to occur. A process that never voluntarily gives up the CPU and never triggers a page fault, syscall, or I/O wait could run forever without a timer forcing a periodic context switch — which is exactly the problem preemptive, timer-driven scheduling was invented to solve, as Module 3\'s own history section described.',
            'Multiple CPU cores are a separate hardware resource, unrelated to whether interrupts exist — and even with multiple cores, each individual core still needs its own timer interrupt to preemptively share itself among more processes than it has cores for.',
          ],
        },
      ],
    },
    {
      id: 'scenario-memory-pressure',
      title: 'Scenario Three: Running Out of Memory',
      number: '04',
      color: '#a78bfa',
      blocks: [
        {
          type: 'text',
          content: `Your text editor opens an enormous file — far bigger than it expected. Here is the complete chain from one malloc() call to the operating system's very last resort.`,
        },
        {
          type: 'trace',
          title: 'Trace: One malloc() Call to the OOM Killer',
          color: '#a78bfa',
          steps: [
            { label: 'malloc() is called', module: 'P02', detail: 'The editor asks its C library for a large buffer. As Module P02 covered, malloc() doesn\'t call the kernel for every request — but this allocation is big enough that its internal free list can\'t satisfy it.' },
            { label: 'brk() / mmap() syscall', module: 'M04', detail: 'malloc() falls through to an actual syscall, crossing Ring 3 → Ring 0 exactly as Module 4 described, asking the kernel for more virtual address space.' },
            { label: 'Page table entries created, unbacked', module: 'M02', detail: 'The kernel updates the process\'s page table to reserve the requested virtual address range — but, exactly like the app-launch trace above, doesn\'t necessarily commit physical RAM to any of it yet.' },
            { label: 'The editor writes to the buffer', module: 'M02', detail: 'The moment the editor actually writes file contents into this new memory, it touches a page with no physical frame behind it yet.' },
            { label: 'Page fault fires', module: 'P05', detail: 'CPU exception vector 14 — the same page fault mechanism from Module P05\'s interrupt chapter, and the same one that fired during app launch in the first trace above.' },
            { label: 'Kernel finds a physical frame', module: 'M02', detail: 'The page fault handler recognizes this as a valid, expected fault, finds a free physical frame, updates the page table entry, and the editor\'s write is silently retried and succeeds.' },
            { label: 'This repeats — RAM starts running low', module: 'M02', detail: 'As the editor keeps reading more of the huge file, this exact fault-and-fill cycle repeats thousands of times, and available physical RAM keeps shrinking.' },
            { label: 'Swapping begins', module: 'M02', detail: 'The kernel starts writing rarely-used pages from other processes out to disk to free up physical frames — Module 2\'s swapping mechanism, now under real pressure instead of as a hypothetical.' },
            { label: 'The OOM Killer', module: 'M03', detail: 'If memory pressure gets severe enough that swapping alone can\'t keep up, Linux\'s Out-Of-Memory killer — a real kernel subsystem — picks a process (often whichever is using the most memory) and forcibly terminates it, using exactly the process-teardown mechanics from Module 3\'s scheduler and Module 5\'s process model, to free its memory and keep the rest of the system alive.' },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'A "your computer is out of memory" moment is not one event. It is the exact same page fault mechanism that quietly, invisibly loads every program you launch — running under pressure, thousands of times in a row, until the kernel is finally forced to make a visible, drastic decision using the same process-management tools from Module 3 and Module 5. Nothing new happened here. The ordinary mechanism just kept firing until it ran out of room to keep being invisible.',
        },
        {
          type: 'what-this-means',
          text: 'The next time an app on your machine gets forcibly closed with a message like "out of memory," you are not looking at a mysterious failure — you are looking at the exact chain this section just traced, all the way from a single malloc() call to a kernel subsystem making a deliberate, last-resort decision to kill a process rather than let the whole system fail.',
        },
        {
          type: 'socratic',
          question: 'The OOM Killer usually targets whichever process is using the most memory, rather than the process that most recently triggered a page fault, or the process that has run for the shortest time. Given everything you know about task_struct from Module 6 and process memory from Module 2, why does "most memory used" make more sense as a criterion than "most recent" or "newest"?',
          options: [
            'It doesn\'t really matter which process gets picked, since any single kill frees roughly the same amount of memory',
            'Because the kernel\'s actual goal is to free the maximum amount of memory with the fewest process terminations, and task_struct\'s mm field already tracks exactly how much memory each process is using — killing the single largest consumer is the most direct way to relieve the most pressure with the least collateral damage',
            'The kernel cannot actually measure how much memory a specific process is using, so it has to rely on indirect signals like process age instead',
          ],
          answer: 1,
          explanations: [
            'Different processes can use wildly different amounts of memory — a small background utility and a browser with 40 tabs open are not remotely equivalent kills. Which process gets picked matters a great deal for how much pressure is actually relieved.',
            'Exactly right, and this ties directly back to Module 6\'s task_struct: the mm field this course already covered is precisely how the kernel knows, per process, exactly how much memory is in use. Picking the largest consumer is the most efficient single action available — freeing the most memory for the least disruption, rather than guessing based on age or recency, which have no direct relationship to how much memory pressure a kill would actually relieve.',
            'This is exactly backwards — mm_struct (Module 6) gives the kernel precise, direct visibility into each process\'s memory usage. The OOM killer\'s decision is based on real, measured data, not an indirect proxy.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'Scenario 1', sublabel: 'Power on → boot → fork/exec → page fault → syscall → window' },
      { label: 'Scenario 2', sublabel: 'Interrupt → context switch → syscall, two processes, fully isolated' },
      { label: 'Scenario 3', sublabel: 'malloc → syscall → page fault → swapping → OOM killer' },
      { label: 'Six mechanisms, one chain', sublabel: 'Boot, memory, scheduling, syscalls, processes, interrupts — every time' },
      { label: 'Module 0\'s original question', sublabel: '"One CPU. 52 programs. How?" — you now have the complete answer.' },
    ],
    finalInsight: 'Three completely different real-world moments — turning your computer on, typing while music plays, running out of memory — and every single one of them was built from the exact same six mechanisms, crossing each other\'s boundaries in a slightly different order each time. That was always the actual answer to the question this entire course opened with: one CPU runs 52 programs by constantly, invisibly, crossing these same six boundaries — bootstrapping, isolating memory, scheduling fairly, guarding the syscall boundary, spawning processes, and routing interrupts — over and over, thousands of times a second, for as long as the machine stays on.',
    nextChapter: 'You have now built the complete mental model of how a real operating system works, from the 512-byte bootloader that starts it, through the prerequisites that make it actually buildable, through virtual memory, scheduling, syscalls, and process creation, to how Linux, Windows, and macOS each assemble those same six mechanisms differently — and now, how they all fire together for real, ordinary things you do every day. There is no layer left unexplained beneath the device you are reading this on.',
  },
}

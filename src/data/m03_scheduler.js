// m03_scheduler.js — Module 3: The Juggler
export const m03 = {
  id: 'M03',
  title: 'The Juggler',
  subtitle: 'One CPU, fifty apps, zero waiting. The scheduler that makes it look easy.',
  estimatedMinutes: 30,

  mystery: {
    type: 'mystery',
    lines: [
      'The CPU has one core.',
      'It can run one program at a time.',
      'You have 47 apps open.',
      'None of them are frozen.',
      'How does the OS pull this off?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Problem of Fairness',
      number: '01',
      color: '#4ade80',
      blocks: [
        {
          type: 'history',
          content: `It is 1967. Bell Labs is building UNIX. They have one machine. Many researchers want to use it simultaneously. The problem: if you let one program run until it finishes, it could run for hours. Everyone else waits. If you interrupt a program and run someone else's, you need to be able to come back and resume it exactly where you left off — not restarting it, not losing its state.

The engineers realized the solution required two things working together: a hardware timer that fires every few milliseconds to interrupt the currently running program, and a kernel routine that saves the interrupted program's complete state, picks another program, restores its state, and resumes it — all in microseconds. That kernel routine is the scheduler, and the act of saving and restoring state is called a context switch. Together, they create the illusion of simultaneity on a single CPU.`,
        },
      ],
    },
    {
      id: 'context-switch',
      title: 'The Context Switch: How the CPU Changes Hats',
      number: '02',
      color: '#4ade80',
      blocks: [
        {
          type: 'text',
          content: `Every running program has a **context** — its complete state at any moment:

- The values of all **CPU registers** (rax, rbx, rsp, rip, etc.)
- The value of the **instruction pointer** (rip) — which instruction to execute next
- The **stack pointer** (rsp) — where the call stack is
- The **page table pointer** (CR3) — which virtual address space it's using

When the OS switches from Process A to Process B, it must:

1. **Save** Process A's entire context into its kernel data structure (called the PCB — Process Control Block)
2. **Load** Process B's context from its PCB into the CPU registers
3. **Jump** to wherever Process B's instruction pointer says to go

Process B resumes executing as if nothing happened. It was never aware it was paused.

A context switch takes roughly **1–10 microseconds** on a modern CPU. The OS typically does thousands of them per second. The total overhead is a small fraction of total CPU time — and the benefit (apparent simultaneity) is immense.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'context_switch.c',
          caption: 'Simplified context switch structure — what the OS saves and restores for each process',
          code: `#include <stdio.h>
#include <stdint.h>
#include <string.h>

// The CPU registers we must save for each process.
// On x86-64, there are many more — this is simplified.
typedef struct {
    uint64_t rax, rbx, rcx, rdx;
    uint64_t rsi, rdi, rbp, rsp;
    uint64_t r8,  r9,  r10, r11;
    uint64_t r12, r13, r14, r15;
    uint64_t rip;       // instruction pointer — "where were we?"
    uint64_t rflags;    // CPU flags (zero, carry, overflow, etc.)
    uint64_t cr3;       // page table pointer — "which memory map?"
} cpu_context_t;

// The Process Control Block — everything the OS knows about one process
typedef struct {
    int           pid;           // process ID
    char          name[32];      // human-readable name
    cpu_context_t context;       // saved CPU state
    int           state;         // RUNNING, READY, BLOCKED, ZOMBIE
    int           priority;      // scheduling priority
    uint64_t      time_slice_ms; // how long it gets per turn
    uint64_t      time_used_ms;  // how long it has run so far
} pcb_t;

// Simulated "current running process"
pcb_t* current_process = NULL;

// Switch from 'from' to 'to'
void context_switch(pcb_t* from, pcb_t* to) {
    if (from != NULL) {
        // Step 1: Save the current CPU state into 'from's PCB.
        // In real OS code, this is done in assembly — the CPU
        // does not save its own registers automatically.
        // Here we just simulate it:
        printf("[SAVE]  Saved context of '%s' (pid %d) at rip=0x%lx\\n",
               from->name, from->pid, from->context.rip);
        from->state = 1;  // READY
    }

    // Step 2: Load 'to's saved context into the CPU registers.
    current_process = to;
    to->state = 0;  // RUNNING

    printf("[LOAD]  Restored context of '%s' (pid %d), resuming at rip=0x%lx\\n",
           to->name, to->pid, to->context.rip);

    // Step 3: In real code, a 'ret' or 'iretq' instruction here
    // would jump directly to to->context.rip and resume execution.
    // The process wakes up mid-instruction, completely unaware
    // it was ever paused.
    printf("[JUMP]  CPU now executing '%s'\\n\\n", to->name);
}

int main() {
    // Two processes with fake saved states
    pcb_t chrome = {
        .pid = 1001, .name = "chrome",
        .state = 0,
        .context = { .rip = 0x401A38, .rsp = 0x7FFF2000, .cr3 = 0x3A800000 },
        .time_slice_ms = 10,
    };
    pcb_t spotify = {
        .pid = 1002, .name = "spotify",
        .state = 1,
        .context = { .rip = 0x402C10, .rsp = 0x7FFE8000, .cr3 = 0x5C400000 },
        .time_slice_ms = 10,
    };

    current_process = &chrome;
    printf("--- Timer interrupt fires! Scheduler runs. ---\\n\\n");
    context_switch(&chrome, &spotify);
    context_switch(&spotify, &chrome);

    return 0;
}`,
          annotations: [
            {
              lines: [7, 8, 9, 10, 11, 12, 13, 14, 15],
              label: 'cpu_context_t — the saved CPU state',
              what: 'A struct holding the values of every CPU register at the moment a process is paused.',
              why: 'When the OS pauses a process, it must remember exactly what the CPU looked like at that moment. When it resumes the process later, it restores all these values back into the CPU registers. The process wakes up in exactly the same CPU state it was in — it has no way to detect that time passed.',
              note: 'On real x86-64 systems, there are over 100 registers to save, including floating-point registers (XMM0-XMM15), AVX registers, and more. The OS uses the FXSAVE/FXRSTOR or XSAVE/XRSTOR instructions to save and restore these efficiently. The full CPU state can be several kilobytes per process.',
            },
            {
              lines: [17],
              label: 'uint64_t rip — instruction pointer',
              what: 'Stores which instruction the program was about to execute when it was paused.',
              why: 'This is the most critical register to save. rip (Register Instruction Pointer) always points to the next instruction to execute. If the OS saves rip = 0x401A38 and later restores it, the CPU resumes from instruction 0x401A38 — exactly where the program left off, as if no time passed.',
              note: 'In the context switch analogy: saving rip is like bookmarking a page in a book. When you pick up the book later, you open to the bookmark and continue reading exactly where you stopped.',
            },
            {
              lines: [19],
              label: 'uint64_t cr3 — page table pointer',
              what: 'Stores which page table to use — which virtual address space belongs to this process.',
              why: 'CR3 is the CPU register that points to the current page table. When the OS switches processes, it must switch page tables too — otherwise Process B would be using Process A\'s memory mappings, which would be a catastrophic security breach. Changing CR3 automatically flushes the TLB (the address translation cache), which is one reason context switches have overhead.',
              note: null,
            },
            {
              lines: [22, 23, 24, 25, 26, 27, 28],
              label: 'pcb_t — Process Control Block',
              what: 'The OS data structure that represents one process — everything the kernel needs to know about it.',
              why: 'The PCB is to processes what a struct is to data: a container for everything that defines a process\'s existence. The OS keeps one PCB per process. The scheduler reads PCBs to decide who to run next. Context switching saves into and loads from PCBs.',
              note: 'In the Linux kernel, this structure is called task_struct. It is one of the largest structs in the entire kernel — hundreds of fields. It tracks not just the CPU context, but also file descriptors, signals, memory mappings, accounting info (CPU time used), parent/child relationships, and much more.',
            },
            {
              lines: [36, 37, 38, 39, 40, 41],
              label: 'Step 1: Save context of "from"',
              what: 'Stores the current CPU state into the departing process\'s PCB.',
              why: 'Without saving, when we try to resume this process later, we would not know where it was in its execution. We would have to restart it from the beginning — which would be catastrophic. Saving the context is what makes "resuming" possible rather than "restarting."',
              note: 'In real OS code (Linux, for example), this step is written in assembly — the C calling convention cannot save all registers reliably, because the C compiler itself uses registers. The assembly routine carefully saves every register before any C code runs.',
            },
            {
              lines: [46, 47, 48, 49, 50],
              label: 'Step 2: Load "to\'s" context',
              what: 'Restores the destination process\'s saved CPU state from its PCB.',
              why: 'This is the moment the CPU identity changes. After this, the CPU\'s registers all hold the values that Process B had when it was last paused. Process B wakes up believing it never stopped.',
              note: null,
            },
            {
              lines: [55, 56, 57, 58],
              label: 'Step 3: iretq — the actual jump',
              what: 'In real assembly, a single instruction causes the CPU to jump to the restored rip value — resuming the new process.',
              why: 'The OS cannot use a normal function call to return to the new process — it was not called from there. Instead, it uses a special interrupt-return instruction (iretq on x86-64) that atomically restores the instruction pointer, stack pointer, and CPU flags in one step. The CPU suddenly "is" the new process.',
              note: 'This is one of the most elegant moments in OS design. A single assembly instruction ends the OS\'s execution and begins another program\'s execution. The boundary between the OS and the user process is crossed in a single CPU cycle. If you\'ve taken Module P05, iretq is the exact counterpart to the automatic state-push that happens when an interrupt fires — this whole context switch is triggered by the timer interrupt from that chapter, and P03\'s stack chapter covers the push/pop mechanics iretq builds on.',
            },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'A context switch is your CPU putting on a different hat. It saves everything about the current program — every register, every flag, every pointer — into a struct. Then it loads everything from a different struct and jumps to wherever that program was. The program wakes up with no memory of being paused. This trick is so fast (microseconds) and happens so often (thousands of times per second) that you experience it as "multiple programs running simultaneously." You are not experiencing simultaneity. You are experiencing very fast alternation.',
        },
        {
          type: 'socratic',
          question: 'The context switch code saves CR3 — the page table pointer — right alongside the CPU registers. Why does skipping that step break more than just "resuming where you left off"?',
          options: [
            'It doesn\'t really matter — CR3 almost never changes between processes',
            'Without switching CR3, Process B would keep running with Process A\'s virtual-to-physical memory mappings — meaning it could read or overwrite Process A\'s private memory',
            'CR3 only affects which CPU core the process is allowed to run on',
          ],
          answer: 1,
          explanations: [
            'CR3 changes on essentially every context switch — each process has its own page table, because that\'s the entire mechanism behind memory isolation (Module 2). Assuming it stays the same defeats the purpose of having separate address spaces at all.',
            'Exactly right. CR3 is not just bookkeeping — it\'s the thing that makes Process B\'s "address 0x1000" point to Process B\'s memory instead of Process A\'s. Skip this step, and Process B would resume still using Process A\'s page table: same virtual addresses, but now silently pointing at someone else\'s physical RAM. That\'s not a crash, it\'s a security breach — the exact isolation virtual memory promised in Module 2 would be gone.',
            'CPU core assignment is a separate scheduler decision (which core to run on) — CR3 is about which memory a process can see once it\'s running, not where it runs.',
          ],
        },
      ],
    },
    {
      id: 'scheduling-algorithms',
      title: 'Which Process Goes Next? The Scheduling Algorithms',
      number: '03',
      color: '#fbbf24',
      blocks: [
        {
          type: 'text',
          content: `Knowing how to switch processes is only half the problem. The other half is: **who goes next?**

This is the scheduler's core decision. Different scheduling algorithms make different tradeoffs:

**Round Robin (RR)** — Give every process an equal time slice, in order, forever. Simple, fair, no starvation. The CPU scheduler simulator you saw in Module 0 uses this. Linux uses a variant of this.

**Priority Scheduling** — Give higher-priority processes more time. Your music player runs at a higher priority than your background backup job, so it gets more CPU time and sounds smooth even under load. Risk: a low-priority process might wait forever (starvation).

**Completely Fair Scheduler (CFS)** — Linux's actual scheduler since 2007. Instead of fixed time slices, it tracks how much CPU time each process has received and always runs the process that has received the least. It guarantees that all processes get a fair share over time, while still giving more CPU time to high-priority processes proportionally.

**Real-Time Schedulers** — For systems where deadlines matter (medical devices, industrial controls, audio processing). Guarantee that critical tasks run within a specific time. Linux has SCHED_FIFO and SCHED_RR for this.`,
        },
        {
          type: 'simulator',
          id: 'cpu-scheduler-sim',
          caption: 'Round-Robin Scheduler — the simplest fair scheduling algorithm',
        },
        {
          type: 'analogy',
          analogy: "A restaurant kitchen during the dinner rush. One chef, ten orders on the pass. The chef doesn't finish one order completely before starting the next — they flip the pancakes, then while those cook, start the salad, check on the steak, plate the soup. Everything advances a little at a time. No table waits forever. No order gets abandoned.",
          connection: "The chef is the CPU. Each order is a process. The chef's routine of checking each item is the scheduler. The timer on each dish is the time slice. The key insight: the chef doesn't know or care which customer is more impatient — they just keep everything moving. The OS scheduler works the same way: it doesn't know which process the user cares about most (unless you set priorities). It just keeps everything moving forward.",
        },
        {
          type: 'connection-bridge',
          concept: 'CPU Scheduling / Time-Slicing',
          coreIdea: 'Give a shared resource to multiple consumers in turn, cycling so fast that each consumer perceives continuous access.',
          connections: [
            { icon: '🌐', domain: 'Node.js event loop', description: 'Node.js runs on one thread. It handles thousands of network connections "simultaneously" by using the event loop — cycling through callbacks in a tight loop, giving each one a slice of execution time. It is cooperative scheduling (programs must yield) rather than preemptive, but the same core idea.' },
            { icon: '📡', domain: 'Time-division multiplexing (TDM)', description: 'Old telephone networks split one physical wire into many "virtual" calls by giving each call a time slot every few milliseconds. The wire rapidly switched between conversations. Listeners heard continuous audio because the switching was too fast to perceive. Identical idea to CPU time-slicing.' },
            { icon: '⚡', domain: 'GPU compute kernels', description: 'A GPU has thousands of cores but millions of threads. It schedules threads in warps (groups of 32), cycling through them. When one warp is waiting for memory, the GPU switches to another — hiding latency through rapid switching, the same trick CPUs use.' },
            { icon: '🗄️', domain: 'Database connection pools', description: 'A web app has 10 database connections but 1000 concurrent users. The connection pool schedules queries: give each query a connection for its duration, then release it. Many users share few connections, cycling through them. Same concept: time-sharing a scarce resource.' },
          ],
          punchline: 'The "run things fast enough in sequence that they appear simultaneous" trick is everywhere. Your CPU does it for processes. Node.js does it for callbacks. GPUs do it for threads. Old telephone networks did it for voice calls. Database pools do it for connections. The OS invented this pattern. Everything else is a different implementation of the same insight: fast enough alternation is indistinguishable from parallelism.',
        },
        {
          type: 'socratic',
          question: 'A process is waiting for a file to be read from disk. The disk read takes 10 milliseconds. Should the scheduler keep this process on the CPU while it waits?',
          options: [
            'Yes — keep it on the CPU so it can immediately continue when the disk responds',
            'No — the process should be moved to a BLOCKED state and a different process should run instead',
            'It depends on how long the disk read takes',
          ],
          answer: 1,
          explanations: [
            'If the process stays on the CPU while waiting for disk, it is doing nothing for 10 milliseconds. At a typical time slice of 1-10ms, that is 1-10 other processes that could have made progress. Keeping a waiting process on CPU is pure waste.',
            'Exactly right. When a process requests I/O (disk, network, keyboard, etc.), the OS immediately moves it to BLOCKED state and removes it from the run queue. The scheduler runs a different process. When the disk read completes, the OS gets an interrupt, moves the process from BLOCKED to READY, and it re-enters the scheduling queue. This is called I/O overlap or CPU-I/O overlap — it is the reason that doing disk operations does not freeze your UI. The UI process keeps running while the disk process is blocked.',
            'The answer is always "no." No matter how short the wait, the process cannot do anything useful while waiting for I/O. The OS should always switch to something productive.',
          ],
        },
        {
          type: 'socratic',
          question: 'Round Robin gives every process an identical time slice, cycling through them in a fixed order, no matter what they\'re doing. CFS instead tracks how much CPU time each process has already received and always runs whoever has received the least. What real problem does CFS actually fix that pure Round Robin can\'t?',
          options: [
            'Round Robin is computationally too slow to run on modern hardware',
            'Round Robin has no clean way to give some processes proportionally more CPU than others — CFS makes "fair share" continuous and proportional instead of a fixed rotation',
            'Round Robin never performs context switches, so processes never actually get paused',
          ],
          answer: 1,
          explanations: [
            'Speed isn\'t the issue — Round Robin\'s rotation logic is trivially cheap. Linux didn\'t replace it because it was slow.',
            'Right. Pure Round Robin treats every process identically: same slice, same turn order, forever. If you want your music player to feel smoother than a background backup job, Round Robin has no built-in way to express that without bolting on rigid priority tiers. CFS instead just asks "who has received the least CPU time so far, weighted by priority?" and runs them next — fairness becomes a continuously tracked number instead of a fixed queue position.',
            'Round Robin absolutely performs context switches — that\'s the whole mechanism that lets it rotate between processes. Without switching, there would be no "next process" to give a turn to.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'Timer interrupt', sublabel: 'Hardware fires every ~1ms' },
      { label: 'Save context', sublabel: 'All registers → PCB struct' },
      { label: 'Scheduler picks next', sublabel: 'Round-robin, priority, CFS...' },
      { label: 'Load context', sublabel: 'PCB → all registers' },
      { label: 'Switch page table', sublabel: 'CR3 → new process\'s memory map' },
      { label: 'Resume execution', sublabel: 'New process wakes up at its rip' },
    ],
    finalInsight: 'Your computer is not actually multitasking. It is doing one thing at a time, switching between tasks thousands of times per second. Every "simultaneous" program you run is actually taking turns at nanosecond intervals, saving and restoring its CPU state on each turn. The reason you cannot perceive this is the same reason 24 frames per second looks like motion: human perception has a speed limit, and the CPU is orders of magnitude faster. The scheduler exploits that gap.',
    nextChapter: 'Next: we have seen how the OS controls processes. But there is something missing — how does your code actually talk to the OS? Your program cannot touch hardware directly. It must ask the kernel. That asking mechanism is called a system call, and crossing the boundary from your code to the kernel is a carefully controlled security crossing.',
  },
}

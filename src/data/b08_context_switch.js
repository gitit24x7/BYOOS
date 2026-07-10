// b08_context_switch.js — Bring-Up 8: The Real Context Switch
export const b08 = {
  id: 'B08',
  title: 'The Real Context Switch',
  subtitle: 'Module 3 described a context switch in a C struct. Now the PIT actually triggers one.',
  estimatedMinutes: 35,

  mystery: {
    type: 'mystery',
    lines: [
      'Module 3 showed you cpu_context_t and told you a context switch saves and restores it.',
      'That code never actually ran on a timer interrupt — it was a narrated simulation of the idea.',
      'Your kernel now has a real PIT tick (Module B05) and a real ISR path (Module B04).',
      'What is the actual assembly that turns "a timer fired" into "a different task is now running"?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'One Mechanism, Not Two',
      number: '01',
      color: '#4ade80',
      blocks: [
        {
          type: 'history',
          content: `Early Unix kernels faced a design question that shaped every OS since: interrupts already need a way to save a running program's complete state and resume it later, undisturbed. Scheduling needs almost the identical capability — pause one task, resume a different one later. Building two separate mechanisms for two problems that look this similar would mean twice the code and twice the chances for the two to disagree about what "the CPU's state" even means.

The insight that stuck, and that this module builds by hand, is that scheduling doesn't need its own state-saving mechanism at all — it can borrow the interrupt mechanism directly. A context switch, from this angle, is not a special operation. It's an interrupt that resumes a *different* task than the one it paused. Every kernel context switch you have ever benefited from, on every device running this course, works this way.`,
        },
      ],
    },
    {
      id: 'the-insight',
      title: 'Why the Switch Itself Is Almost Free',
      number: '02',
      color: '#4ade80',
      blocks: [
        {
          type: 'text',
          content: `Look again at what Module B04's isr_common_stub already does, every single time any interrupt fires: pusha saves all eight general-purpose registers onto whichever stack happens to be active, and the CPU itself already pushed EFLAGS, CS, and EIP before that. By the time isr_handler runs, the entire state of the interrupted task is sitting safely on its own stack — Module B04 built this mechanism for safety, not for scheduling, but it turns out to be exactly the mechanism scheduling needs too.

Here is the entire trick this module adds: **a context switch is what happens when popa and iret pull their values from a different stack than the one pusha just pushed onto.** Nothing about pusha, popa, or iret needs to change. The only new step is swapping which memory address the stack pointer register, ESP, actually points at — in between the save and the restore. Save Task A's registers onto Task A's stack. Point ESP at Task B's stack instead. Restore registers — but now from Task B's stack, resuming Task B exactly where it last paused. Task A never runs another instruction until some future tick switches back to it, and it will resume exactly as if no time passed, the identical illusion Module 3 described.`,
        },
        {
          type: 'socratic',
          question: 'Given that pusha in Module B04\'s stub already saves every general-purpose register onto the current stack before any C code runs, what does that mean about how much new "state-saving" code a context switch actually needs to add?',
          options: [
            'A full new set of save instructions — pusha only helps with ordinary interrupts, not task switches, which need their own separate register-saving mechanism',
            'None at all — the registers are already safely saved by the time any scheduling decision gets made; the only new work is choosing a different stack to resume from',
            'Only the segment registers need additional saving, since pusha does not include them',
          ],
          answer: 1,
          explanations: [
            'This is exactly the assumption this chapter argues against — pusha has no awareness of "why" an interrupt fired, only that one did. Whatever caused the interrupt, every general-purpose register is already safely on the stack by the time C code runs, timer tick or not.',
            'Exactly right, and this is the entire chapter\'s thesis. pusha already ran, unconditionally, before any scheduling decision is even made. There is no additional register-saving work to do — the only genuinely new operation a context switch requires is deciding which task\'s stack to resume from, and pointing ESP at it before popa runs.',
            'This chapter\'s kernel stays entirely in Ring 0 with a flat, single-segment memory model (Module P04) — there are no per-task segment register differences to save in the first place, so nothing extra is needed there either.',
          ],
        },
      ],
    },
    {
      id: 'the-code',
      title: 'Swapping the Stack, Inside the Timer\'s Own Handler',
      number: '03',
      color: '#22c55e',
      blocks: [
        {
          type: 'text',
          content: `The generic isr_common_stub from Module B04 works unchanged for every vector except one: the timer, vector 32, gets its own tail that does everything the generic one does, plus the actual switch. Instead of calling isr_handler with a pointer (Module B04 needed a pointer because it read many individual register fields), this version calls a new function, schedule(), passing the current stack pointer as a plain value and receiving a possibly-different one back — the same "pass the stack as data" idea from Module B04, adapted to what this specific function actually needs.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'timer_switch.asm + schedule.c',
          caption: 'The timer\'s own ISR tail, and the C function deciding which task runs next',
          code: `; ---- isr32 (the timer) — its own tail, not the shared isr_common_stub ----
isr32:
    push dword 0
    push dword 32
    pusha                    ; Task A's registers, saved onto Task A's own stack

    push esp                  ; pass the current (Task A's) stack pointer as data
    call schedule               ; returns the stack pointer to resume — maybe Task B's
    mov esp, eax                  ; THE context switch: point ESP at the returned stack
    add esp, 4                      ; discard the argument this call pushed

    popa                              ; restore registers — from whichever stack ESP now points at
    add esp, 8
    iret                                ; resume execution — Task A's if unchanged, Task B's if switched

// ---- schedule.c ----
typedef struct task {
    uint32_t esp;
    struct task* next;
} task_t;

task_t* current_task;

uint32_t schedule(uint32_t saved_esp) {
    current_task->esp = saved_esp;
    current_task = current_task->next;
    return current_task->esp;
}`,
          annotations: [
            {
              lines: [7, 8, 9],
              label: 'push esp / call schedule / mov esp, eax',
              what: 'Passes the current stack pointer to schedule() as an ordinary argument, then overwrites ESP itself with whatever schedule() returns.',
              why: 'cdecl functions return their result in EAX — this is not new syntax, just the standard calling convention already relied on throughout this course. mov esp, eax is the one instruction in this entire module that is the actual context switch: everything before it operates on whatever stack was already active, and everything after it operates on whatever stack schedule() decided should run next. If current_task didn\'t change inside schedule(), this is a no-op — ESP gets reassigned the same value it already had.',
              note: 'Contrast this with Module B04\'s call isr_handler, which passed a pointer (push esp; call isr_handler) so the C function could read individual fields through a registers_t struct. schedule() never needs to inspect individual registers — it only needs the raw stack address as a value, and only needs to hand back a (possibly different) raw address in return. Passing by value instead of by pointer here isn\'t a stylistic choice; it\'s because the job is different.',
            },
            {
              lines: [24, 25, 26],
              label: 'current_task->esp = saved_esp; current_task = current_task->next; return current_task->esp;',
              what: 'Records where the just-interrupted task\'s stack ended up, advances to the next task in a round-robin ring, and hands back that task\'s saved stack pointer.',
              why: 'This is Module 3\'s round-robin algorithm, described there in prose and now genuinely running: current_task->next is a fixed ring every task was linked into when created, and each timer tick advances exactly one step around it. Nothing here decides how long a task runs — that was already decided the moment Module B05\'s PIT was configured to interrupt at a fixed rate. This function only ever answers one question: given that a tick just happened, whose turn is it now?',
              note: null,
            },
          ],
        },
        {
          type: 'connection-bridge',
          concept: 'Switching Stacks Instead of Copying State',
          coreIdea: 'When an execution context is already entirely represented by "everything reachable from one stack pointer," switching contexts can be as cheap as reassigning a single pointer, instead of copying anything.',
          connections: [
            { icon: '🧵', domain: 'Userspace green threads and fibers', description: 'Libraries implementing cooperative threads without any OS or hardware interrupt involvement — Lua coroutines, Go\'s goroutines, ucontext-based fibers in C — do exactly this trick manually: swap a stack pointer, let ordinary function-return machinery restore the rest, with no kernel involved at all.' },
            { icon: '🔀', domain: 'setjmp/longjmp-based coroutines', description: 'Older C coroutine libraries built on setjmp/longjmp save and restore a small fixed set of registers, including the stack pointer, to jump between independent call stacks — a userspace-only version of the identical idea this chapter implements with real hardware interrupts.' },
            { icon: '☕', domain: 'Virtual threads (Java, Kotlin)', description: 'Modern lightweight-thread systems suspend and resume execution by capturing and swapping a continuation\'s stack-like state, letting thousands of logical threads share far fewer real OS threads — the same "switch what the stack points at" principle, scaled up and abstracted for a managed runtime.' },
          ],
          punchline: 'You just implemented, in real assembly wired to a real hardware timer, the exact same primitive that userspace coroutine libraries, green-thread runtimes, and virtual-thread systems all reach for when they need cheap, frequent context switching: don\'t copy state around, just change which stack you\'re standing on.',
        },
      ],
    },
    {
      id: 'bootstrapping-a-task',
      title: 'Starting a Task That Was Never Interrupted',
      number: '04',
      color: '#16a34a',
      blocks: [
        {
          type: 'text',
          content: `One problem remains: popa and iret assume the stack they're reading from already looks like a genuine interrupt frame — Module B04's exact registers_t layout, built by a real pusha and real CPU-pushed EFLAGS/CS/EIP. A brand new task has never been interrupted. Its stack is empty. The fix is to build a fake interrupt frame by hand, field by field, matching Module B04's layout exactly, so that the very first time this task is switched to, popa and iret can't tell the difference from a real one.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'task_create.c',
          caption: 'Manually constructing a stack that looks exactly like Module B04\'s registers_t, for a task that never actually ran yet',
          code: `task_t* task_create(void (*entry)(void), uint32_t* stack_top) {
    task_t* t = kmalloc(sizeof(task_t));

    *(--stack_top) = 0x202;             // EFLAGS (interrupts enabled)
    *(--stack_top) = 0x08;               // CS — kernel code selector
    *(--stack_top) = (uint32_t) entry;    // EIP — where this task starts running

    *(--stack_top) = 0;                    // dummy error code
    *(--stack_top) = 32;                    // interrupt number

    for (int i = 0; i < 8; i++) {
        *(--stack_top) = 0;                  // eax, ecx, edx, ebx, esp_unused, ebp, esi, edi
    }

    t->esp = (uint32_t) stack_top;
    return t;
}`,
          annotations: [
            {
              lines: [4, 5, 6],
              label: '*(--stack_top) = 0x202; ... = 0x08; ... = (uint32_t) entry;',
              what: 'Pushes fake EFLAGS, CS, and EIP values onto the new task\'s stack, in the exact order the real CPU would have pushed them during a genuine interrupt.',
              why: '--stack_top decrements the pointer first, then writes through it — manually reproducing what push does in assembly, since a stack that grows downward means each new value sits at a lower address than the last (Module P03\'s stack chapter). EIP is set to entry, the task\'s actual starting function — this single field is what makes iret later jump into this task\'s code for the very first time, instead of resuming anything that "really" ran before.',
              note: '0x202 is EFLAGS with the interrupt-enable bit set — starting a task with interrupts disabled would mean it could never itself be preempted, breaking round-robin fairness the instant it started running. 0x08 is the kernel code segment selector from Module P04\'s GDT, the same selector every kernel-mode interrupt handler already runs with.',
            },
            {
              lines: [11, 12, 13],
              label: 'for (int i = 0; i < 8; i++) { *(--stack_top) = 0; }',
              what: 'Pushes eight zeroed values, standing in for the eight registers a real pusha would have saved.',
              why: 'This task never actually had meaningful register values — it hasn\'t run a single instruction yet — so zero is as good a placeholder as any. What matters is only the count and position: exactly eight values, in exactly the position Module B04\'s registers_t struct expects eax through edi to occupy, so that the first popa this task ever experiences pops eight harmless zeros instead of misreading whatever happens to be on the stack.',
              note: null,
            },
            {
              lines: [16],
              label: 't->esp = (uint32_t) stack_top;',
              what: 'Records the final, fully-decremented stack pointer as this task\'s saved ESP.',
              why: 'This is the exact value schedule() will eventually return for this task, and the exact value that gets mov esp, eax\'d into the real ESP register the first time this task is switched to. From that point forward, popa and iret run against this hand-built frame exactly as if it were a real one — and this task genuinely cannot tell it was never actually interrupted.',
              note: null,
            },
          ],
        },
        {
          type: 'simulator',
          id: 'cpu-scheduler-sim',
          caption: 'Module 3\'s round-robin scheduler, simulated then — now backed by exactly this chapter\'s real esp-swapping mechanism',
        },
        {
          type: 'explicit-insight',
          text: 'A "task" in this kernel is nothing more than one saved number — a stack pointer — plus everything reachable by walking that stack. Creating a task means hand-building a stack that lies convincingly about having already been interrupted. Switching tasks means changing which lie the CPU is about to believe. There is no other magic underneath Module 3\'s scheduler than this.',
        },
        {
          type: 'socratic',
          question: 'Suppose task_create() built its fake frame with only 7 zeroed values instead of 8, one short of what registers_t expects. What would actually happen the first time this task is switched to?',
          options: [
            'Nothing — popa always pops exactly 8 registers, so a missing ninth value has no effect',
            'popa would pop 8 values as always, but the 8th one would actually be the dummy error code or interrupt number meant for a later pop, and the subsequent add esp, 8 and iret would then read the wrong values for EIP, CS, and EFLAGS — very likely crashing or jumping to a garbage address',
            'The kernel would detect the mismatch and refuse to switch to this task',
          ],
          answer: 1,
          explanations: [
            'popa itself always pops exactly 8 values regardless of what\'s actually there — it has no way to detect that one fewer value than intended was pushed. The danger is precisely that it keeps going, misreading whatever comes next as if it were correct.',
            'Exactly right. Every value on this hand-built stack only means what Module B04\'s registers_t says it means because of its exact position — one missing value shifts everything after it by one slot. popa would read 7 genuine zeros and then one value meant to be the error code, believing it to be the 8th register. Everything downstream — the error code cleanup, and critically EIP, CS, and EFLAGS for iret — would then be off by exactly one field, very likely sending execution to a nonsensical address.',
            'Neither popa nor iret perform any structural validation of what they\'re reading — this is exactly the same "a struct is only as correct as its layout matches real memory" lesson from Module B04, now shown as a hazard in constructing that memory by hand rather than just reading it.',
          ],
        },
        {
          type: 'checkpoint',
          label: 'Checkpoint: Two Tasks, Actually Alternating',
          command: 'task_create(task_a_entry, stack_a + 4096);\ntask_create(task_b_entry, stack_b + 4096);\n// each entry function just loops printing its own letter',
          output: `AAAAABBBBBAAAAABBBBBAAAAABBBBB...`,
          note: 'Each run of the same letter is roughly one PIT tick\'s worth of instructions — Module B05\'s 100 Hz heartbeat, made visible. If you see one letter print forever and the other never appears, current_task->next almost always isn\'t forming a real ring back to the first task.',
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'pusha already ran', sublabel: 'Module B04\'s stub — register saving was never the missing piece' },
      { label: 'push esp; call schedule', sublabel: 'The stack pointer, passed as data, not a pointer this time' },
      { label: 'current_task->next', sublabel: 'Module 3\'s round-robin, genuinely running now' },
      { label: 'mov esp, eax', sublabel: 'The entire context switch, in one instruction' },
      { label: 'popa; iret', sublabel: 'The same tail from Module B04 — now reading a different task\'s stack' },
      { label: 'task_create()\'s fake frame', sublabel: 'A stack that convincingly lies about having been interrupted before' },
    ],
    finalInsight: 'Module 3 asked you to trust that cpu_context_t, saved and restored, was the entire mechanism behind multitasking. It was never lying — it was simplified. The real version is exactly as small as that promise suggested: one saved number per task, one instruction that reassigns it, and a save/restore mechanism you had already built for an entirely different reason back in Module B04. Nothing else is happening, on this kernel or on the machine you\'re reading this on right now.',
    nextChapter: 'Next: your kernel can now genuinely run more than one task — but none of them can hear you type. Module B09 builds the keyboard driver, catching IRQ1 for the first time and turning raw scancodes into characters your tasks can actually read.',
  },
}

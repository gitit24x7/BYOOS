// b10_shell.js — Bring-Up 10: Your First Shell
export const b10 = {
  id: 'B10',
  title: 'Your First Shell',
  subtitle: 'Every piece exists now. This is where they stop being separate modules and become an operating system.',
  estimatedMinutes: 35,

  mystery: {
    type: 'mystery',
    lines: [
      'You can talk to hardware ports, boot under GRUB, handle interrupts safely, tick a timer,',
      'map real memory, allocate it, switch between tasks, and read a keyboard.',
      'None of that is a shell yet. It is nine separate capabilities sitting next to each other.',
      'What is the smallest loop that turns all nine into something that feels like an operating system?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Line Every Hobby OS Project Is Judged By',
      number: '01',
      color: '#fbbf24',
      blocks: [
        {
          type: 'history',
          content: `Walk through the osdev.org community — the same wiki Module P07 pointed you toward for setting up your own toolchain — and one phrase comes up constantly as the recognized milestone: "boots to a shell." Not "prints hello world." Not "boots without crashing." A kernel that can show a prompt, read a typed command, and respond to it is treated as the line between a proof-of-concept and something a person could actually sit down and use.

That's not an arbitrary bar. A working shell is the first point where every subsystem a kernel needs has to cooperate simultaneously: interrupts, a timer, memory, a scheduler, and input, all running at once, correctly, or the illusion breaks immediately and visibly. This module is you crossing that exact line — not by building anything new, but by finally wiring together everything Modules B01 through B09 already built.`,
        },
      ],
    },
    {
      id: 'the-nine-pieces',
      title: 'Nothing New. Only Integration.',
      number: '02',
      color: '#fbbf24',
      blocks: [
        {
          type: 'text',
          content: `Every mechanism this shell depends on already exists. Module B01 gave it outb()/inb(). Module B02 got it loaded by GRUB in the first place. Module B03 made sure its interrupts land on safe vectors. Module B04 made it safe for any interrupt to reach C code at all. Module B05 gives it a timer to measure uptime with. Module B06 gives every one of its allocations a real, paged address. Module B07 gives it kmalloc() and kfree(). Module B08 means this shell can run as one task among others, preemptible like anything else. Module B09 is where every character it reads actually comes from.

The shell itself adds exactly one new idea: a loop that reads a character, decides what to do with it, and prints a response — a read-eval-print loop, the same shape as Module 5's original Unix shell, just running here in kernel space instead of user space, because this course deliberately deferred Ring 3 to a later, harder phase.`,
        },
      ],
    },
    {
      id: 'the-shell-loop',
      title: 'The Loop Itself',
      number: '03',
      color: '#f59e0b',
      blocks: [
        {
          type: 'code',
          language: 'c',
          filename: 'shell.c',
          caption: 'Read a line from Module B09\'s buffer, dispatch it, print a response, repeat — forever',
          code: `static int k_streq(const char* a, const char* b) {
    while (*a && *b) {
        if (*a != *b) return 0;
        a++; b++;
    }
    return *a == *b;
}

void shell_execute(const char* line) {
    if (line[0] == 0) return;

    if (k_streq(line, "help")) {
        vga_puts("commands: help, clear, uptime, meminfo\\n");
    } else if (k_streq(line, "clear")) {
        vga_clear(COLOR_WHITE);
    } else if (k_streq(line, "uptime")) {
        vga_puts("ticks since boot: ");
        vga_put_uint(timer_ticks);
        vga_putchar('\\n');
    } else {
        vga_puts("unknown command: ");
        vga_puts(line);
        vga_putchar('\\n');
    }
}

void shell_task(void) {
    char line[128];
    int pos = 0;
    vga_puts("byoos> ");

    while (1) {
        char c = kb_buffer_pop();
        if (c == 0) continue;

        if (c == '\\n') {
            line[pos] = 0;
            vga_putchar('\\n');
            shell_execute(line);
            pos = 0;
            vga_puts("byoos> ");
        } else if (pos < (int) sizeof(line) - 1) {
            line[pos++] = c;
            vga_putchar(c);
        }
    }
}`,
          annotations: [
            {
              lines: [1, 2, 3, 4, 5, 6],
              label: 'static int k_streq(const char* a, const char* b) { ... }',
              what: 'A hand-written string comparison — walks both strings together, returning false the instant the characters diverge, true if both hit their null terminator at the same position.',
              why: 'This is Module P02\'s exact k_strlen()/k_memset() pattern, one more time: strcmp() is a standard library function, and this kernel still has no standard library. Building the one string function this chapter actually needs, in six lines, costs less than pulling in a dependency this freestanding environment was never going to have anyway.',
              note: null,
            },
            {
              lines: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
              label: 'shell_execute()',
              what: 'Compares the completed line against a small set of known commands and prints a response for whichever one matches.',
              why: 'vga_puts, vga_clear, and vga_putchar are Module P02\'s original freestanding VGA functions, unchanged since that chapter — the shell doesn\'t need new output code, only new decisions about what to output. timer_ticks is a counter Module B05\'s or B08\'s timer ISR increments on every tick, read here for the first time by something other than the scheduler itself.',
              note: 'This dispatch is a chain of if/else comparisons — completely reasonable for four commands, and exactly how the earliest real Unix shells worked too. A shell with dozens of built-in commands would typically switch to a lookup table of name-to-function pairs instead, the same array-as-dispatch idiom Module B09\'s scancode table already used, just mapping strings to functions instead of numbers to characters.',
            },
            {
              lines: [22, 23, 24, 25],
              label: 'char line[128]; int pos = 0; vga_puts("byoos> ");',
              what: 'A fixed-size buffer for the line currently being typed, and the very first prompt, printed once before the loop begins.',
              why: 'This is a plain local array, not a kmalloc()\'d allocation — a single 128-byte buffer that lives for this task\'s entire lifetime doesn\'t need Module B07\'s heap at all. The heap exists for allocations whose size or lifetime isn\'t known until runtime; a fixed prompt buffer is exactly the case where a plain array remains the right tool.',
              note: null,
            },
            {
              lines: [28, 29],
              label: 'char c = kb_buffer_pop(); if (c == 0) continue;',
              what: 'Repeatedly asks Module B09\'s ring buffer for the next character, looping again immediately if nothing has been typed yet.',
              why: 'This is deliberate busy-waiting: the shell task spins in a tight loop, constantly re-checking an empty buffer, rather than going to sleep and being woken only when a key arrives. It works correctly — Module B08\'s scheduler preempts this task on every timer tick exactly like any other, so it never blocks the rest of the system — but it wastes CPU time checking an empty buffer thousands of times a second. A more advanced kernel would put this task to sleep on an empty buffer and have Module B09\'s keyboard handler wake it directly; this chapter leaves that optimization out on purpose, the same honestly-stated simplification this course has made at nearly every stage.',
              note: null,
            },
          ],
        },
        {
          type: 'simulator',
          id: 'kernel-shell-sim',
          caption: 'A real, typeable shell — try help, uptime, meminfo, echo, or anything unrecognized',
        },
        {
          type: 'socratic',
          question: 'shell_task()\'s busy-wait loop checks kb_buffer_pop() constantly, thousands of times per second, even when nothing is being typed. Given Module B08\'s scheduler, why does this never prevent other tasks from running?',
          options: [
            'It doesn\'t actually run thousands of times per second — the CPU automatically slows the loop down when the buffer is empty',
            'Module B08\'s timer-driven preemption doesn\'t ask whether a task is "doing something useful" — it interrupts whichever task is running, unconditionally, on every tick, so the shell task gets preempted exactly like any other task regardless of how it spends its time slice',
            'The shell task is given lower priority than other tasks specifically because it busy-waits, so the scheduler compensates automatically',
          ],
          answer: 1,
          explanations: [
            'Nothing in this design throttles the loop — it genuinely does re-check the buffer as fast as the CPU can execute the check, every time it gets a turn to run. The reason this is still safe has nothing to do with the loop slowing down.',
            'Exactly right, and this is the payoff of Module B08\'s design specifically. The timer interrupt fires on a fixed schedule no matter what any task is doing, and schedule() advances to the next task in the ring regardless of whether the current one was "productive." A busy-waiting shell wastes its own time slice, but it can never starve any other task of theirs — preemption is unconditional, which is exactly the property that makes an inefficient task merely wasteful rather than dangerous.',
            'This chapter\'s round-robin scheduler (Module B08, built from Module 3\'s algorithm) has no concept of priority or of adjusting behavior based on what a task is doing — every task gets an equal turn, in a fixed order, regardless of how it spends it.',
          ],
        },
      ],
    },
    {
      id: 'closing-the-loop',
      title: 'What Was Deliberately Left Out',
      number: '04',
      color: '#eab308',
      blocks: [
        {
          type: 'callout',
          variant: 'info',
          content: 'This shell runs entirely in Ring 0 — the same privilege level as the kernel itself. Real shells run in Ring 3, asking the kernel for everything through the syscall boundary Module 4 described, with the kernel able to refuse or limit what a shell (or anything it launches) can do. That crossing — building a real Ring 3, a TSS, and the mechanism to safely enter and leave user mode — was explicitly scoped out of this track from the very first planning conversation, as the next harder phase. Everything in this module is genuinely how a kernel-mode shell works; it\'s just not yet the isolated, safer version a production OS would ship.',
        },
        {
          type: 'connection-bridge',
          concept: 'The Read-Eval-Print Loop',
          coreIdea: 'Read one unit of input, decide what it means, act on it, print a result, and do it again — the same shape whether the input is a line of shell commands or something else entirely.',
          connections: [
            { icon: '🐍', domain: 'Python\'s REPL', description: 'Typing python with no arguments drops you into the exact same loop shape as this chapter\'s shell_task(): read a line, evaluate it, print the result, repeat — Python\'s version just evaluates expressions instead of matching a fixed command list.' },
            { icon: '🗄️', domain: 'Database CLIs (psql, mysql)', description: 'A database command-line client is a REPL specialized for one thing: read a query, send it to the database, print the result set, wait for the next one — structurally identical to this chapter\'s loop, with a database connection standing in for kb_buffer_pop().' },
            { icon: '🔧', domain: 'git\'s subcommand dispatch', description: 'git status, git commit, and every other git invocation are resolved by matching the first word against a table of known subcommands — the exact if/else (or, at larger scale, lookup-table) dispatch shell_execute() performs here, just with many more branches.' },
          ],
          punchline: 'You didn\'t just build a kernel shell — you built the same fundamental loop behind every REPL, every database client, and every command-line tool with subcommands. The loop was never the hard part. Everything Module B01 through Module B09 built was what made a loop this simple actually work on real hardware.',
        },
        {
          type: 'what-this-means',
          text: 'Type "uptime" into this chapter\'s simulator and press enter, and trace what that single action actually required: Module B09\'s scancode table turning your keystrokes into characters, Module B04\'s stub making every one of those keystrokes safe to handle, Module B03\'s remap making sure IRQ1 never collided with anything else, Module B08\'s scheduler giving the shell task turns to notice what was typed, Module B05\'s timer both driving that scheduler and answering the question you asked, and Module B06 and B07 underneath all of it, giving every piece of this its own real, allocated, mapped memory. Nine modules, cooperating, for one command.',
        },
        {
          type: 'socratic',
          question: 'Of the nine modules this chapter integrates (B01–B09), which one is the only one shell_task() and shell_execute() never call into directly, even though the whole system still depends on it running correctly in the background?',
          options: [
            'Module B09 (the keyboard driver) — shell_task() never calls it directly',
            'Module B05 (the PIT) — shell_task() never calls it directly, but relies entirely on Module B08\'s scheduler (which the PIT drives) to keep getting turns to run at all',
            'Module B02 (the Multiboot header) — its job was already finished before shell_task() ever started running, and nothing in the shell touches it again',
          ],
          answer: 2,
          explanations: [
            'shell_task() calls kb_buffer_pop() directly, every single iteration of its loop — Module B09 is one of the two modules (alongside the VGA functions) this shell interacts with most directly.',
            'shell_execute() does call vga_put_uint(timer_ticks) for the "uptime" command, reading a value the PIT\'s ISR maintains — so while the shell doesn\'t call the PIT\'s own setup function, it does directly consume something the PIT produces.',
            'Exactly right. Module B02\'s Multiboot header did its entire job — proving to GRUB that this kernel was trustworthy enough to load — before a single instruction of shell_task() ever executed, and nothing in this chapter\'s code references it again. It\'s the one module in the whole Bring-Up track whose job is entirely, permanently finished by the time the system you\'re now using is even running.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'B01–B09, cooperating', sublabel: 'Nothing new — every mechanism already existed' },
      { label: 'kb_buffer_pop()', sublabel: 'One character at a time, from Module B09' },
      { label: 'A line, built up', sublabel: 'Echoed through Module P02\'s original vga_putchar()' },
      { label: 'shell_execute()', sublabel: 'k_streq() dispatch — the same "build it yourself" ethos since Module P02' },
      { label: 'A response printed', sublabel: 'Sometimes reading Module B05\'s own timer_ticks' },
      { label: 'The prompt returns', sublabel: 'Forever — preempted by Module B08 on every tick, like anything else' },
    ],
    finalInsight: 'This is the actual, complete answer to the question this entire Bring-Up track opened with: what does it take to build the simplest real operating system? Nine mechanisms, each one genuinely necessary, none of them optional, wired together by a loop simple enough to read in thirty seconds. You did not simulate any of this. Every module in this track produced real code, and this chapter is the moment all of it runs together, at once, as one system.',
    nextChapter: 'Every mechanism now exists, verified one chapter at a time — but no chapter has shown you all nine sitting in one real directory, built by one real command, in the one order that actually boots. Module B11 is that missing piece: the complete file tree, the real kernel_main() wiring everything together, the extended Makefile, and the honest list of what breaks when the order is wrong.',
  },
}

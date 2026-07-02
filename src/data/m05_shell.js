// m05_shell.js — Module 5: The First App
export const m05 = {
  id: 'M05',
  title: 'The First App',
  subtitle: 'fork() + exec() = every program ever launched on a Unix system.',
  estimatedMinutes: 35,

  mystery: {
    type: 'mystery',
    lines: [
      'The first useful program written for UNIX was a shell.',
      'It is 50 lines of C.',
      'Every app you launch — every terminal command,',
      'every GUI program, every background service —',
      'still goes through the exact same mechanism it used.',
      'What is that mechanism?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Bootstrap Problem of Programs',
      number: '01',
      color: '#fbbf24',
      blocks: [
        {
          type: 'history',
          content: `It is 1971. UNIX is running on a PDP-11 at Bell Labs. The OS boots, the kernel initializes — and then what? Something has to be the first user-space program. Something has to be the ancestor of everything else that runs.

Ken Thompson wrote a program called "sh" — the first shell. It is a loop: read a command from the user, run the program the user asked for, wait for it to finish, repeat. But there was a deep problem: how does one program launch another? The kernel is running, but there is no "spawn a new process" operation in the traditional sense.

Thompson invented a two-step mechanism that remains the foundation of every UNIX process launch today: fork() + exec(). fork() copies the current process. exec() replaces the copy with a new program. Together, they create a new process running a new program — and every shell, every GUI launcher, every cron job, every web server still uses this exact mechanism 50 years later.`,
        },
      ],
    },
    {
      id: 'fork',
      title: 'fork(): The Process That Copies Itself',
      number: '02',
      color: '#fbbf24',
      blocks: [
        {
          type: 'text',
          content: 'fork() is one of the strangest function calls in programming. Here is what it does:\n\n**It creates an exact copy of the calling process.** Same code. Same memory. Same file descriptors. Same register values. Same stack. Same heap. Everything.\n\nAfter fork() returns, there are **two processes** running the same code at the same point. The only difference: fork() returns **0 to the child** and the **child\'s PID to the parent**.\n\nThis means the same line of code after fork() is executed by both processes simultaneously — and the return value is the only way to know which one you are.\n\nThis is deeply weird the first time you encounter it. A function that returns twice. To two different processes. At the same time. Let that sink in for a moment.',
        },
        {
          type: 'code',
          language: 'c',
          filename: 'fork_demo.c',
          caption: 'fork() in action — one call, two processes, the same code running in both',
          code: `#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    printf("Before fork: I am process %d\\n", getpid());

    pid_t child_pid = fork();   // ← THE MAGIC LINE

    if (child_pid == 0) {
        // ---- CHILD PROCESS ----
        // fork() returned 0 to us.
        // We are the copy.
        printf("Child:  I am process %d, my parent is %d\\n",
               getpid(), getppid());
        // Child does its work here...

    } else if (child_pid > 0) {
        // ---- PARENT PROCESS ----
        // fork() returned the child's PID to us.
        // We are the original.
        printf("Parent: I am process %d, I spawned child %d\\n",
               getpid(), child_pid);

        // Wait for the child to finish.
        int status;
        waitpid(child_pid, &status, 0);
        printf("Parent: child %d has exited\\n", child_pid);

    } else {
        // fork() returned -1: error
        perror("fork failed");
        return 1;
    }

    return 0;
}`,
          annotations: [
            {
              lines: [8],
              label: 'pid_t child_pid = fork()',
              what: 'Asks the kernel to create an exact duplicate of the current process.',
              why: 'This is the only way to create a new process on UNIX. The kernel copies the calling process\'s page table (using copy-on-write to avoid actually copying all memory immediately), duplicates its file descriptors, and creates a new PCB for the child. The child starts running at the instruction immediately after fork() — the same place the parent is.',
              note: 'fork() is surprisingly cheap due to copy-on-write (COW). The kernel doesn\'t actually copy any memory pages immediately — it just marks all shared pages as read-only. When either the parent or child writes to a page, THEN the kernel makes a copy of that specific page. If exec() follows fork() immediately (as in a shell), most pages are never written to — so fork()+exec() copies almost nothing.',
            },
            {
              lines: [10, 11, 12, 13, 14, 15, 16],
              label: 'if (child_pid == 0) — Child branch',
              what: 'Code that only runs in the child process. fork() returns 0 to the child.',
              why: 'The child needs to know it\'s the child. Returning 0 is the signal: "you are the copy." The child typically then calls exec() to replace itself with a new program. Everything before this if() block has already been copied — including all the parent\'s memory, open files, and the fork() call itself.',
              note: 'getpid() returns the current process\'s PID. getppid() returns the parent\'s PID. Notice: after fork(), the child\'s parent is the process that called fork(). If the parent dies before the child, the child is "reparented" — adopted by init (PID 1), the original ancestor of all processes.',
            },
            {
              lines: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
              label: 'else if (child_pid > 0) — Parent branch',
              what: 'Code that only runs in the parent. fork() returns the child\'s PID to the parent.',
              why: 'The parent needs the child\'s PID to be able to wait for it, signal it, or kill it. The parent typically calls waitpid() to wait for the child to finish — if it doesn\'t, the child becomes a "zombie process" (its PCB stays allocated even after it exits, because the OS is waiting for the parent to collect the exit status).',
              note: 'A zombie process is a real thing on Unix. Run "ps aux" and you might see "Z" in the status column. It means the process has exited but the parent hasn\'t called wait() yet. Zombie processes don\'t use CPU or memory — only their PCB entry. But too many zombies can exhaust the process table.',
            },
            {
              lines: [24, 25, 26, 27],
              label: 'waitpid(child_pid, &status, 0)',
              what: 'Blocks the parent until the child process exits, then collects its exit status.',
              why: 'Without waitpid(), the child becomes a zombie after it exits (its PCB stays allocated waiting for the exit status to be collected). The parent must "reap" its children. This is also why your shell waits for a command to finish before showing the next prompt — it calls waitpid() on the child process it just forked.',
              note: 'The 0 as the third argument means "block until the child exits." You can also pass WNOHANG to return immediately if the child hasn\'t exited yet, letting the parent do other work while the child runs — useful for background jobs in a shell.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'insight',
          content: 'Here is the most important thing to understand about fork(): after the call, TWO processes are running. Both continue executing from the same point in the same code. The return value is the only difference between them. This is not a subtle distinction — it is the entire mechanism. The reason fork() returns twice is because it runs in two processes simultaneously.',
        },
        {
          type: 'socratic',
          question: 'Copy-on-write means fork() doesn\'t actually duplicate a process\'s memory pages immediately — it just marks them shared and read-only. If the child writes to a global variable one instruction after fork() returns, does the parent see that change?',
          options: [
            'Yes — parent and child keep sharing the same physical memory until exec() is called',
            'No — the instant either process writes to a shared page, the kernel copies that specific page for the writer; the parent\'s page is untouched and still holds the old value',
            'It depends on whether the variable was declared static',
          ],
          answer: 1,
          explanations: [
            'If they kept sharing writable memory, fork() wouldn\'t give you two independent processes — it would give you two threads with extra overhead. That defeats the entire point of "two separate processes."',
            'Exactly right. Copy-on-write is a performance trick, not a change in what fork() promises: two fully independent copies. The kernel just delays the actual copying until the last possible moment — the first write. The moment the child writes to that page, the kernel intercepts it, makes a private copy for the child, and the parent keeps its original untouched page. From the outside, it behaves exactly as if fork() copied everything upfront — it\'s just faster.',
            'Storage class (static vs. automatic) affects where a variable lives in memory, not whether copy-on-write applies to its page. COW operates on memory pages, not on individual variables or their declarations.',
          ],
        },
      ],
    },
    {
      id: 'exec',
      title: 'exec(): Becoming a New Program',
      number: '03',
      color: '#ff8c42',
      blocks: [
        {
          type: 'text',
          content: 'fork() creates a copy. But you usually don\'t want a copy of the shell — you want to run `ls` or `python` or `chrome`. That\'s what exec() is for.\n\n**exec() replaces the current process with a new program.** It loads a new executable from disk, replaces the current process\'s memory, stack, and code with the new program\'s, and starts executing it from its main(). The PID stays the same. The process is the same entity — but everything inside it has been replaced.\n\nHere\'s the key insight: **exec() does not create a new process**. It transforms the current one. That\'s why fork()+exec() is a two-step dance: fork() creates a new process by copying the current one, then exec() transforms that copy into the program you actually want to run.',
        },
        {
          type: 'code',
          language: 'c',
          filename: 'fork_exec.c',
          caption: 'The shell\'s core loop — fork(), exec(), and wait() creating every program launch',
          code: `#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>
#include <string.h>

// A minimal shell — the essence of every terminal emulator
void run_shell() {
    char command[256];

    while (1) {
        printf("mysh$ ");
        fflush(stdout);

        if (!fgets(command, sizeof(command), stdin)) break;
        command[strcspn(command, "\\n")] = 0;  // strip newline

        if (strcmp(command, "exit") == 0) break;

        pid_t pid = fork();              // Step 1: copy this process

        if (pid == 0) {
            // We are the child. Replace ourselves with the command.
            char* argv[] = { command, NULL };
            execvp(command, argv);       // Step 2: become the program

            // If we get here, exec() failed (command not found, etc.)
            fprintf(stderr, "mysh: command not found: %s\\n", command);
            _exit(127);                  // Exit child — don't return to shell loop

        } else if (pid > 0) {
            // We are the parent (the shell). Wait for the child.
            int status;
            waitpid(pid, &status, 0);   // Step 3: wait for it to finish
        }
    }
}

int main() {
    printf("mysh — a minimal shell\\n");
    run_shell();
    return 0;
}`,
          annotations: [
            {
              lines: [9, 10, 11, 12, 13, 14],
              label: 'while(1) — the shell loop',
              what: 'The infinite loop that makes a shell: print prompt, read command, execute, repeat.',
              why: 'Every terminal shell — bash, zsh, fish, PowerShell — is fundamentally this loop. The sophistication of a real shell (tab completion, job control, pipes, redirection, history) is built around this same core: read a command, fork a child to run it, wait for the child.',
              note: null,
            },
            {
              lines: [18],
              label: 'pid_t pid = fork()',
              what: 'Creates a child process that is an exact copy of the shell.',
              why: 'The shell must create a new process to run the command — it cannot replace itself (it would cease to exist). fork() gives it a copy that it can then transform into the command via exec(). If fork() fails (system is out of process slots), the shell cannot run the command.',
              note: null,
            },
            {
              lines: [22, 23],
              label: 'execvp(command, argv)',
              what: 'Replaces the child process (the shell copy) with the requested program.',
              why: 'execvp searches PATH for the executable, loads it from disk, replaces the child\'s code/data/stack with it, and starts executing it from its main(). The child was a shell copy one moment ago. After exec(), it IS the requested program — same PID, completely different code running.',
              note: 'The "p" in execvp means it searches PATH (like typing a command in your shell without giving a full path). Other variants: execl (explicit arg list), execv (array of args), execve (explicit environment), execle (arg list + environment). All ultimately call the execve() system call.',
            },
            {
              lines: [26, 27],
              label: '_exit(127) — after exec fails',
              what: 'If execvp() returns at all, it failed. The child exits with code 127 ("command not found").',
              why: 'execvp() only returns if exec fails — if the command doesn\'t exist or isn\'t executable. A successful exec() never returns because the child\'s code has been replaced. So any code after execvp() is always "exec failed" code. We must _exit() here — not return, and not exit() — because _exit() avoids running C library cleanup (like flushing stdio buffers that belong to the parent).',
              note: 'Exit code 127 is the POSIX-standard "command not found" exit status. If you\'ve ever seen "127" in a CI/CD log or a bash $? check, this is exactly where it comes from.',
            },
            {
              lines: [31, 32, 33],
              label: 'waitpid(pid, &status, 0)',
              what: 'The shell waits here until the child process (the command) finishes.',
              why: 'This is why your shell shows a new prompt only after your command finishes. The parent (shell) is blocked in waitpid(). When you run a command with & (background), the shell skips waitpid() and immediately shows the next prompt — but it must later collect the child\'s exit status to avoid zombies.',
              note: 'The exit status in &status contains both the exit code (0 = success, non-zero = error) and how the process exited (normally vs. killed by a signal). WEXITSTATUS(status) extracts the exit code. WIFSIGNALED(status) tells you if a signal killed it. WTERMSIG(status) says which signal.',
            },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'fork() + exec() is the mechanism behind every program launch in Unix history. When you double-click an app, your desktop environment calls fork() then exec(). When you type "python script.py" in a terminal, the shell calls fork() then exec(). When Linux boots and starts systemd (PID 1), and systemd launches your SSH daemon, it calls fork() then exec(). This two-step dance — copy yourself, then transform the copy into a different program — is the universal process-creation pattern of Unix. It has been running the same way since 1971.',
        },
        {
          type: 'socratic',
          question: 'exec() replaces the child\'s code, memory, and stack — but it does NOT close the child\'s open file descriptors. Why does that specific detail matter for how a shell implements something like `ls > output.txt`?',
          options: [
            'It doesn\'t matter — exec() always resets every process back to the default stdin/stdout/stderr',
            'Because the shell can redirect stdout to output.txt in the forked child, before calling exec() — and since exec() preserves file descriptors, ls inherits that redirected stdout without ever knowing a redirect happened',
            'File descriptors are tied to the PID, and since exec() keeps the same PID, that alone is what preserves them — it has nothing to do with exec()\'s own behavior',
          ],
          answer: 1,
          explanations: [
            'If exec() reset file descriptors to defaults, redirection (>, <, 2>) would be impossible to implement this way — and yet every real shell does exactly this. The premise here is backwards.',
            'Exactly right, and this is the trick every real shell relies on. In the forked child, before calling execvp(), the shell closes fd 1 (stdout) and reopens it pointing at output.txt. Then it calls execvp("ls", ...). Because exec() only replaces code and memory — not open file descriptors — the new ls process starts up with fd 1 already pointing at the file. ls just calls write() to "stdout" like normal, having no idea it\'s writing to a file instead of your terminal.',
            'PID stability is real, but it\'s not the mechanism — file descriptors are a per-process kernel table that exec() specifically chooses not to touch. It\'s a deliberate design decision in what exec() replaces and what it leaves alone, not an accidental side effect of keeping the same PID.',
          ],
        },
      ],
    },
    {
      id: 'process-tree',
      title: 'The Family Tree: Every Process Has a Parent',
      number: '04',
      color: '#4ade80',
      blocks: [
        {
          type: 'text',
          content: 'Every process on a Unix system was created by fork(). Every process has a parent. This creates a tree — and the tree has one root: **PID 1**.\n\nWhen Linux boots, the kernel initializes hardware and virtual memory, then manually creates one single user-space process by directly loading its code into memory — not via fork()+exec(), because there is no parent process yet. That process is **init** (or **systemd** on modern Linux). PID 1.\n\nFrom PID 1, every other process on the system descends. PID 1 forks to create system services. Those services fork to handle requests. Your terminal emulator was forked from your desktop environment. Your shell was forked from the terminal. The command you just ran was forked from the shell.\n\nRun this right now in your terminal: `pstree`. You will see your entire process family tree, rooted at init/systemd.',
        },
        {
          type: 'simulator',
          id: 'fork-tree-sim',
          caption: 'Process Tree — watch processes being born from fork() and dying, rooted at init (PID 1)',
        },
        {
          type: 'what-this-means',
          text: 'Every program currently running on your computer — your browser, your text editor, your music player, the background update daemon — is a descendant of PID 1. They are all part of one lineage. When you launch a program, you are adding a branch to this tree. When it exits, that branch is pruned. The tree has been growing since the moment Linux booted, and it will not stop until you shut down.',
        },
        {
          type: 'connection-bridge',
          concept: 'fork() + exec() — Process Creation',
          coreIdea: 'Create a new worker by copying the current context, then replacing the copy with the actual task.',
          connections: [
            { icon: '🌐', domain: 'Web servers (Apache prefork)', description: 'Apache\'s prefork MPM forks the main server process N times at startup. Each child handles HTTP requests independently. If a child crashes (due to a bad PHP script, etc.), the parent just forks a new one. Same fork() + copy-then-specialize pattern.' },
            { icon: '🐍', domain: 'Python multiprocessing', description: 'Python\'s multiprocessing.Process() calls fork() on Unix. The new process starts as a copy of your Python interpreter with all your current variables, then runs your target function. Python\'s "spawn" mode on Windows does fork()+exec() — fork a Python interpreter, exec() it, then pickle/send the function to run.' },
            { icon: '🐳', domain: 'Container runtimes (runc)', description: 'Starting a Docker container calls clone() (Linux\'s fork() variant with namespace isolation) to create a new process with its own PID, filesystem, and network namespace. Then exec() runs the container\'s entrypoint. A container is fundamentally a forked process with extra isolation.' },
            { icon: '🔀', domain: 'Git branching', description: 'Git branches are conceptually the same: fork the codebase state (copy-on-write), work independently in the copy, merge back later. "Branch" is the metaphor. The OS uses the same metaphor because the mechanism really is branching — splitting one thing into two independent versions.' },
          ],
          punchline: 'Docker containers are just forked processes with extra walls. Python multiprocessing is just fork() with a Python interpreter. Apache prefork is just fork() with HTTP request handlers. Every "worker pool" or "process isolation" pattern in software is some variant of fork() + specialize. The kernel invented this in 1971. We keep reinventing it in higher-level abstractions because it is the right answer to "how do I run multiple independent things?"',
        },
        {
          type: 'socratic',
          question: 'When you type "ls -la" in your shell, how many system calls are involved in just launching the ls process (not counting the actual directory listing)?',
          options: [
            'One: execve() to run ls',
            'Two: fork() to create the process, execve() to become ls',
            'Three or more: fork(), then potentially open() + read() to find ls in PATH, then execve()',
          ],
          answer: 2,
          explanations: [
            'exec() alone cannot create a new process — it only replaces the current one. If the shell called exec(), the shell itself would disappear and become ls. That\'s not what you want.',
            'You need at least fork() and exec(), but in practice there are more. exec() itself internally calls open() and read() to load the ls binary, mmap() to set up virtual memory, and more.',
            'Exactly right — and this undersells it. The full sequence: fork() to create a copy of the shell. In the child: open() + read() to stat each directory in PATH looking for "ls". Once found, execve("/bin/ls", ["ls", "-la"], env) to replace the child with ls. Inside execve: open() the binary, read() the ELF header, mmap() the code and data segments, set up the new stack, jump to _start. By the time ls\'s main() runs, dozens of system calls have happened. If you\'ve taken Module P06, that ELF header is exactly the format your own kernel gets linked into — the same sections, the same entry point convention, just read by the kernel here instead of by a bootloader.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'PID 1 (init)', sublabel: 'The root of all processes' },
      { label: 'fork()', sublabel: 'Copy — creates a new process' },
      { label: 'exec()', sublabel: 'Transform — loads a new program' },
      { label: 'Shell reads command', sublabel: 'fork() + exec() for each one' },
      { label: 'Child runs', sublabel: 'Parent waits via waitpid()' },
      { label: 'Child exits', sublabel: 'Parent collects status, repeats' },
    ],
    finalInsight: 'You have now traced the complete ancestry of every process on your computer. They are all descendants of PID 1. Every one of them was created by fork(). Every one of them that runs a different program called exec() to become it. The shell you use every day is a while loop around fork()+exec()+waitpid(). Your entire computing environment — every running program, every background service, every daemon — is a tree of processes created by exactly these two system calls, in exactly this pattern, since 1971.',
    nextChapter: 'You have built the complete mental model of how an operating system works: from the 512-byte bootloader that starts it, through virtual memory that isolates processes, through the scheduler that juggles them, through system calls that let them talk to the kernel, and through fork()+exec() that creates them. Next: every OS you actually use — Linux, Windows, macOS — assembles these same six mechanisms differently. Module 6 shows you how real kernels are architected, and where each one draws the line between "trusted" and "everything else."',
  },
}

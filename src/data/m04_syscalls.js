// m04_syscalls.js — Module 4: The Invisible Wall
export const m04 = {
  id: 'M04',
  title: 'The Invisible Wall',
  subtitle: 'Your code lives in a cage. System calls are the only door out.',
  estimatedMinutes: 25,

  mystery: {
    type: 'mystery',
    lines: [
      'Your C program called printf("Hello\\n").',
      'That string is now on your screen.',
      'But your code never touched the screen.',
      'It passed through 6 different layers to get there,',
      'crossing a security boundary twice.',
      'What were those layers?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Problem With Trusting Programs',
      number: '01',
      color: '#f87171',
      blocks: [
        {
          type: 'history',
          content: `It is 1969. Ken Thompson and Dennis Ritchie are building UNIX. They face a hard question: programs need to do things — write to disk, print to a terminal, open network connections. But programs are written by people, and people make mistakes. Or are malicious. If any program could directly write to any disk block at any time, one buggy program could corrupt the entire filesystem. One malicious program could read any file on the system.

Their solution: create a strict separation between code that runs with full hardware privileges (the kernel) and code that runs without (everything else). When a program needs something dangerous — writing to disk, reading a file, printing to screen — it must ask the kernel. The kernel decides whether to allow it, does the work, and returns the result. The program never touches the hardware directly.

That asking mechanism is a system call. It has been the fundamental security boundary in UNIX since 1969. Your Python script, your web browser, and your C program all use the exact same mechanism today.`,
        },
      ],
    },
    {
      id: 'ring-levels',
      title: 'Ring 0 vs Ring 3: The CPU\'s Two Worlds',
      number: '02',
      color: '#f87171',
      blocks: [
        {
          type: 'text',
          content: 'The CPU hardware enforces two privilege levels. This is not a software convention — it is built into the chip itself.\n\n**Ring 0 — Kernel Mode**: Full hardware access. Can execute any instruction. Can read/write any memory address. Can talk to devices directly. Can change page tables. The OS kernel runs here.\n\n**Ring 3 — User Mode**: Restricted access. Cannot touch I/O ports. Cannot modify page tables. Cannot access memory outside your process\'s virtual address space. Every program you write runs here.\n\nWhen you write a C program and call `printf()`, your code is executing in Ring 3. It cannot touch the screen. It cannot open a file descriptor. It cannot allocate memory from the OS. It can only compute with values already in its registers and memory.\n\nTo do anything that requires hardware access, it must cross the boundary from Ring 3 to Ring 0. That crossing is the system call.',
        },
        {
          type: 'analogy',
          analogy: 'A bank. The customers (Ring 3) can walk in, fill out forms, and make requests at the counter. They cannot go behind the counter. They cannot open the vault. They cannot move money themselves. They hand a request to a teller (Ring 0), who verifies the request, does the work, and hands back the result. The customer never touches the vault.',
          connection: 'Your program is the customer. The kernel is the teller and the vault combined. The system call is the form at the counter. Every interaction between your program and the hardware goes through this counter. The teller (kernel) can reject requests: "You don\'t have permission to read that file." "That memory address doesn\'t belong to you." The wall between Ring 3 and Ring 0 is what makes this security boundary work.',
        },
        {
          type: 'callout',
          variant: 'insight',
          content: 'The x86-64 CPU has four ring levels (0-3), but real operating systems only use two: Ring 0 for the kernel and Ring 3 for everything else. Rings 1 and 2 exist in the hardware but have never been meaningfully used. The hardware boundary between Ring 0 and Ring 3 is enforced electrically — there is no software hack that lets a Ring 3 program pretend to be Ring 0. Privilege escalation vulnerabilities (kernel exploits) are bugs that accidentally let Ring 3 code trigger Ring 0 behavior through flaws in the kernel itself.',
        },
        {
          type: 'socratic',
          question: 'The x86 CPU physically provides four ring levels (0, 1, 2, 3), but every mainstream OS uses only two of them — Ring 0 and Ring 3. Why leave two entire privilege levels on the table?',
          options: [
            'Rings 1 and 2 run instructions slower than Ring 0 and Ring 3, so OS designers avoid them',
            'A clean two-way split — one fully trusted kernel, everything else fully untrusted — solves the real problem; extra intermediate rings would just add complexity without giving OS designers anything they actually needed',
            'Rings 1 and 2 are reserved by Intel and cannot legally be used by operating system vendors',
          ],
          answer: 1,
          explanations: [
            'There\'s no inherent speed penalty baked into Rings 1 and 2 — the hardware executes instructions at the same speed regardless of which ring issues them. Speed isn\'t why they went unused.',
            'Right. The entire security model in this chapter rests on one boundary: trusted code (kernel) vs. untrusted code (everything else). Two rings expresses that perfectly. A third or fourth tier would mean deciding "how much do I trust this code, on a 4-point scale" — and no mainstream OS design ever found a use case where that extra granularity was worth the complexity. Simple, binary trust won.',
            'Nothing legal blocks OS vendors from using Rings 1 and 2 — some old designs (like early OS/2) even experimented with them. They just turned out to be unnecessary given the two-tier trust model that won out.',
          ],
        },
      ],
    },
    {
      id: 'how-syscall-works',
      title: 'The Anatomy of a System Call',
      number: '03',
      color: '#a78bfa',
      blocks: [
        {
          type: 'text',
          content: 'Here is exactly what happens when your program calls `write()` to print to the terminal. Step by step, no hand-waving.\n\n1. **Your code puts the syscall number in the `rax` register.** `write` is syscall 1 on Linux x86-64. Every system call has a number — a fixed table the kernel knows.\n2. **Your code puts the arguments in `rdi`, `rsi`, `rdx`.** For `write`: file descriptor in `rdi`, pointer to data in `rsi`, byte count in `rdx`.\n3. **Your code executes the `syscall` instruction.** This is a special CPU instruction that causes a controlled trap — the CPU switches from Ring 3 to Ring 0, saves your registers, and jumps to the kernel\'s system call handler.\n4. **The kernel runs in Ring 0.** It reads your syscall number from `rax`, validates your arguments (is the pointer valid? does the file descriptor exist?), and does the actual work — in this case, writing bytes to the terminal device.\n5. **The kernel puts the return value in `rax`.** For `write`, this is the number of bytes actually written, or a negative error code.\n6. **The CPU switches back to Ring 3 and resumes your program.** Your program reads the return value from `rax` and continues.\n\nThis entire sequence takes **100–300 nanoseconds** on modern hardware. It happens every time you print, read a file, allocate memory, or open a connection.',
        },
        {
          type: 'code',
          language: 'c',
          filename: 'syscall_demo.c',
          caption: 'printf → write → syscall: tracing the full path from your code to the screen',
          code: `#include <stdio.h>
#include <unistd.h>
#include <string.h>

// ----- Layer 1: Your code -----
void my_program() {
    const char* msg = "Hello from user space!\\n";

    // Option A: printf (goes through 3 more layers before kernel)
    printf("%s", msg);

    // Option B: write() — the C standard library wrapper around the syscall
    write(STDOUT_FILENO, msg, strlen(msg));

    // Option C: raw syscall — no library, direct kernel call
    // This is what write() does internally on Linux x86-64:
    long result;
    __asm__ volatile (
        "syscall"
        : "=a"(result)
        : "0"(1),           // rax = 1  (syscall number for write)
          "D"(1),           // rdi = 1  (stdout file descriptor)
          "S"(msg),         // rsi = msg pointer
          "d"(strlen(msg))  // rdx = length
        : "rcx", "r11", "memory"
    );
}

// ----- Layer 2: The C standard library (glibc) printf implementation -----
// (Simplified — real glibc is ~1000 lines for printf)
// printf → formats the string into a buffer
// → calls fwrite() to write to the FILE* stream
// → calls write() when the buffer is full or flushed
// → write() is a thin wrapper around the syscall instruction

// ----- Layer 3: The write() syscall wrapper (in glibc) -----
// The actual write() you call is about 10 lines of assembly:
//   mov  eax, 1        ; syscall number (SYS_write)
//   mov  edi, fd       ; arg1: file descriptor
//   mov  rsi, buf      ; arg2: buffer pointer
//   mov  rdx, count    ; arg3: byte count
//   syscall            ; ← crosses Ring 3 → Ring 0
//   ret

// ----- Layer 4: Linux kernel sys_write() handler (Ring 0) -----
// The kernel's system call table maps syscall 1 to sys_write():
//   1. Validate fd: is it a valid file descriptor for this process?
//   2. Validate buf: is this pointer in the process's virtual address space?
//   3. Call the file's write operation (which might be a terminal driver,
//      a socket, a file on disk, etc.)
//   4. Return bytes written in rax

// ----- Layer 5: The terminal driver (still Ring 0) -----
// For stdout connected to a terminal, the kernel calls the TTY driver
// which handles escape codes, line discipline, and eventually writes
// bytes to the video buffer or sends them to the terminal emulator.

int main() {
    my_program();
    return 0;
}`,
          annotations: [
            {
              lines: [8, 9],
              label: 'printf("%s", msg)',
              what: 'The highest-level way to write output: formatted string printing from the C standard library.',
              why: 'printf does NOT call the kernel directly. It formats your string into an internal buffer (inside the FILE* stream struct for stdout), and only calls write() when the buffer is full, when you print a newline (if stdout is line-buffered), or when you explicitly flush. This buffering is why printf is fast — it minimizes the number of expensive system calls.',
              note: 'This is why printf() output sometimes disappears when your program crashes: the output was in the stdio buffer but never flushed to the kernel. The fix: fflush(stdout) or fprintf(stderr, ...) since stderr is unbuffered.',
            },
            {
              lines: [12],
              label: 'write(STDOUT_FILENO, msg, strlen(msg))',
              what: 'The POSIX write() function — a thin C wrapper that directly invokes the write system call.',
              why: 'write() is the last C function you call before crossing into the kernel. Unlike printf(), it does no buffering — every call to write() is exactly one system call. This makes it simpler but potentially slower if you call it many times for small amounts of data.',
              note: 'STDOUT_FILENO is just the integer 1. Every process starts with three open file descriptors: 0 (stdin), 1 (stdout), 2 (stderr). These are set up by the OS when it creates your process. They\'re just numbers — the kernel uses them to look up the actual file/terminal/socket in a per-process table.',
            },
            {
              lines: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
              label: '__asm__ volatile ("syscall" ...) — raw assembly syscall',
              what: 'Invokes the write system call directly from inline assembly, bypassing all C library wrappers.',
              why: 'This shows exactly what write() does under the hood. The CPU\'s "syscall" instruction is the only way to cross from Ring 3 to Ring 0. Before executing it, we load the syscall number (1 = write) into rax, and the three arguments into rdi, rsi, rdx — the Linux x86-64 calling convention for system calls. After the syscall returns, rax contains the result.',
              note: 'The "=a"(result) means "the output goes into rax, store it in result." The ": "rcx", "r11", "memory"" at the end is a clobber list — it tells the compiler that the syscall instruction modifies rcx and r11 (the kernel saves and restores these), and may read/write memory. Without the clobber list, the compiler might make wrong optimization assumptions.',
            },
            {
              lines: [30, 31, 32, 33, 34, 35, 36, 37],
              label: 'Layer 2: printf → fwrite → write',
              what: 'Shows the three internal calls that printf makes before it ever reaches the kernel.',
              why: 'Understanding the layers reveals why printf behavior is sometimes confusing: it has its own internal buffering layer that the kernel knows nothing about. When you call printf(), your string might sit in a memory buffer for milliseconds before the kernel is ever told about it.',
              note: null,
            },
            {
              lines: [39, 40, 41, 42, 43, 44, 45, 46],
              label: 'Layer 3: The write() syscall wrapper in glibc',
              what: 'The ~10 lines of assembly that implement write() in the C standard library.',
              why: 'Every C function that wraps a syscall (open, read, write, close, mmap, fork, execve, etc.) is essentially this same pattern: load the syscall number, load the arguments into the right registers, execute "syscall", return the result. The entire syscall ABI on Linux is just a convention about which register holds what.',
              note: null,
            },
            {
              lines: [48, 49, 50, 51, 52, 53, 54, 55],
              label: 'Layer 4: Linux kernel sys_write() — Ring 0',
              what: 'The actual kernel code that executes after the Ring 3→Ring 0 transition.',
              why: 'The kernel must validate every argument from user space. It cannot trust the file descriptor or the pointer — a malicious or buggy program could pass anything. "Is fd valid?" "Is buf pointer actually in this process\'s address space?" "Does this process have permission to write to this fd?" Only after these checks does the kernel do the actual I/O.',
              note: 'This is why system calls have overhead. The kernel must validate, copy data across the user/kernel boundary (you cannot pass a pointer — the kernel must copy the bytes into a kernel buffer), and then do the actual work. The "syscall" instruction itself is fast, but the validation and copying take most of the ~200ns.',
            },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'Every time your program does anything interesting — printing, opening a file, allocating memory with malloc, creating a network connection, sleeping for a second — it crosses from Ring 3 to Ring 0 and back. You write code in Ring 3. The hardware lives in Ring 0. Every interaction between your code and the real world goes through this one crossing point. The system call interface is the most important API in computing. Every programming language, every runtime, every framework is built on top of it.',
        },
        {
          type: 'socratic',
          question: 'sys_write() re-validates the file descriptor and the buffer pointer inside the kernel — even though your C code already "knows" it built a valid write() call. Why does the kernel bother re-checking things your program supposedly already got right?',
          options: [
            'It\'s pure defensive redundancy with no real security benefit — the kernel is just being cautious out of habit',
            'The kernel cannot trust anything arriving from Ring 3 — a buggy or malicious program could pass a garbage pointer or a closed file descriptor, and the kernel\'s own check is the only thing standing between that and a crash or a security hole',
            'The check exists purely for backwards compatibility with syscalls written decades ago',
          ],
          answer: 1,
          explanations: [
            'This isn\'t habit — skip the check and you get a real, exploitable hole. "Defensive but pointless" undersells what\'s actually happening here.',
            'Exactly. This is the whole point of the Ring 3 / Ring 0 boundary from earlier in this chapter: user-space code is untrusted by definition, whether it\'s buggy or actively hostile. The kernel can\'t assume your rdi register holds a real, open file descriptor just because your C code compiled cleanly — a crafted raw syscall (like the inline assembly example above) could put anything in rdi. The validation inside sys_write() is the actual enforcement of the security boundary, not a formality.',
            'Backwards compatibility explains why syscall numbers stay stable — it has nothing to do with why arguments get validated. That validation exists for security, on every syscall, old or new.',
          ],
        },
      ],
    },
    {
      id: 'layers',
      title: 'printf to Screen: The Full Traceback',
      number: '04',
      color: '#5e9eff',
      blocks: [
        {
          type: 'simulator',
          id: 'syscall-trace-sim',
          caption: 'System Call Tracer — watch printf() travel through 6 layers to reach the screen',
        },
        {
          type: 'connection-bridge',
          concept: 'Kernel/User Space Boundary (Ring 3 / Ring 0)',
          coreIdea: 'Untrusted code cannot directly access shared resources — it must cross a privilege boundary through a validated interface.',
          connections: [
            { icon: '🌐', domain: 'HTTP APIs', description: 'Your frontend JavaScript cannot directly query a database. It calls a REST API (the "system call"). The backend (the "kernel") validates your request, checks permissions, runs the query, and returns the result. Your JS code never touches the database directly.' },
            { icon: '☁️', domain: 'AWS IAM / Cloud APIs', description: 'Your EC2 instance cannot directly call S3 APIs without an IAM role. The cloud control plane validates your identity and permissions before allowing the operation. Same boundary: privileged operations (touching other services\' resources) require crossing through a validated interface.' },
            { icon: '📱', domain: 'iOS App Sandbox', description: 'iOS apps cannot access the filesystem, camera, or network arbitrarily. Every such operation is a "system call" to the iOS kernel. The OS prompts the user for permission, validates it, and performs the operation. Your Swift code never touches the hardware.' },
            { icon: '🔒', domain: 'SQL GRANT/REVOKE', description: 'A database user cannot read tables they don\'t have SELECT permission on. Every query crosses a privilege boundary: the SQL engine (kernel) validates permissions before executing. GRANT is like adding a system call to the allowed list for a process.' },
          ],
          punchline: 'Every secure system architecture has a kernel/user boundary — a place where untrusted code asks a trusted intermediary to do dangerous things on its behalf. Web API → backend server. App → iOS kernel. EC2 → IAM. SQL user → database engine. The OS kernel invented this pattern in 1969. It has been the dominant security architecture ever since, because it is the right solution to the fundamental problem: how do you let untrusted code do useful things without letting it destroy everything?',
        },
        {
          type: 'socratic',
          question: 'When you call malloc() in C to allocate memory, does it call a system call? And what about free()?',
          options: [
            'malloc() always calls the kernel (brk or mmap system call) and free() always calls the kernel to return memory',
            'malloc() calls the kernel only when it needs more pages from the OS; free() usually does NOT call the kernel — it just marks memory as available in its own internal free list',
            'Neither malloc() nor free() ever call the kernel — memory management is entirely in user space',
          ],
          answer: 1,
          explanations: [
            'If malloc() called the kernel every time, it would be extremely slow — each system call costs ~200ns. Real malloc() implementations (glibc\'s ptmalloc, jemalloc, tcmalloc) maintain their own free lists and only call the kernel (brk or mmap) when they need more address space. Small allocations are served from pre-fetched pages without any syscall.',
            'Exactly right — this is how all real malloc() implementations work. malloc() asks the kernel for a large chunk of pages (via mmap or brk), then sub-allocates from that chunk in user space. When you call free(), the memory is returned to malloc\'s internal free list — not to the kernel. The kernel only gets it back if malloc() decides to unmap entire pages (which it may do for very large allocations). This is why your process\'s memory usage stays high even after freeing lots of small allocations.',
            'malloc() definitely calls the kernel eventually — your process has no memory until the OS gives it some via mmap/brk. But "eventually" is key — malloc batches kernel calls and serves most requests from its own pool.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'printf("Hello")', sublabel: 'Ring 3 — your code' },
      { label: 'stdio buffer', sublabel: 'C library buffers the string' },
      { label: 'write() wrapper', sublabel: 'glibc prepares syscall registers' },
      { label: '"syscall" instruction', sublabel: 'CPU crosses Ring 3 → Ring 0' },
      { label: 'sys_write() validates', sublabel: 'Kernel checks permissions + args' },
      { label: 'Terminal driver', sublabel: 'Writes to video buffer' },
      { label: 'Characters on screen', sublabel: 'Ring 0 → Ring 3, resume' },
    ],
    finalInsight: 'You now know the exact path that "Hello, World!" takes from your code to the screen. It is not one step. It is seven layers, two privilege boundary crossings, and about 300 nanoseconds. Every program you have ever written has done this, millions of times, invisibly. The system call boundary is the most important line in computing. Everything above it is your world. Everything below it is the kernel\'s world. The "syscall" instruction is the door between them.',
    nextChapter: 'Next: you know how a program talks to the kernel. But how does a new program start? How does your shell launch commands? How does every app you have ever opened come into existence? Two system calls — fork() and exec() — are responsible for every process launch on every UNIX system ever.',
  },
}

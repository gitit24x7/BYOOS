// m01_bootloader.js — Module 1: Bare Metal
export const m01 = {
  id: 'M01',
  title: 'Bare Metal',
  subtitle: 'The 512-byte handshake that starts every computer on Earth.',
  estimatedMinutes: 25,

  mystery: {
    type: 'mystery',
    lines: [
      'When you press the power button,',
      'your computer has no OS, no drivers, no keyboard support.',
      'It is just a chip sitting in the dark.',
      'In 0.3 seconds, it is running Linux.',
      'What happens in between?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Problem of Starting From Nothing',
      number: '01',
      color: '#ff8c42',
      blocks: [
        {
          type: 'history',
          content: `It is 1975. Engineers at Intel are designing the 8080 microprocessor — one of the first chips powerful enough to run a real program. They face a strange problem: when you power on the chip, it needs to execute code. But it has no code. The code is on disk, and disk needs an OS to read it, and the OS is on disk, and you need to read the disk to get the OS... A perfect chicken-and-egg problem.

Their solution: permanently wire a tiny startup program into the chip itself — code that runs before anything else, from a special read-only memory chip. This tiny program's only job is to find the real OS on disk and load it. They called it the boot program, from the phrase "pulling yourself up by your bootstraps." We still call it the bootloader today, and every computer on Earth still starts this way.`,
        },
      ],
    },
    {
      id: 'bios-post',
      title: 'First Milliseconds: BIOS and POST',
      number: '02',
      color: '#ff8c42',
      blocks: [
        {
          type: 'text',
          content: `When power flows into your CPU, the chip does not start executing your OS. It starts executing code from a tiny chip on your motherboard called the **BIOS** (Basic Input/Output System) — or on modern machines, its successor, **UEFI**.

The BIOS runs the **POST** — Power-On Self-Test. It checks: Is RAM working? Is the CPU working? Are storage devices connected? If anything is broken, it beeps in a pattern that means something specific (your computer's last SOS signal). If everything is fine, the BIOS moves to its next job: finding something to boot from.

The BIOS looks through a list of storage devices — usually disk first, then USB, then network — until it finds one that has a **boot signature**. It loads the first 512 bytes of that device into memory at address **0x7C00**, and tells the CPU to start executing from there. That 512-byte chunk is your bootloader.`,
        },
        {
          type: 'callout',
          variant: 'insight',
          content: `Stop here. Notice what just happened. The BIOS loads your bootloader not to a random memory address, but to exactly 0x7C00. Always. Every x86 machine. This was decided by IBM in 1981 and has not changed since. Your modern computer with 32 gigabytes of RAM, running at 4 GHz, starts its boot process by jumping to address 0x7C00 — because IBM said so in 1981. Computing history is full of decisions like this.`,
        },
        {
          type: 'simulator',
          id: 'boot-sequence-sim',
          caption: 'Boot Sequence Visualizer — Step through each stage from power-on to bootloader execution',
        },
      ],
    },
    {
      id: 'real-mode',
      title: 'Real Mode: The 1978 Time Capsule',
      number: '03',
      color: '#a78bfa',
      blocks: [
        {
          type: 'text',
          content: `When your bootloader starts, your CPU is in **Real Mode** — a legacy mode from the Intel 8086 processor, 1978. In Real Mode:

- You can only access **1 megabyte** of RAM total (even if you have 32 GB)
- You write **16-bit instructions** — the same instruction set from 1978
- There is **no memory protection** — any code can write to any address
- There are **no privilege levels** — you are running at full hardware access

Why does your CPU in 2024 still support a mode from 1978? Because Intel promised every x86 program ever written would keep working. That promise has been kept for 46 years. Your bootloader runs in the same mode as the original IBM PC.`,
        },
        {
          type: 'what-this-means',
          text: 'This is why writing a bootloader feels alien compared to normal C programming. You are not writing for a modern OS. You are writing for a 1978 CPU mode with 1 megabyte of RAM and no safety net. If you write to a wrong address, no error message, no segfault — you just corrupt memory and crash silently.',
        },
        {
          type: 'socratic',
          question: 'Real Mode gives your bootloader zero memory protection and zero privilege levels — full, raw access to hardware from the very first instruction. Why does the CPU start you off this unsafe, instead of starting in a safer, modern mode?',
          options: [
            'Real Mode runs faster than modern protected modes, so it makes boot time shorter',
            'Every x86 CPU must stay backward-compatible with the original 1978 8086 — so it always powers on into the same mode that chip understood',
            'There is no OS loaded yet, and only an OS is capable of choosing which CPU mode to start in',
          ],
          answer: 1,
          explanations: [
            'Speed is not the reason — Real Mode is not meaningfully faster, and modern CPUs execute 32-bit and 64-bit instructions just as fast, if not faster. This isn\'t about performance.',
            'Exactly right. Intel made a promise decades ago: every x86 chip, forever, would power on ready to run 8086-era code unmodified. That promise is why a CPU built in 2024 still wakes up pretending it\'s 1978. Nobody chose Real Mode for safety — it\'s a compatibility fossil, sitting at the very start of every boot sequence.',
            'This gets the causality backwards. The CPU doesn\'t wait for an OS to decide anything — it hardwires its startup mode before any software exists. The absence of protection isn\'t a missing decision, it\'s the default state Intel wired in, because no OS has run yet to ask for anything different.',
          ],
        },
      ],
    },
    {
      id: 'write-it',
      title: 'Write It: Your First Bootloader',
      number: '04',
      color: '#4ade80',
      blocks: [
        {
          type: 'text',
          content: `Here is a complete, working bootloader. It fits in 512 bytes. When executed, it prints "Hello from bare metal!" directly to your screen using a BIOS interrupt — before any OS, before any driver, before anything.

Every single line matters. Click any line to understand exactly what it does and why removing it would break everything.`,
        },
        {
          type: 'code',
          language: 'asm',
          filename: 'boot.asm',
          caption: 'A complete bootloader — 13 lines, 512 bytes, runs before any OS',
          code: `[BITS 16]
[ORG 0x7C00]

start:
    mov si, message
    call print_string
hang:
    jmp hang

print_string:
    lodsb
    or al, al
    jz .done
    mov ah, 0x0E
    int 0x10
    jmp print_string
.done:
    ret

message db 'Hello from bare metal!', 0

times 510 - ($ - $$) db 0
dw 0xAA55`,
          annotations: [
            {
              lines: [1],
              label: '[BITS 16]',
              what: 'Tells the assembler to generate 16-bit machine code instructions.',
              why: 'When your computer powers on, the CPU starts in Real Mode — a compatibility mode from 1978 that only understands 16-bit instructions. If you wrote 32-bit instructions here, the CPU would interpret the bytes as completely wrong commands and immediately crash. This directive is your way of telling the assembler "we are in 1978 mode."',
              note: null,
            },
            {
              lines: [2],
              label: '[ORG 0x7C00]',
              what: 'Tells the assembler that this code will be loaded at memory address 0x7C00.',
              why: 'The BIOS always loads the bootloader to address 0x7C00. Always. Without this directive, when your code says "jump to the message label," the assembler calculates the wrong address — because it doesn\'t know where in RAM the code will live. Every address in your code will be off by exactly 0x7C00, and your program will jump to garbage memory.',
              note: '0x7C00 is completely arbitrary — IBM picked it in 1981 because it was near the top of the first 32KB of usable RAM on the original PC. Nothing special about the number. But because IBM picked it, every BIOS in the world still uses it today.',
            },
            {
              lines: [4, 5, 6],
              label: 'start: → call print_string',
              what: 'The entry point of our program. We load the address of our message string into SI, then call our print function.',
              why: 'SI (Source Index) is the register that the lodsb instruction reads from. We must point it at our string before we start printing. Without mov si, message, lodsb would read from whatever garbage was in SI — printing random memory content or crashing.',
              note: null,
            },
            {
              lines: [7, 8],
              label: 'hang: jmp hang',
              what: 'An infinite loop. The program jumps back to itself forever.',
              why: 'Once we\'ve printed, there is nothing else to do. But we cannot just "return" — there is no OS to return to. If execution falls off the end of our code, the CPU starts executing whatever bytes come next in memory, which could be anything. Probably a crash. The hang loop is a polite way of saying: we are done, CPU. Sit here quietly.',
              note: 'This is a profound reminder of where you are. In a normal C program, returning from main() hands control back to the OS. Here, there is no OS. You ARE the OS. You manage everything — including what happens when you are finished.',
            },
            {
              lines: [10, 11],
              label: 'lodsb',
              what: 'Loads one byte from the address in SI into the AL register, then automatically increments SI to point to the next byte.',
              why: 'This is how we walk through the string one character at a time. Each call reads the current character and advances the pointer. Without lodsb (or equivalent), we would need two separate instructions: mov al, [si] followed by inc si.',
              note: null,
            },
            {
              lines: [12, 13],
              label: 'or al, al → jz .done',
              what: 'Checks if the current character is 0 (the null terminator). If it is, we jump to .done and return.',
              why: 'Our string ends with a 0 byte (the null terminator, just like C strings). "or al, al" sets the CPU\'s Zero Flag if AL is 0 — without changing the value. When AL is 0, jz ("jump if zero") takes us to .done. Without this check, print_string would read forever past the end of the string, printing garbage.',
              note: 'You might ask: why "or al, al" instead of "cmp al, 0"? Both work identically. "or al, al" is one byte shorter in machine code — a tiny optimization old-school assembly programmers used habitually. You will see both in real bootloader code.',
            },
            {
              lines: [14, 15],
              label: 'mov ah, 0x0E → int 0x10',
              what: 'Tells the BIOS to print the character in AL to the screen.',
              why: 'int 0x10 is a BIOS interrupt — a way to ask the BIOS firmware to do something for us. By setting AH to 0x0E, we tell it which BIOS function we want: "Teletype Output" — print one character. The BIOS then talks to the video hardware directly. We never touch the video hardware ourselves.',
              note: 'This is your first taste of the kernel/user boundary — even in a bootloader with no OS, we are already using an abstraction layer. We ask the BIOS, the BIOS talks to the hardware. We do not touch the hardware directly.',
            },
            {
              lines: [19],
              label: "message db 'Hello from bare metal!', 0",
              what: 'Declares a sequence of bytes in memory. Each character becomes its ASCII code. The final 0 is the null terminator.',
              why: 'The null terminator (the 0 at the end) is how print_string knows when to stop. Without it, print_string would keep reading bytes past the end of the string, printing garbage characters until it crashes.',
              note: 'That 0 at the end — you have seen it before. Every C string ends with \\0. C inherited this convention directly from assembly. The reason C strings work this way is because bootloaders needed them to work this way first.',
            },
            {
              lines: [21],
              label: 'times 510 - ($ - $$) db 0',
              what: 'Pads the bootloader with zero bytes until it is exactly 510 bytes long.',
              why: 'A bootloader must be exactly 512 bytes — the size of one disk sector. The BIOS reads exactly that many bytes. The last 2 bytes are the magic signature. So code + data must fill exactly 510 bytes. "$ - $$" is the size of our code so far. This line fills the remaining space with zeros automatically.',
              note: 'This is the famous "512-byte limit." It comes from the IBM PC disk format of 1981. Modern UEFI systems can have much larger boot code, but legacy BIOS bootloaders — and the first stage of GRUB, the Linux bootloader — still live in these 512 bytes.',
            },
            {
              lines: [22],
              label: 'dw 0xAA55',
              what: 'Writes the two-byte boot signature at the very end of the 512-byte sector.',
              why: 'The BIOS checks the last two bytes of the sector it loaded. If they are 0x55 followed by 0xAA (written in little-endian as 0xAA55), the BIOS considers this a valid bootloader and executes it. If those bytes are anything else, the BIOS says "not bootable" and skips this device.',
              note: 'This is a handshake. IBM picked 0xAA55 in 1981. Every BIOS on every x86 machine still checks for exactly these bytes today — 45 years later. This is how long decisions in computing last.',
            },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'You just read a complete operating system starter — 22 lines of assembly that runs before anything else on your computer. Notice: no imports, no libraries, no runtime, no safety net. You talk directly to the BIOS with interrupt numbers. You manage memory yourself. Every byte counts. This is what "bare metal" means. There is nothing between your code and the hardware except the BIOS, and soon you will replace even that.',
        },
        {
          type: 'connection-bridge',
          concept: 'Bootstrapping',
          coreIdea: 'Something tiny and pre-installed must run first to load the real system.',
          connections: [
            { icon: '📦', domain: 'Webpack / Vite', description: 'A tiny bundle entry file bootstraps your entire web app — loads your framework, your router, your components. Without it, the browser has nothing to run. Same idea: a minimal starter that loads everything else.' },
            { icon: '🐍', domain: 'Python interpreter', description: 'When you run "python app.py", the OS finds the Python binary, loads it into memory, and executes it. Python then reads your .py file. The Python interpreter is the bootloader for your Python program.' },
            { icon: '☕', domain: 'JVM', description: 'The JVM is the bootloader for Java programs. Your .class files cannot run directly. The JVM — a native binary — must start first, load your bytecode, and then run it. java.exe is the bootloader.' },
            { icon: '🐳', domain: 'Docker entrypoint', description: 'The ENTRYPOINT in a Dockerfile is the bootloader for your container. When Docker starts a container, it finds and executes the entrypoint binary first. That binary is responsible for setting up everything else.' },
          ],
          punchline: 'Every system that needs to start something has a bootstrapping problem. The bootloader is the universal solution: a tiny, trusted piece of code that is pre-installed and runs first, whose only job is to load and start the real system. The BIOS does this for your OS. Webpack does this for your React app. The JVM does this for your Java program. Same pattern, completely different domain.',
        },
        {
          type: 'socratic',
          question: 'Our bootloader fits in 512 bytes. If you wanted to load a full OS kernel — which might be 10 megabytes — how would you do it, given that your bootloader is only 512 bytes?',
          options: [
            'Compress the OS kernel until it fits in 512 bytes',
            'The bootloader loads a second, larger program that can then load the full kernel',
            'The BIOS automatically handles loading the OS kernel after the bootloader runs',
          ],
          answer: 1,
          explanations: [
            'Modern OS kernels are millions of bytes — no compression gets them to 512. And even if it did, your bootloader would need a decompressor, which itself takes space. This is the wrong direction.',
            'Exactly right — and this is how real systems work. GRUB (the Linux bootloader) has a tiny Stage 1 that fits in 512 bytes. Stage 1 loads Stage 2, which is a much larger program with a filesystem driver and a menu. Stage 2 then finds and loads the Linux kernel. Two (sometimes three) stages of bootstrapping, each one larger than the last.',
            'The BIOS stops caring after it jumps to your bootloader at 0x7C00. It does not know about OS kernels. It does not know about filesystems. It just loads 512 bytes and runs them. After that, you are on your own.',
          ],
        },
        {
          type: 'socratic',
          question: 'Suppose you strip the last two bytes — the 0xAA55 signature — off our bootloader, but leave everything else, including the padding, exactly the same. What happens when you try to boot it?',
          options: [
            'It boots and runs identically — the signature is just documentation, the CPU never checks it',
            'The BIOS reads the sector, sees the last two bytes aren\'t 0x55 0xAA, decides this disk isn\'t bootable, and moves on without running a single instruction of your code',
            'The CPU crashes immediately trying to decode the missing bytes as an instruction',
          ],
          answer: 1,
          explanations: [
            'The signature is not decorative — it\'s the one thing the BIOS actually inspects before trusting a sector enough to execute it. Skip it, and your code never runs at all, no matter how correct it is.',
            'Right. The BIOS never looks at your instructions to decide bootability — it only checks those final two bytes. No signature means no trust, and no trust means your carefully written 20 lines of assembly never execute. This is the whole chapter in one fact: the BIOS doesn\'t understand code, it just checks a handshake.',
            'The CPU never gets involved at this stage — the BIOS is doing the checking, in firmware, before your code is ever handed to the CPU to execute. There\'s nothing to "decode" because nothing gets loaded.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'Power button pressed', sublabel: 'Electricity flows to the CPU' },
      { label: 'BIOS / UEFI runs', sublabel: 'Pre-installed firmware on a ROM chip' },
      { label: 'POST completes', sublabel: 'Hardware checks pass' },
      { label: 'BIOS loads 512 bytes', sublabel: 'From disk sector 0 → RAM address 0x7C00' },
      { label: 'CPU enters Real Mode', sublabel: '16-bit mode, 1MB RAM limit, no protection' },
      { label: 'Your bootloader executes', sublabel: 'The code you just wrote' },
      { label: 'Bootloader loads OS kernel', sublabel: 'The real OS finally enters memory' },
    ],
    finalInsight: 'You now understand the first thing your computer does every single time you press the power button. Before Linux, before Windows, before any OS — your machine runs a tiny 512-byte program stored at the very first sector of your disk. That program is the bootloader. It is the oldest surviving code pattern in personal computing. IBM wrote the rules in 1981. Your computer follows them today.',
    nextChapter: 'Next: once the OS starts running, it faces an immediate problem. Multiple programs all claim they own the same memory addresses. How does the OS give each program a private memory world — when there is only one physical RAM chip? That is the illusion we build in Module 2.',
  },
}

// m00_bigquestion.js — Module 0: The Big Question
export const m00 = {
  id: 'M00',
  title: 'The Big Question',
  subtitle: 'What is an OS, and why does one need to exist at all?',
  estimatedMinutes: 15,

  mystery: {
    type: 'mystery',
    lines: [
      'You have one CPU.',
      'It can do exactly one thing at a time.',
      'You are running 52 programs simultaneously.',
      'How?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'Why Did Anyone Need to Invent This?',
      number: '01',
      color: '#5e9eff',
      blocks: [
        {
          type: 'history',
          content: `It is 1955. A computer fills an entire room. It costs $2 million. And it does exactly one thing at a time — a researcher hands in a stack of punched cards in the morning, and comes back at the end of the day to collect the printed results. If the program crashed halfway through, the entire day was wasted. Only one person could use the machine at a time. The computer sat idle 20 hours a day.

Engineers asked: what if we could run multiple programs and let the machine manage itself between them? That question — how do we make a powerful, expensive, single-threaded machine serve many users and many tasks at once — is the question the operating system was invented to answer. Everything you will learn in this course is an answer to some version of that question.`,
        },
      ],
    },
    {
      id: 'what-is-an-os',
      title: 'Three Jobs, One System',
      number: '02',
      color: '#a78bfa',
      blocks: [
        {
          type: 'text',
          content: `An operating system has exactly three jobs. Everything else — drivers, file systems, networking, security — is just a way of doing one of these three things better.

**Job 1: Referee.** Multiple programs want the CPU at the same time. The OS decides who gets it, for how long, and in what order. Without a referee, programs would fight each other to the death.

**Job 2: Illusionist.** Each program believes it has the entire computer to itself — its own private chunk of memory, its own CPU, its own files. None of this is true. The OS creates the illusion.

**Job 3: Accountant.** Someone has to track who is using what, and how much. The OS counts CPU cycles, memory bytes, disk blocks, and network packets — and enforces limits so one greedy program can't starve everyone else.`,
        },
        {
          type: 'callout',
          variant: 'insight',
          content: `Here is the key insight, stated directly: the OS is not one thing. It is three distinct services wearing one coat. When you learn about virtual memory, you are learning about the Illusionist. When you learn about scheduling, you are learning about the Referee. When you learn about system calls, you are learning about the Accountant's security desk. Every concept in this course is one of these three jobs in disguise.`,
        },
        {
          type: 'socratic',
          question: 'If there was no OS — just raw hardware — and you launched two programs at the same time, what would most likely happen?',
          options: [
            'The programs would take turns automatically, because the CPU knows how to share',
            'Both programs would try to write to the same memory addresses, corrupt each other\'s data, and crash',
            'The second program would wait until the first one finished before starting',
          ],
          answer: 1,
          explanations: [
            'The CPU has no built-in concept of fairness or sharing. It just executes instructions. Without an OS to enforce turns, no automatic sharing happens. That is precisely why the OS needs to exist.',
            'Exactly right. Without an OS, there is no referee. Both programs run as if they own everything. They write to the same addresses, overwrite each other\'s variables, and both crash — or one survives while silently corrupting the other\'s state. This actually happened on early computers. It was catastrophic.',
            'Nothing in the hardware makes a program "wait." Instructions execute as fast as the CPU can process them. Without explicit scheduling code (which is what the OS provides), there is no waiting.',
          ],
        },
      ],
    },
    {
      id: 'kernel-vs-user',
      title: 'The Kernel: The Part That Actually Has Power',
      number: '03',
      color: '#ff8c42',
      blocks: [
        {
          type: 'text',
          content: `Not all of the "operating system" runs with full power. The part that does is called the **kernel**. The kernel is the core — it is the code that runs with unrestricted access to hardware, memory, and devices. When we say "the OS does this," we almost always mean "the kernel does this."

Everything else — your shell, the file manager, even the desktop — is a regular program running on top of the kernel, just like your code does. It asks the kernel for things. It does not do things directly.

Your C program is a regular program. It cannot touch memory freely. It cannot write to the screen directly. It cannot read from disk. Every time it needs any of these things, it has to ask the kernel — and the kernel decides whether to allow it.`,
        },
        {
          type: 'analogy',
          analogy: 'A hotel. The guests (your programs) can use the rooms, the pool, the restaurant. But they cannot walk into the kitchen, the boiler room, or the security office. A guest cannot directly flip a circuit breaker. They call the front desk, the front desk calls maintenance, and maintenance does the actual work.',
          connection: 'The hotel is your computer. The guests are your programs. The front desk is the system call interface. Maintenance is the kernel. The circuit breaker is the hardware. Your program can never touch the circuit breaker directly. It can only request, and the kernel decides.',
        },
        {
          type: 'explicit-insight',
          text: 'Your program does not run your computer. The kernel runs your computer. Your program runs inside a carefully constructed illusion that the kernel maintains. Every time your program does anything interesting — printing, reading a file, opening a network connection — it is actually asking the kernel for permission and then waiting for the kernel to do the work. You are not driving the car. You are a passenger telling the driver where to go.',
        },
        {
          type: 'connection-bridge',
          concept: 'Kernel / User Space Boundary',
          coreIdea: 'Untrusted code cannot directly touch shared resources — it must go through a trusted intermediary that validates and executes the request.',
          connections: [
            { icon: '🌐', domain: 'Web APIs', description: 'Your JavaScript cannot directly query a database. It sends an HTTP request to a backend server — the backend is the "kernel." It validates your request and decides what data you actually get.' },
            { icon: '🗄️', domain: 'SQL Databases', description: 'A SQL query cannot directly read bytes from the B-tree on disk. It goes through the database engine — PostgreSQL, MySQL — which is the "kernel" of the database world. It validates permissions, optimizes the query, and fetches the data.' },
            { icon: '🐳', domain: 'Docker', description: 'A Docker container cannot directly modify the host filesystem or network. Container actions go through the container runtime (which talks to the Linux kernel). The container runtime is the kernel\'s gatekeeper.' },
            { icon: '📱', domain: 'iOS / Android', description: 'Apps cannot access your camera, contacts, or location directly. They send a request to the OS, which shows you a permission dialog. If you approve, the OS — acting as kernel — provides the resource. Your app never touches the camera hardware.' },
          ],
          punchline: 'Every major software system that handles untrusted code — web servers, databases, mobile OSes, container runtimes — has a kernel/user boundary. They all have one because they all face the same problem: how do you let untrusted code do useful things without letting it destroy everything? The answer is always the same: a privileged intermediary. The OS invented this pattern. Everything else copied it.',
        },
      ],
    },
    {
      id: 'live-look',
      title: 'See It Running Right Now',
      number: '04',
      color: '#4ade80',
      blocks: [
        {
          type: 'text',
          content: `Before we write any code, let's look at what an OS actually does in practice. The simulator below shows a simplified version of what your OS is doing right now — managing multiple processes competing for one CPU.

Watch what happens when a process gets its time slice, then gets interrupted, then another process gets its turn. The CPU does not stop. No process gets starved. The Referee is working.`,
        },
        {
          type: 'simulator',
          id: 'cpu-scheduler-sim',
          caption: 'CPU Round-Robin Scheduler — Watch the OS juggle 4 processes on one CPU',
        },
        {
          type: 'what-this-means',
          text: 'This is happening on your computer right now. Not a simulation — the real OS scheduler is running every few milliseconds, pausing one program and resuming another, thousands of times a second. Spotify keeps playing while you type in VS Code because of exactly this mechanism. You have never seen it. You have been relying on it your entire computing life.',
        },
        {
          type: 'socratic',
          question: 'In the scheduler above, what would happen if the OS gave each process unlimited time on the CPU instead of slicing it into turns?',
          options: [
            'Performance would improve because there is less switching overhead',
            'The first process to run would never give up the CPU — other processes would freeze forever',
            'The OS would automatically detect when a process is done and switch to the next one',
          ],
          answer: 1,
          explanations: [
            'Switching does have overhead — but it is tiny compared to the cost of starvation. A process that runs for 10ms and then gets paused for 5ms for a context switch is far better than a process that waits 30 seconds for another program to finish.',
            'Exactly right. Without preemption — the OS forcibly taking back the CPU — a single poorly written or malicious program could monopolize the CPU forever. Every other program freezes. Your music stops. Your mouse stops moving. This is called a "busy loop" attack, and it is why the scheduler uses time slices with a hardware timer interrupt to forcibly reclaim the CPU.',
            'The OS cannot know when a process "should" give up the CPU. Many programs are infinite loops (a web server listening for connections will never "finish"). The only safe approach is to forcibly take back the CPU after a fixed time slice, regardless of what the program is doing.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'One CPU', sublabel: 'Can do one thing at a time' },
      { label: 'Many programs', sublabel: 'All want the CPU simultaneously' },
      { label: 'The OS as Referee', sublabel: 'Slices CPU time into turns' },
      { label: 'The OS as Illusionist', sublabel: 'Gives each program a private memory world' },
      { label: 'The OS as Accountant', sublabel: 'Tracks and limits resource usage' },
      { label: 'The Kernel', sublabel: 'The privileged core that does the real work' },
    ],
    finalInsight: 'You now understand the fundamental reason operating systems exist. Not because they are complicated — because they solve a genuinely hard problem: how do you make one piece of hardware serve many programs at once, without any of them knowing about each other or being able to hurt each other? The answer is a referee, an illusionist, and an accountant rolled into one. Everything else we build in this course is a specific implementation of one of those three roles.',
    nextChapter: 'Next: we go to the very beginning. Before any of this OS machinery runs — before the kernel, before the scheduler, before virtual memory — something has to start it all. That something is the bootloader. It fits in exactly 512 bytes. We are going to write one.',
  },
}

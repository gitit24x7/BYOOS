// m02_memory.js — Module 2: Memory's Grand Illusion
export const m02 = {
  id: 'M02',
  title: "Memory's Grand Illusion",
  subtitle: 'Two programs, one address, no collision. The trick behind virtual memory.',
  estimatedMinutes: 30,

  mystery: {
    type: 'mystery',
    lines: [
      'Chrome thinks it owns address 0x1000.',
      'Spotify also thinks it owns address 0x1000.',
      'Both are running right now.',
      'Neither one is wrong.',
      'How is that possible?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Crash That Forced a Solution',
      number: '01',
      color: '#a78bfa',
      blocks: [
        {
          type: 'history',
          content: `It is 1962. MIT is building one of the first time-sharing systems — a machine that multiple users could use simultaneously. The problem immediately became catastrophic: each program was written assuming it owned all of memory starting from address 0. If you ran two programs at the same time, they both tried to write to address 0. One corrupted the other. Everything crashed.

The engineers tried a fix: give each program its own physical block of memory at a different address. Program A gets 0x0000–0x4FFF. Program B gets 0x5000–0x9FFF. But now program A had to be compiled knowing it would start at 0x0000. Program B had to be compiled for 0x5000. Every time you ran a different combination of programs, you had to recompile them. This was unacceptable.

The solution they invented: don't move the programs. Instead, lie to them. Let every program believe it starts at address 0. Then, silently, translate each address to wherever the program actually lives in physical memory. The program never knows. The computer juggles all the translations invisibly. That mechanism is called virtual memory, and it is running on your computer right now.`,
        },
      ],
    },
    {
      id: 'the-lie',
      title: 'The Lie the OS Tells Every Program',
      number: '02',
      color: '#a78bfa',
      blocks: [
        {
          type: 'text',
          content: `When your C program starts, the OS does not give it real memory. It gives it a **virtual address space** — a private, isolated range of addresses that exist only for that program. Your program can use any address from 0 to 2^64. It thinks it owns all of that.

It does not.

Somewhere in your computer's RAM, the OS has carved out actual physical bytes for your program. But the addresses your program sees — the virtual addresses — are completely different from where those bytes actually live. Every time your program reads or writes to a memory address, the CPU silently translates that virtual address to the real physical one using a lookup table.

That lookup table has a name: the **page table**. Every process has its own. The OS maintains them. The CPU uses them on every single memory access, thousands of times per second.`,
        },
        {
          type: 'analogy',
          analogy: "A hotel with 500 rooms. The concierge gives each guest a room key labeled '101'. But every guest's key actually opens a different room — Room 101 for the first guest really is room 101. Room 101 for the second guest actually opens room 247. Room 101 for the third guest opens room 389. The guests never know. They just use their key. The concierge keeps the translation ledger.",
          connection: "The hotel is your RAM. Each guest is a process. The room number on each key is a virtual address. The room the key actually opens is the physical address. The concierge's translation ledger is the page table. The OS is the concierge — maintaining separate ledgers for every guest, ensuring no guest can accidentally (or intentionally) open another guest's room.",
        },
        {
          type: 'callout',
          variant: 'insight',
          content: `This is why Chrome and Spotify can both claim address 0x1000. Chrome's 0x1000 maps to physical address 0x3A8C0000. Spotify's 0x1000 maps to physical address 0x7F210000. They're completely different locations in RAM. Neither program can see or touch the other's memory — because the OS gives them different translation tables. The lie protects them from each other.`,
        },
        {
          type: 'socratic',
          question: 'If virtual memory is "just a translation table," what happens when you have more virtual addresses than physical RAM? For example, your program allocates 10 GB of memory, but your computer only has 8 GB of RAM?',
          options: [
            'The OS refuses the allocation and returns an error immediately',
            'The OS uses the hard drive as overflow — it stores some memory pages on disk, swapping them in when needed',
            'The physical RAM expands automatically using compression',
          ],
          answer: 1,
          explanations: [
            'Most OSes actually do NOT refuse immediately. They use a technique called lazy allocation — they promise the memory but don\'t actually set up physical pages until your program actually touches those addresses. And when physical RAM runs out, they spill to disk.',
            'Exactly right — this is called swapping or paging to disk. The OS picks pages that haven\'t been used recently, writes them to a special area of your disk (the swap partition on Linux, page file on Windows), and frees that physical RAM for something else. When your program tries to access a swapped-out page, the CPU triggers a "page fault" — the OS catches it, reads the page back from disk, and resumes execution as if nothing happened. Your program never knows.',
            'RAM does not compress automatically at the hardware level. macOS does have a software memory compression feature (since 2013), but that is an OS-level optimization layered on top of virtual memory, not a fundamental part of how virtual memory works.',
          ],
        },
      ],
    },
    {
      id: 'pages',
      title: 'Pages: Memory in Fixed-Size Chunks',
      number: '03',
      color: '#5e9eff',
      blocks: [
        {
          type: 'text',
          content: `Virtual memory does not translate individual bytes. That would require a translation entry for every single byte in your address space — billions of entries, impossibly large.

Instead, it translates **pages** — fixed-size chunks of memory, typically **4 kilobytes** each. The page table has one entry per page. Your program's entire virtual address space is divided into pages. Physical memory is divided into frames of the same size.

When the CPU sees a virtual address, it splits it into two parts:

- **Page number** — which page does this address belong to? (Look this up in the page table.)
- **Offset within page** — where exactly within that page?

The page table maps the page number to a physical frame number. The offset stays the same. The result is the real physical address.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'page_table.c',
          caption: 'Simulating a simple one-level page table in C — the same idea your OS uses, simplified',
          code: `#include <stdio.h>
#include <stdint.h>

#define PAGE_SIZE    4096       // 4 KB pages
#define PAGE_BITS    12         // log2(4096)
#define NUM_PAGES    16         // tiny address space for demo

// Each entry: which physical frame does this virtual page map to?
// -1 means "not mapped" (page fault!)
int page_table[NUM_PAGES] = {
    3, 7, -1, 1, 5, -1, 2, 8,
    -1, 4, 6, -1, 9, 0, -1, 10
};

uint64_t virtual_to_physical(uint64_t virtual_addr) {
    uint64_t page_num = virtual_addr >> PAGE_BITS;
    uint64_t offset   = virtual_addr & (PAGE_SIZE - 1);

    if (page_num >= NUM_PAGES) {
        printf("SEGFAULT: address 0x%lx is out of range\\n", virtual_addr);
        return -1;
    }

    int frame = page_table[page_num];
    if (frame == -1) {
        printf("PAGE FAULT: page %lu not in RAM\\n", page_num);
        return -1;
    }

    uint64_t physical_addr = ((uint64_t)frame << PAGE_BITS) | offset;
    return physical_addr;
}

int main() {
    uint64_t vaddr = 0x1A3C;  // virtual address to translate
    uint64_t paddr = virtual_to_physical(vaddr);

    printf("Virtual:  0x%04lx  (page %lu, offset %lu)\\n",
           vaddr,
           vaddr >> PAGE_BITS,
           vaddr & (PAGE_SIZE - 1));

    if (paddr != (uint64_t)-1) {
        printf("Physical: 0x%04lx  (frame %d, offset %lu)\\n",
               paddr,
               page_table[vaddr >> PAGE_BITS],
               paddr & (PAGE_SIZE - 1));
    }

    return 0;
}`,
          annotations: [
            {
              lines: [6],
              label: '#define PAGE_SIZE 4096',
              what: 'Sets the size of each memory page to 4096 bytes (4 KB).',
              why: 'This matches the standard page size on x86-64 systems. 4 KB is the smallest unit of memory the OS tracks. Every allocation, every mapping, every swap operation deals in pages — never individual bytes. This is why malloc() sometimes gives you more memory than you asked for: it rounds up to the nearest page.',
              note: 'Why 4KB? It is a hardware-determined value that balances two competing concerns: if pages are too small, the page table itself gets enormous; if pages are too large, you waste RAM when a program only needs a few bytes. 4KB has been the standard since the 386 in 1985. Modern CPUs also support 2MB and 1GB "huge pages" for workloads that need large contiguous memory.',
            },
            {
              lines: [7],
              label: '#define PAGE_BITS 12',
              what: '12 is log2(4096) — the number of bits in a page offset.',
              why: 'To split a virtual address into page number and offset, we use bit shifting. The bottom 12 bits of any address are the byte offset within its page. The remaining bits are the page number. This works because 2^12 = 4096. The number 12 is where all the ">> PAGE_BITS" and "& (PAGE_SIZE - 1)" operations come from.',
              note: null,
            },
            {
              lines: [11, 12, 13],
              label: 'page_table[]',
              what: 'The page table — an array mapping virtual page numbers to physical frame numbers. -1 means unmapped.',
              why: 'Each process has exactly one page table. This is the entire mechanism of virtual memory: a lookup table. page_table[virtual_page] = physical_frame. When the OS creates a process, it builds this table. When the CPU needs to access memory, the hardware (the MMU — Memory Management Unit) automatically does this lookup on every access.',
              note: 'Real page tables have more than just a frame number per entry. Each entry also has permission bits (read/write/execute), a present bit (is this page in RAM?), a dirty bit (has this page been modified?), and accessed bits (has the CPU read this recently?). The OS uses these bits to decide which pages to swap out when RAM is full.',
            },
            {
              lines: [18],
              label: 'page_num = virtual_addr >> PAGE_BITS',
              what: 'Extracts the page number by right-shifting to drop the offset bits.',
              why: 'A 64-bit address like 0x1A3C (binary: 0001 1010 0011 1100) split at bit 12: the top 52 bits (0x1) are the page number; the bottom 12 bits (0xA3C = 2620) are the offset within that page. Shifting right by 12 effectively divides by 4096, giving us which page this address belongs to.',
              note: null,
            },
            {
              lines: [19],
              label: 'offset = virtual_addr & (PAGE_SIZE - 1)',
              what: 'Extracts the byte offset within the page using a bitmask.',
              why: 'PAGE_SIZE - 1 is 4095, which in binary is 12 ones: 0x0FFF. ANDing with this mask keeps only the bottom 12 bits — the offset within the page. This offset is the same in both virtual and physical addresses: the page table maps entire pages, not individual bytes.',
              note: 'This "& (n - 1)" trick for extracting the lower bits only works when n is a power of 2. That is one of the reasons page sizes are always powers of 2: it makes this hardware operation a single AND instruction instead of a division.',
            },
            {
              lines: [22, 23, 24, 25],
              label: 'if (page_num >= NUM_PAGES) → SEGFAULT',
              what: 'Detects an access outside the valid virtual address space.',
              why: 'Every process has a defined virtual address space. If you try to access an address beyond what the OS has mapped for your process, this is a segmentation fault — the hardware raises an exception, the OS kills your process. This is the mechanism behind "Segmentation fault (core dumped)" in C.',
              note: 'Segfaults are not bugs in the CPU. They are the MMU (Memory Management Unit) doing its job: detecting an illegal memory access and reporting it. Without this, a bug in your code could overwrite any process\'s memory — including the OS kernel\'s memory. The segfault is the safety mechanism.',
            },
            {
              lines: [27, 28, 29, 30],
              label: 'if (frame == -1) → PAGE FAULT',
              what: 'Detects a valid virtual address that is not currently in RAM.',
              why: 'A page fault is not a crash — it is a request. The OS catches this hardware exception, loads the missing page from disk (if it was swapped out) or allocates a new physical frame (if it is a newly accessed page), updates the page table, and resumes your program. Your program never sees this happen. The "page fault" name is confusing — it is actually a normal event that happens thousands of times per second.',
              note: 'There are different kinds of page faults. A "minor" fault means the page is already in memory but not in this process\'s page table — no disk I/O needed, just update the mapping. A "major" fault means the page must be read from disk — this is slow and this is why running out of RAM makes your computer crawl. If you\'ve taken Module P05, this is the exact mechanism from that chapter: a page fault is CPU exception vector 14, routed through the IDT just like a timer tick or a syscall — the CPU itself is the trigger, and CR2 (mentioned in P05) holds the faulting address.',
            },
            {
              lines: [33],
              label: 'physical_addr = (frame << PAGE_BITS) | offset',
              what: 'Assembles the physical address: frame number in the high bits, same offset in the low bits.',
              why: 'The physical frame number replaces the virtual page number. The offset within the page is identical — we are just changing which physical block of 4KB we\'re pointing into, at the same position within it. This is the entire page table translation in one instruction.',
              note: null,
            },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'The page table is the entire mechanism of virtual memory. It is just an array: virtual_page → physical_frame. Every time your CPU reads or writes memory — including fetching the next instruction — it does a page table lookup. This happens billions of times per second, in hardware, invisibly. The chip that does this lookup has a name: the MMU (Memory Management Unit). It is a separate piece of silicon inside your CPU whose entire job is this one lookup.',
        },
      ],
    },
    {
      id: 'isolation',
      title: 'Why This Means Programs Cannot Hurt Each Other',
      number: '04',
      color: '#4ade80',
      blocks: [
        {
          type: 'text',
          content: `Here is the profound consequence of virtual memory that most people never consciously realize:

Your program **cannot reach another program's memory**. Not because of a rule. Because the addresses don't exist.

Chrome's virtual address 0x1000 maps to physical frame 58. Spotify's virtual address 0x1000 maps to physical frame 203. If Chrome tries to write to address 0x1000, it writes to frame 58. Spotify's frame 203 is untouched. Chrome does not even have a virtual address that points to frame 203. It is as if that memory does not exist from Chrome's perspective.

This is called **process isolation** — one of the most important properties of a modern OS. It is what allows you to run untrusted code (random apps, browser extensions, untested programs) without fearing that they will corrupt your other programs or the OS itself.

Before virtual memory, a single buggy program could overwrite the OS kernel's memory and crash the entire machine. Now, a buggy (or malicious) program can only corrupt its own virtual address space. The MMU enforces this in hardware — software cannot override it.`,
        },
        {
          type: 'what-this-means',
          text: 'Right now, as you read this page in a browser, there are dozens of other programs running. All of them have memory. None of them can read your browser\'s memory — not the text you typed in that password field, not the cookies, nothing. This is not just a software convention. The CPU itself enforces this, on every single memory access, because each process has its own page table. This protection has been in place since the 1970s. It is why your computer doesn\'t crash every time someone ships buggy software.',
        },
        {
          type: 'simulator',
          id: 'memory-map-sim',
          caption: 'Virtual Memory Map — select a process and click its pages to see the virtual→physical translation',
        },
        {
          type: 'connection-bridge',
          concept: 'Virtual Address Spaces / Process Isolation',
          coreIdea: 'Give each "tenant" a private, isolated view of a shared resource so they cannot see or affect each other.',
          connections: [
            { icon: '🐳', domain: 'Docker containers', description: 'Each container gets its own virtual filesystem namespace. Container A thinks it has the root filesystem starting at /. Container B thinks the exact same thing. Neither can see the other\'s files. Docker applies the virtual memory trick to filesystems instead of RAM.' },
            { icon: '🌐', domain: 'Browser tabs (Site Isolation)', description: 'Chrome\'s "Site Isolation" feature gives each website its own OS process with its own virtual address space. A malicious site cannot read another tab\'s memory or cookies — because process isolation makes those addresses unreachable, not just hidden.' },
            { icon: '🐍', domain: 'Python virtual environments', description: 'A venv gives each Python project an isolated package namespace. Project A\'s numpy 1.23 and Project B\'s numpy 1.26 coexist. The "virtual" in venv is the same idea — a private view of a shared resource (the package registry), isolated from all others.' },
            { icon: '🗄️', domain: 'Database schemas', description: 'PostgreSQL schemas give each application a private namespace within the same database. Schema A and Schema B can both have a table named "users." No collision. The database engine is the "OS" mapping schema-qualified names to actual storage, just like the MMU maps virtual addresses to physical frames.' },
          ],
          punchline: 'Docker isn\'t magic. It\'s just virtual memory applied to filesystems. The OS invented the "private isolated view of a shared resource" pattern in the 1960s for RAM. Docker applied it to filesystems in 2013. Browser Site Isolation applied it to web page memory in 2018. Python venv applied it to package namespaces. The same 60-year-old idea keeps solving the same problem in every new domain: how do you let multiple untrusted things share one resource without them hurting each other?',
        },
        {
          type: 'socratic',
          question: 'Two processes share a common library — say, libc.so, the C standard library. Loading a full copy of it into RAM for each of the 50 processes using it would be very wasteful. How does virtual memory solve this?',
          options: [
            'The OS cannot solve this — each process gets its own copy and RAM fills up fast',
            'Multiple processes can map the same physical frames with different virtual addresses — they share the physical bytes but each process sees it at its own virtual address',
            'The library is stored in a special reserved area of RAM that all processes automatically share',
          ],
          answer: 1,
          explanations: [
            'This would actually be the situation without virtual memory\'s shared mapping capability. But modern OSes solve it elegantly using shared memory mappings.',
            'Exactly right — this is called shared memory mapping. The OS can set page_table[process_A][virtual_page_X] = physical_frame_42 AND page_table[process_B][virtual_page_Y] = physical_frame_42 simultaneously. Both processes access the same physical bytes through different virtual addresses. The library code only exists once in RAM. This is how your 50 processes all use libc without 50 copies. It is also how shared memory IPC works: two processes agreeing to map the same physical frame and using it as a communication channel.',
            'There is no special "reserved shared area" in the hardware. The OS creates sharing by making multiple page table entries point to the same physical frame — it is the same page table mechanism, just reused cleverly.',
          ],
        },
      ],
    },
    {
      id: 'tlb',
      title: 'The TLB: Because Every Lookup Cannot Be Slow',
      number: '05',
      color: '#ff8c42',
      blocks: [
        {
          type: 'text',
          content: `Here is a problem: the page table lives in RAM. Every memory access requires a page table lookup. But the page table lookup is itself a memory access. That means every memory read or write actually requires two memory accesses: one to look up the page table, then one to do the actual read/write.

That would make every memory operation twice as slow. For a program running billions of instructions per second, this is catastrophic.

The solution is a hardware cache specifically for page table entries: the **TLB** — Translation Lookaside Buffer. It is a tiny, extremely fast memory inside the CPU that stores the most recently used virtual-to-physical translations. If the CPU needs to translate a virtual address, it checks the TLB first. If it is there (a TLB hit), the translation completes in a single cycle. If it is not there (a TLB miss), it fetches the entry from the page table in RAM and caches it.

On a typical program, 99% of accesses are TLB hits. The TLB typically holds only 64 to 1024 entries — but because programs tend to access the same pages over and over (locality of reference), this tiny cache is almost always sufficient.`,
        },
        {
          type: 'callout',
          variant: 'insight',
          content: 'The TLB is why virtual memory has almost no performance overhead in practice. Without it, every program would run at half speed. With it, the translation is essentially free for the vast majority of memory accesses. The TLB is also what gets flushed when the OS switches processes — because different processes have different page tables, the cached translations become invalid. This is one of the hidden costs of a context switch.',
        },
        {
          type: 'what-this-means',
          text: 'When you hear that switching between processes has overhead, TLB flushing is a big part of why. Every time Linux\'s scheduler switches from one process to another, it must flush the TLB (or use a processor feature like ASIDs to avoid full flushes). For a program that context-switches many times per second — like a web server handling thousands of connections — TLB pressure is a real performance concern that engineers actively optimize for.',
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'One physical RAM chip', sublabel: 'Shared by every program' },
      { label: 'Virtual address spaces', sublabel: 'Each process gets a fake private view' },
      { label: 'The page table', sublabel: 'Maps virtual pages → physical frames' },
      { label: 'The MMU', sublabel: 'Hardware that translates on every access' },
      { label: 'The TLB', sublabel: 'Cache for recent translations (fast path)' },
      { label: 'Process isolation', sublabel: 'Programs cannot touch each other\'s memory' },
    ],
    finalInsight: 'You now understand one of the most important ideas in computing. Virtual memory is not a memory optimization — it is a security mechanism disguised as an addressing trick. Every program on your computer right now believes it owns all of memory. They are all wrong. The OS and the CPU are maintaining a grand, multi-process illusion. The cost of this illusion is remarkably low, thanks to the TLB. The benefit is everything: stability, security, and the ability to run untrusted code without fear.',
    nextChapter: 'Next: you understand why programs don\'t corrupt each other\'s memory. But how does the OS actually switch between them? How does it interrupt a program mid-execution, save its state, run a different program, and then come back? That is scheduling — and the mechanism involves a hardware timer and something called a context switch.',
  },
}

// b07_allocator.js — Bring-Up 7: Your First Allocator
export const b07 = {
  id: 'B07',
  title: 'Your First Allocator',
  subtitle: 'Module P02 punted on malloc(). It is time to stop punting.',
  estimatedMinutes: 30,

  mystery: {
    type: 'mystery',
    lines: [
      'Module P02 said, honestly: "you don\'t dynamically allocate yet — you use fixed global arrays."',
      'That was never a real answer, just an honest delay.',
      'Your kernel now has real paged memory from Module B06. It is ready for a real allocator.',
      'What is the smallest piece of code that can hand out and reclaim memory on request?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Allocator That Was Already in Your Textbook',
      number: '01',
      color: '#fb923c',
      blocks: [
        {
          type: 'history',
          content: `It's 1978, and Brian Kernighan and Dennis Ritchie publish The C Programming Language — the book most working programmers still call K&R. Buried in its final chapter, alongside an explanation of how to write a real Unix-style malloc(), is a working free-list allocator: a linked list of memory blocks, each tagged as free or in-use, searched linearly for something big enough to satisfy each request.

That exact technique — not a simplified teaching version of it, the actual one — is what nearly every allocator built since has started from, including the one you're about to write. glibc's ptmalloc, Google's tcmalloc, and every hobby OS's first kmalloc() are all elaborations on the same core idea K&R printed decades ago: a list of blocks, a search for a good-enough one, and bookkeeping to tell free memory from used memory.`,
        },
      ],
    },
    {
      id: 'bump-allocator',
      title: 'The Simplest Possible Allocator: One Pointer',
      number: '02',
      color: '#fb923c',
      blocks: [
        {
          type: 'text',
          content: `Before building something that can reclaim memory, it's worth building something that can't — because it's genuinely useful, and because the real allocator in the next section is built on top of it. A **bump allocator** (also called a watermark allocator) is exactly one pointer, tracking the next free byte. Allocating means handing back the current pointer, then advancing it by the requested size. There is no way to free an individual allocation — the only operation besides allocating is resetting the pointer back to the start, freeing everything at once.

This sounds too limited to be useful, but it's exactly what a kernel needs during its earliest bring-up: Module B06's page_directory and first_page_table, for instance, are allocations that live for the entire lifetime of the kernel and are never individually freed. A bump allocator is the correct tool for exactly that pattern — permanent, boot-time allocations — and it's also the foundation the free-list allocator below carves new blocks from whenever its existing free list can't satisfy a request.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'bump_alloc.c',
          caption: 'A complete bump allocator — the heap start comes directly from Module P06\'s linker script',
          code: `#include <stdint.h>

extern uint32_t end;   // defined by the linker script, not by any C code

uint32_t heap_current;

void bump_alloc_init(void) {
    heap_current = (uint32_t) &end;
}

void* bump_alloc(uint32_t size) {
    size = (size + 3) & ~3;
    void* result = (void*) heap_current;
    heap_current += size;
    return result;
}`,
          annotations: [
            {
              lines: [3],
              label: 'extern uint32_t end;',
              what: 'Declares a variable named end, but never defines it anywhere in this file.',
              why: 'extern tells the compiler "this symbol exists somewhere, resolve it at link time" — Module P06\'s exact linking chapter, now used for something new: end is not a C variable at all. It\'s a symbol the linker script itself defines, conventionally placed right after the .bss section, marking the address where the compiled kernel\'s own code and data end. Nothing about &end\'s value comes from C — it comes entirely from where the linker physically placed everything else.',
              note: 'The corresponding linker script addition is one line: end = .; placed after the .bss section rule. The dot (.) is the same location counter from Module P06 — by the time the linker reaches this line, it holds exactly the address immediately following everything already placed.',
            },
            {
              lines: [8],
              label: 'heap_current = (uint32_t) &end;',
              what: 'Initializes the bump pointer to the address of the end symbol.',
              why: '&end takes the address of the symbol itself (not "the value stored at end" — end has no meaningful value, it\'s a marker, not a variable holding data). This guarantees the heap starts immediately after the kernel\'s own compiled code and data, never overlapping anything the kernel itself needs to keep intact.',
              note: null,
            },
            {
              lines: [12],
              label: 'size = (size + 3) & ~3;',
              what: 'Rounds size up to the next multiple of 4.',
              why: 'This is a general-purpose bit trick worth knowing by name: adding 3 then clearing the low 2 bits rounds up to a 4-byte boundary. ~3 flips every bit of 3 (000...011), giving 111...100 — a mask that zeroes out any value\'s low 2 bits, which is exactly "round down to a multiple of 4." Adding 3 first is what turns "round down" into "round up": a value already a multiple of 4 is unaffected (adding 3 then masking removes exactly what was added), while anything not already aligned gets pushed up to the next boundary.',
              note: 'Keeping every allocation 4-byte aligned matters because unaligned memory access is slower on x86 (and outright forbidden on many other architectures) — the exact same alignment discipline Module B06\'s __attribute__((aligned(4096))) enforced at a much larger scale.',
            },
          ],
        },
        {
          type: 'socratic',
          question: 'A bump allocator has no free() at all — only the ability to reset heap_current back to the start, freeing everything simultaneously. Why is this limitation acceptable for allocations like Module B06\'s page_directory and first_page_table specifically?',
          options: [
            'It isn\'t really acceptable — those allocations should use a real free-list allocator instead',
            'Those allocations are meant to live for the entire lifetime of the kernel and are never individually freed anyway, so an allocator that literally cannot free individual blocks costs nothing in practice for exactly this use case',
            'Page directories and page tables are special hardware structures that bypass normal memory allocation entirely',
          ],
          answer: 1,
          explanations: [
            'A free-list allocator would work here too, but it would be solving a problem that doesn\'t exist for these specific allocations — nothing is ever freed individually regardless of which allocator manages the memory.',
            'Exactly right. The limitation of a bump allocator — no individual free — is only a real cost when something actually needs to be freed individually. Module B06\'s page structures are allocated once at boot and live until the kernel shuts down; "can\'t free individually" and "never needs to be freed individually" describe the exact same situation from two different angles. This is why bump allocators remain genuinely useful in real kernels for boot-time, permanent allocations, rather than being purely a teaching simplification.',
            'Page directories and page tables are ordinary memory as far as allocation is concerned — Module B06 built them as plain uint32_t arrays. The CPU treats them specially once loaded into CR3, but getting the memory for them in the first place is an ordinary allocation problem.',
          ],
        },
      ],
    },
    {
      id: 'free-list-allocator',
      title: 'kmalloc() and kfree(): A Real, Reclaimable Heap',
      number: '03',
      color: '#f97316',
      blocks: [
        {
          type: 'text',
          content: `A free-list allocator adds exactly one thing the bump allocator can't do: give memory back. The idea is a small header placed immediately before every allocation, recording its size and whether it's currently free — and a linked list threading every block, free or not, together. Allocating means walking that list looking for a free block big enough (**first-fit**: the first one found, not necessarily the smallest that would fit — simple, at the cost of potentially wasting some space). If nothing existing fits, a new block is carved from the bump allocator. Freeing means flipping one flag in the header — nothing more.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'kmalloc.c',
          caption: 'A minimal free-list kmalloc() and kfree(), built on top of the bump allocator above',
          code: `typedef struct block_header {
    uint32_t size;
    int free;
    struct block_header* next;
} block_header_t;

block_header_t* free_list = NULL;

void* kmalloc(uint32_t size) {
    block_header_t* curr = free_list;
    while (curr) {
        if (curr->free && curr->size >= size) {
            curr->free = 0;
            return (void*)(curr + 1);
        }
        curr = curr->next;
    }

    block_header_t* block = bump_alloc(sizeof(block_header_t) + size);
    block->size = size;
    block->free = 0;
    block->next = free_list;
    free_list = block;
    return (void*)(block + 1);
}

void kfree(void* ptr) {
    block_header_t* block = (block_header_t*)ptr - 1;
    block->free = 1;
}`,
          annotations: [
            {
              lines: [10, 11, 12, 13, 14, 15],
              label: 'while (curr) { if (curr->free && curr->size >= size) { ... } curr = curr->next; }',
              what: 'Walks the linked list of every block ever allocated, returning the first one that\'s both free and large enough.',
              why: 'This is the first-fit search this chapter\'s text described. It does not look for the smallest suitable block (that would be best-fit, a real alternative strategy with its own tradeoffs) — it takes the first match and stops, trading potential wasted space for a simpler, faster search.',
              note: null,
            },
            {
              lines: [13],
              label: 'return (void*)(curr + 1);',
              what: 'Returns a pointer to the memory immediately after the header, not the header itself.',
              why: 'curr + 1 is pointer arithmetic on a block_header_t*, which — unlike arithmetic on a raw address — automatically scales by sizeof(block_header_t), the same scaling rule from Module P02\'s VGA buffer indexing. This single expression is what makes the header trick work at all: callers of kmalloc() receive a pointer just past the invisible header, so they can use it as ordinary memory without ever seeing or corrupting the bookkeeping that precedes it.',
              note: null,
            },
            {
              lines: [19, 20, 21, 22, 23],
              label: 'block_header_t* block = bump_alloc(...); ... free_list = block;',
              what: 'When no existing free block fits, carves a brand new one from the bump allocator and adds it to the front of the free list.',
              why: 'sizeof(block_header_t) + size requests enough space for both the header and the usable memory in one bump_alloc() call — this is the connection between this chapter\'s two allocators: the free-list allocator never talks to raw memory directly, it only ever asks the bump allocator for more space when its own list runs out of candidates.',
              note: null,
            },
            {
              lines: [27],
              label: 'block_header_t* block = (block_header_t*)ptr - 1;',
              what: 'Recovers the header from a pointer the caller passed to kfree(), by subtracting one header-sized step.',
              why: 'This is the exact inverse of curr + 1 from kmalloc() above — the same scaled-pointer-arithmetic rule, run backward. Because every pointer kmalloc() ever returns is always exactly one block_header_t past a real header, ptr - 1 reliably lands back on that header, regardless of what size was originally requested.',
              note: 'This only works because kfree() trusts that ptr genuinely came from a prior kmalloc() call. Passing kfree() an arbitrary pointer — one that didn\'t come from kmalloc() — would read whatever bytes happen to sit one header-size before it as if they were a real header, corrupting memory in a way that\'s notoriously hard to debug. Every real allocator has this same trust requirement.',
            },
          ],
        },
        {
          type: 'simulator',
          id: 'heap-allocator-sim',
          caption: 'Allocate and free blocks yourself, and watch first-fit search — and fragmentation — happen live',
        },
        {
          type: 'callout',
          variant: 'warning',
          content: 'This kfree() never merges a newly-freed block with a free neighbor sitting right next to it in memory — a real limitation called the absence of coalescing. Free three small blocks in a row and this allocator still sees three separate small free blocks, not one large one, even though the memory is physically contiguous. A request too large for any single one of them can fail even when the combined free space would have been enough — exactly the external fragmentation the simulator above can produce if you free blocks out of order and then request something large.',
        },
        {
          type: 'socratic',
          question: 'The heap has three adjacent blocks: a free 32-byte block, an allocated 16-byte block in the middle, and another free 32-byte block right after it. A request for 48 bytes comes in. What does this chapter\'s kmalloc() do?',
          options: [
            'It succeeds, since 32 + 32 = 64 bytes of free memory exist, more than enough for the 48-byte request',
            'It fails to find a fit in the free list (neither free block alone is 48 bytes), and falls through to bump_alloc() for a brand new block — even though enough total free memory technically exists, just not contiguously in one already-tracked block',
            'It automatically merges the two free blocks around the allocated one, then satisfies the request from the merged 64-byte space',
          ],
          answer: 1,
          explanations: [
            'kmalloc() only checks each block individually against curr->size >= size — it has no concept of "combine multiple free blocks," so the fact that two separate blocks add up to enough space doesn\'t help a single request that needs one contiguous 48 bytes.',
            'Exactly right, and this is the fragmentation problem the callout above described, made concrete. Neither the first 32-byte free block nor the second one alone satisfies a 48-byte request, so the search fails on both and kmalloc() does exactly what it does whenever the free list has nothing suitable: asks the bump allocator for fresh memory instead, leaving both original free blocks sitting unused.',
            'This kfree() implementation performs no coalescing at all — freeing a block only ever flips its own free flag, with no awareness of, or attempt to merge with, whatever blocks happen to be adjacent to it in memory.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: '1978: K&R\'s malloc', sublabel: 'The same free-list idea, printed in the original C textbook' },
      { label: 'extern uint32_t end;', sublabel: 'A symbol the linker defines, not C code' },
      { label: 'Bump allocator', sublabel: 'One pointer — fast, permanent, never individually freed' },
      { label: 'block_header_t', sublabel: 'Size, free flag, and a next pointer, hidden before every allocation' },
      { label: 'kmalloc(): first-fit search', sublabel: 'Walk the list, or carve fresh memory from the bump allocator' },
      { label: 'kfree(): one flag flip', sublabel: 'No coalescing yet — a real, honestly-stated limitation' },
    ],
    finalInsight: 'Module P02\'s honest admission — "you don\'t dynamically allocate yet" — is no longer true. You built the same two-layer structure every real kernel allocator uses: a bump allocator for permanent, boot-time memory, and a free-list allocator on top of it for everything that needs to come and go. You also know exactly where it\'s still simplified — no coalescing — which is a real, well-understood tradeoff, not a hidden bug.',
    nextChapter: 'Next: your kernel can allocate memory, catch interrupts safely, and tick reliably — everything Module 3\'s scheduler assumed by narration, not by real code. Module B08 wires the actual assembly register save and restore to Module B05\'s timer interrupt, producing a real, working preemptive context switch.',
  },
}

// b06_paging.js — Bring-Up 6: Real Paging
export const b06 = {
  id: 'B06',
  title: 'Real Paging',
  subtitle: 'Module 2 simulated a page table in an array. Real x86 paging is two levels, and every bit is load-bearing.',
  estimatedMinutes: 35,

  mystery: {
    type: 'mystery',
    lines: [
      'Module 2\'s page_table[] array was a simplified stand-in for something real:',
      'an actual hardware structure the CPU itself reads on every single memory access, enforced in silicon.',
      'It is not one array. It is a two-level structure, and one specific register makes it active.',
      'What is that structure, and what happens the instant you load it?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'The Chip That Made Module 2 Possible',
      number: '01',
      color: '#a78bfa',
      blocks: [
        {
          type: 'history',
          content: `It's 1985. Intel ships the 80386, and for the first time an x86 chip has real paging hardware built in. Every x86 chip before it — the 8086 Module 1's bootloader targets, the 80286 — had no concept of virtual memory at all; the closest thing was segmentation, which could relocate memory but couldn't give two programs an honest, independent illusion of owning the same address.

The 386's paging hardware is the literal mechanism behind everything Module 2 taught conceptually: a lookup table, maintained per process, that the CPU itself consults on every memory access, translating a lie (the virtual address) into the truth (the physical address). Module 2's page_table[] array was a deliberately simplified stand-in for this exact hardware, built so you could understand the idea before facing the real bit-level structure. This module replaces the simulation with the actual thing.`,
        },
      ],
    },
    {
      id: 'two-level-structure',
      title: 'Why Two Levels, Not One',
      number: '02',
      color: '#a78bfa',
      blocks: [
        {
          type: 'text',
          content: `A 32-bit virtual address space is 4GB. If the CPU translated every 4-kilobyte page with one giant flat table, that table alone would need 2²⁰ entries (one for every possible 4KB page in 4GB) — roughly 4 megabytes of table, for every single process, even one that only ever uses a few megabytes of actual memory. That's the problem real x86 paging avoids with two levels instead of one.

A 32-bit virtual address splits into three pieces: bits 31-22 (10 bits) select an entry in the **page directory**, bits 21-12 (10 bits) select an entry in a **page table**, and bits 11-0 (12 bits) are the **offset** within the final 4KB page. Each page directory entry (PDE) either points at a page table, or is simply marked "not present" — and if it's not present, the second-level page table for that entire 4-megabyte region of address space doesn't need to exist in memory at all. A process using only a few megabytes needs only a handful of second-level tables, not the full 4MB worst case. Ten bits, ten bits, twelve bits — 2¹⁰ × 2¹⁰ × 2¹² is exactly 2³², the full 4GB space, accounted for without ever allocating more table than a process actually uses.`,
        },
        {
          type: 'analogy',
          analogy: 'A library that shelves books by a two-part call number instead of one giant sequential number: first the section (fiction, history, science), then the specific shelf within that section. If a section has no books at all, the library never bothers building shelving for it — the section simply doesn\'t exist yet. A single flat numbering scheme would require pre-building every possible shelf for every possible book, whether or not anything ever gets placed there.',
          connection: 'The page directory is the section index; each page table is the shelving within one section. A page directory entry marked "not present" is an entire section the library never built out, costing nothing. This is exactly why two levels beat one: the structure only costs memory where it\'s actually used, section by section, instead of paying for the entire possible address space up front.',
        },
        {
          type: 'socratic',
          question: 'A kernel that only uses the first 8MB of a 4GB virtual address space builds real second-level page tables to cover that first 8MB. How many page directory entries actually need to be marked present for the rest of the 4GB to correctly remain unmapped?',
          options: [
            'All 1024 — every entry needs to be explicitly marked, present or not',
            'Only 2 — the two page directory entries covering the first 8MB (each page table covers 4MB) need to be present; the remaining 1022 can simply be marked not-present, with no page tables allocated for them at all',
            'Only 1 — a single page directory entry can cover the entire 4GB space if needed',
          ],
          answer: 1,
          explanations: [
            'A "not present" page directory entry requires no corresponding page table to exist — there\'s nothing to build for the unused entries, only a single bit to leave cleared. Marking all 1024 wouldn\'t change what needs to exist in memory.',
            'Exactly right, and this is precisely the memory savings the two-level structure buys. Each page table covers exactly 4MB (1024 entries × 4KB pages), so two page tables cover the first 8MB. The other 1022 page directory entries stay marked not-present, and no second-level table is ever allocated for the memory they would have covered — the entire benefit of two levels over one flat table, made concrete.',
            'One page directory entry, and the page table it points to, can only ever cover 4MB (1024 × 4KB) — never more, regardless of how the entries are configured. Covering 4GB requires all 1024 directory entries pointing at 1024 separate page tables.',
          ],
        },
      ],
    },
    {
      id: 'the-code',
      title: 'Building and Activating the Real Structure',
      number: '03',
      color: '#8b5cf6',
      blocks: [
        {
          type: 'text',
          content: `Both a page directory entry and a page table entry are 32-bit values, and both use the same trick this course has relied on since Module 1: the physical address they point at is always 4KB-aligned, meaning its lowest 12 bits are always zero — so those 12 bits are reused to hold flag bits instead, OR-ed directly into the address. The three flags that matter for a working first pass: **Present** (bit 0, is this entry valid at all), **Read/Write** (bit 1, can this memory be written), and **User/Supervisor** (bit 2, can Ring 3 code access it — not yet relevant, since this course's kernel stays in Ring 0).

One deliberate choice: this code represents both structures as plain uint32_t arrays with manual shifts and masks, not C's bitfield syntax (unsigned x : 3;). Bitfield layout — which bit ends up where — is left up to the compiler by the C standard, varying across compilers and platforms. Hardware structures like this one require an exact, guaranteed bit order, which only plain integers with explicit masking can promise. This is why every real OS kernel builds structures like this the same way you're about to.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'paging.c',
          caption: 'A minimal page directory and one identity-mapped page table, activated with CR3 and CR0',
          code: `#include <stdint.h>

#define PAGE_PRESENT  0x1
#define PAGE_WRITABLE 0x2

uint32_t page_directory[1024] __attribute__((aligned(4096)));
uint32_t first_page_table[1024] __attribute__((aligned(4096)));

void paging_init(void) {
    for (int i = 0; i < 1024; i++) {
        first_page_table[i] = (i * 0x1000) | PAGE_PRESENT | PAGE_WRITABLE;
    }

    for (int i = 0; i < 1024; i++) {
        page_directory[i] = 0 | PAGE_WRITABLE;
    }

    page_directory[0] = ((uint32_t) first_page_table) | PAGE_PRESENT | PAGE_WRITABLE;

    __asm__ volatile ("mov %0, %%cr3" :: "r"(page_directory));

    uint32_t cr0;
    __asm__ volatile ("mov %%cr0, %0" : "=r"(cr0));
    cr0 |= 0x80000000;
    __asm__ volatile ("mov %0, %%cr0" :: "r"(cr0));
}`,
          annotations: [
            {
              lines: [6, 7],
              label: '__attribute__((aligned(4096)))',
              what: 'A GCC attribute forcing the compiler to place this array at a memory address that is a multiple of 4096 bytes.',
              why: 'This is the same __attribute__((...)) mechanism from Module B02\'s Multiboot header, with a different specific attribute: aligned(N) instead of section(name). CR3 and every page directory/table entry only store the upper 20 bits of a 4KB-aligned address — if page_directory or first_page_table landed at any address that wasn\'t already a multiple of 4096, part of its real address would be lost the moment it\'s stored, silently pointing at the wrong memory entirely.',
              note: null,
            },
            {
              lines: [10, 11, 12],
              label: 'first_page_table[i] = (i * 0x1000) | PAGE_PRESENT | PAGE_WRITABLE;',
              what: 'Fills every entry of the page table with an identity mapping: virtual page i maps to physical frame i.',
              why: 'i * 0x1000 computes the physical address of the i-th 4KB frame (0x1000 is 4096 in hex) — since each frame is exactly 4KB, frame i starts at byte i × 4096. OR-ing in PAGE_PRESENT and PAGE_WRITABLE is safe specifically because that computed address\'s lowest 12 bits are always zero (multiplying by 0x1000 guarantees this), so the flag bits land in space the address was never using.',
              note: 'Identity mapping — virtual address equals physical address — is deliberately simple and exists for exactly one reason: the kernel\'s own currently-executing code and data need to keep working immediately after paging turns on. Real kernels move away from a fully identity-mapped layout later; this chapter\'s version maps only the first 4MB, just enough to keep a small kernel\'s own code and data intact through the transition.',
            },
            {
              lines: [18],
              label: 'page_directory[0] = ((uint32_t) first_page_table) | PAGE_PRESENT | PAGE_WRITABLE;',
              what: 'Points the first page directory entry at the page table just built, marking it present and writable.',
              why: 'first_page_table, used here as a value, decays from an array name into a pointer to its first element — standard C array-to-pointer decay. Casting that pointer to uint32_t captures its numeric address so it can be OR-ed with the flag bits, exactly the same address-plus-flags pattern used for every entry in the loop above it. Because __attribute__((aligned(4096))) guarantees this address\'s low 12 bits are zero, OR-ing in the flags is safe here too.',
              note: null,
            },
            {
              lines: [20],
              label: '__asm__ volatile ("mov %0, %%cr3" :: "r"(page_directory));',
              what: 'Loads the physical address of the page directory into CR3 — the control register that tells the CPU where the currently active page directory lives.',
              why: 'CR3 is neither a general-purpose register (Module P03) nor an I/O port (Module B01) — it\'s a third category entirely: a control register, one of a small, fixed set (CR0, CR2, CR3, CR4 on x86-32) with special hardware meaning, accessed only through dedicated mov forms, never through in/out. "r" is a new constraint letter: unlike "a" from Module B01 (which demands specifically AL/EAX), "r" means "any general-purpose register — compiler\'s choice." Since CR3 doesn\'t require its source value in one specific register the way outb() requires AL, "r" is the correct, more flexible constraint here.',
              note: 'Notice %%cr3, not %cr3, in the template string. Because %0 is already using a single % to mean "placeholder," a literal % character meant for the assembler — needed here because AT&T-syntax register names are written with a % prefix — has to be written as %% so GCC\'s inline-asm engine doesn\'t misread it as another placeholder. This is a direct extension of Module B01\'s __asm__ syntax, not a new mechanism.',
            },
            {
              lines: [23, 24, 25],
              label: 'mov %%cr0, %0 ... cr0 |= 0x80000000; ... mov %0, %%cr0',
              what: 'Reads CR0\'s current value out, sets its highest bit (bit 31, the Paging Enable bit), and writes it back.',
              why: 'This is the exact read-modify-write pattern Module P04 used to set CR0\'s bit 0 (Protection Enable) — only the bit position changes. 0x80000000 has only bit 31 set; OR-ing it in turns paging on without disturbing every other bit CR0 already holds, including the Protection Enable bit P04 set, which must stay on.',
              note: 'The instant this final mov executes, the CPU begins translating every memory access — including the very next instruction fetch — through the page tables just built. If the code currently executing weren\'t identity-mapped, that next instruction fetch would immediately page-fault, and with no page fault handler installed yet, the result is a triple fault: the CPU resets.',
            },
          ],
        },
        {
          type: 'simulator',
          id: 'page-walk-sim',
          caption: 'Pick a virtual address and watch the real two-level walk this chapter\'s code performs',
        },
        {
          type: 'socratic',
          question: 'The chapter\'s code identity-maps only the first 4MB (one page table\'s worth) before enabling paging. What specifically would go wrong if the kernel\'s own executing code happened to be loaded at physical address 5MB instead?',
          options: [
            'Nothing — the CPU finishes executing the current instruction stream from cache before consulting the new page tables',
            'The instant CR0.PG is set, the next instruction fetch would be translated through page_directory[1] (covering 4-8MB), which was left not-present — producing an immediate page fault with no handler installed, and a triple fault',
            'Paging would silently fail to activate, since the CPU detects the code isn\'t mapped and refuses to set the PG bit',
          ],
          answer: 1,
          explanations: [
            'x86 does not defer to a cached instruction stream to avoid translation — the very next fetch after CR0.PG is set is translated through the new page tables immediately, with no grace period.',
            'Exactly right, and this is precisely the danger the final code annotation above calls out. 5MB falls in the range page_directory[1] would cover, and this chapter\'s code only marks page_directory[0] present. The moment the CPU tries to fetch the next instruction from an address the page tables say isn\'t there, it raises a page fault — and since no fault handler exists yet at this stage of the Bring-Up track, the CPU can\'t even handle its own exception, escalating to a triple fault and a full reset.',
            'The CPU performs no such safety check before enabling paging — setting bit 31 of CR0 always takes effect immediately, regardless of whether the currently executing code happens to be mapped. This is exactly why identity-mapping the kernel\'s own memory first is not optional.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: '1985: the 80386', sublabel: 'The first x86 chip with real paging hardware' },
      { label: 'Virtual address split', sublabel: '10 bits PD index, 10 bits PT index, 12 bits offset' },
      { label: 'Page directory + page tables', sublabel: 'Two levels — pay only for the address space actually used' },
      { label: 'Flags packed into low 12 bits', sublabel: 'Present, Read/Write — the same address-plus-flags trick since Module 1' },
      { label: 'CR3 loaded', sublabel: 'A control register — a third category, beyond GP registers and I/O ports' },
      { label: 'CR0.PG set', sublabel: 'Paging active — the next instruction fetch is already translated' },
    ],
    finalInsight: 'Module 2\'s page_table[] array is now the real thing: a two-level structure the CPU itself reads in silicon, on every memory access, enforced by hardware rather than narrated by an analogy. You built the exact bit layout, the exact alignment guarantees, and the exact activation sequence every x86 kernel uses — and you know precisely why skipping the identity mapping of your own running code would end the story immediately.',
    nextChapter: 'Next: paging is active, but Module P02 already admitted the truth about memory allocation at this stage — fixed-size global arrays are a temporary answer. Module B07 builds the first real one: an allocator that can actually hand out and reclaim memory on request.',
  },
}

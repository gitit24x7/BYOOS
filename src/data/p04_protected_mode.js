// p04_protected_mode.js — Prerequisite 4: Crossing into Protected Mode
export const p04 = {
  id: 'P04',
  title: 'Crossing into Protected Mode',
  subtitle: 'Real Mode gave you 1MB and zero protection. Here is how you leave it behind.',
  estimatedMinutes: 30,

  mystery: {
    type: 'mystery',
    lines: [
      'Your bootloader is still running in a 1978 CPU mode with a 1-megabyte ceiling.',
      'Your computer has gigabytes of RAM and memory protection it is not using yet.',
      'Something has to happen, in your own code,',
      'to unlock it. What?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'Why Intel Never Deleted Real Mode',
      number: '01',
      color: '#0ea5e9',
      blocks: [
        {
          type: 'history',
          content: `It's 1982. Intel ships the 80286, the first x86 chip with a genuinely new capability: Protected Mode, offering memory protection and access to more than 1 megabyte of RAM. But Intel had a hard constraint — every existing 8086 program still had to run unmodified. Their solution was to make Protected Mode an optional extra layer the CPU could switch into, while keeping Real Mode as the mode every chip powers on into by default, forever.

The 80286's Protected Mode was famously awkward — once you switched in, there was no clean documented way to switch back to Real Mode without resetting the CPU. The 80386 in 1985 fixed this and added 32-bit Protected Mode with paging, which is essentially the foundation every modern x86 OS still builds on. But the core decision from 1982 never changed: your CPU today still boots into Real Mode first, every single time, and Protected Mode is something your own code has to explicitly ask for.`,
        },
      ],
    },
    {
      id: 'gdt-structure',
      title: 'The GDT: A Table Describing What Memory Is Allowed to Do',
      number: '02',
      color: '#0ea5e9',
      blocks: [
        {
          type: 'text',
          content: `Protected Mode needs to know two things before it can do anything: where regions of memory start and end, and what's allowed to happen inside each one. That information lives in the **Global Descriptor Table (GDT)** — an array you build yourself, in memory, before you ever flip into Protected Mode. Each entry is called a **descriptor**, and each one is exactly 8 bytes, packed with these fields:

**Base** (32 bits, split across the descriptor) — where this memory region starts. **Limit** (20 bits) — how big this region is, scaled by a granularity flag that means either "in bytes" or "in 4-kilobyte pages." **Access byte** — including a Present bit, a Descriptor Privilege Level (2 bits, values 0-3 — this is the exact mechanism behind Ring 0 and Ring 3 from Module 4), whether this descriptor describes code or data, and whether it's readable/writable. **Flags** — including whether this is 16-bit or 32-bit code, and the granularity bit the limit field depends on.

Two rules matter immediately. First: **entry 0 of the GDT must be the null descriptor — all zero bytes, always.** The CPU deliberately treats loading segment 0 as an error trigger, so that accidentally leaving a segment register un-initialized after the switch causes an immediate, obvious crash instead of silently reading garbage memory. Second: almost every modern OS uses what's called a **flat memory model** — exactly one code descriptor and one data descriptor, both with base = 0 and limit covering the full 4GB range. This effectively turns segmentation into a formality that always says "yes, that address is fine" — because the real memory protection work happens later, through paging (Module 2), not through segmentation. You still need the GDT to exist and be loaded correctly; you just don't use it to subdivide memory the way 1978-era segment:offset addressing did.`,
        },
        {
          type: 'code',
          language: 'asm',
          filename: 'gdt.asm',
          caption: 'A minimal flat-model GDT — one null descriptor, one code descriptor, one data descriptor',
          code: `gdt_start:
    dq 0x0000000000000000      ; entry 0: the null descriptor — always zero

gdt_code:
    dw 0xFFFF                  ; limit (bits 0-15)
    dw 0x0000                  ; base  (bits 0-15)
    db 0x00                    ; base  (bits 16-23)
    db 10011010b               ; access byte: present, ring 0, code, readable
    db 11001111b               ; flags (4KB granularity, 32-bit) + limit (bits 16-19)
    db 0x00                    ; base  (bits 24-31)

gdt_data:
    dw 0xFFFF                  ; limit (bits 0-15)
    dw 0x0000                  ; base  (bits 0-15)
    db 0x00                    ; base  (bits 16-23)
    db 10010010b               ; access byte: present, ring 0, data, writable
    db 11001111b               ; flags (4KB granularity, 32-bit) + limit (bits 16-19)
    db 0x00                    ; base  (bits 24-31)

gdt_end:

gdt_descriptor:
    dw gdt_end - gdt_start - 1  ; size of the GDT, minus 1 (CPU convention)
    dd gdt_start                 ; linear address of the GDT`,
          annotations: [
            {
              lines: [2],
              label: 'dq 0x0000000000000000',
              what: 'Reserves 8 bytes of zero as the mandatory null descriptor.',
              why: 'This is the rule from the text above, made concrete: the CPU treats a reference to this entry as a deliberate trap. If any segment register is ever left holding selector 0 after the transition to Protected Mode, using it triggers an immediate General Protection Fault — a loud, obvious failure instead of a silent, hard-to-debug one.',
              note: null,
            },
            {
              lines: [5, 6, 7, 8, 9, 10],
              label: 'gdt_code — the code segment descriptor',
              what: 'Describes a memory region starting at base 0, spanning the full 4GB (limit 0xFFFFF scaled by 4KB granularity), marked executable and readable, at privilege level 0.',
              why: 'This is the flat model in practice: base 0x00000000 and a limit that, once the 4KB granularity flag is applied, covers all 4 gigabytes of addressable memory. The 10011010b access byte breaks down bit by bit: present=1, privilege level=00 (ring 0), descriptor type=1 (code/data, not a system descriptor), executable=1 (this is code), and the remaining bits mark it readable and not yet accessed.',
              note: 'Notice the base and limit fields are split into oddly-sized, non-contiguous chunks across the 8 bytes (bits 0-15, then 16-23, then 24-31 for the base). This fragmented layout is a historical artifact of extending the original 80286\'s smaller descriptor format for 32-bit addressing on the 80386 — not a design anyone would choose from scratch.',
            },
            {
              lines: [13, 14, 15, 16, 17, 18],
              label: 'gdt_data — the data segment descriptor',
              what: 'The same base and limit as gdt_code, but with an access byte marking it as a writable data segment instead of executable code.',
              why: 'Two descriptors, identical base and limit, different access bytes — this is exactly what "flat model" means. The regions fully overlap; the only real distinction the GDT enforces here is code versus data. ds, es, ss, fs, and gs will all point at this data descriptor once the transition is complete.',
              note: null,
            },
            {
              lines: [22, 23, 24],
              label: 'gdt_descriptor',
              what: 'A 6-byte structure holding the GDT\'s total size and its memory address — the exact value the lgdt instruction loads.',
              why: 'The CPU needs to know both where the GDT lives and how long it is, since the GDT itself is just a plain array in memory with no built-in length marker. The size is stored as one less than the actual byte count — a CPU convention, not a bug — because the maximum representable value in this field needs to express "the entire 64KB addressable by a 16-bit size," which round-trips more cleanly as (size - 1) than as size itself.',
              note: null,
            },
          ],
        },
        {
          type: 'socratic',
          question: 'Both gdt_code and gdt_data have base = 0 and limit covering all 4GB — completely overlapping regions. If segmentation isn\'t actually dividing memory into separate protected zones here, why does the OS still need two separate descriptors instead of just one?',
          options: [
            'It doesn\'t really need two — this is legacy boilerplate with no real function in a flat model',
            'The CPU still requires the code segment register (CS) and data segment registers (DS, SS, etc.) to point at descriptors marked correctly as executable vs. writable — mixing them up would mean code claiming to be data, or vice versa, which the CPU checks regardless of the flat model',
            'Two descriptors exist purely so 32-bit and 16-bit code can coexist',
          ],
          answer: 1,
          explanations: [
            'It has a real, enforced function — the CPU checks the executable and writable bits on every relevant access, even when the address ranges themselves fully overlap. Skipping this distinction isn\'t optional; the CPU requires it structurally.',
            'Exactly right. The flat model collapses the address-range distinction, but the type distinction — is this descriptor for code or data — is still mandatory and still checked. CS must point at a descriptor marked executable; loading it with a data descriptor is an error the CPU actively catches. The overlapping addresses save you from the old-style logical segmentation; they don\'t remove the requirement to correctly label what each descriptor is for.',
            'The 32-bit vs 16-bit distinction lives in the flags byte\'s size bit on a single descriptor, not in having separate code and data entries — that\'s a different, independent setting entirely.',
          ],
        },
      ],
    },
    {
      id: 'the-switch',
      title: 'Flipping the Bit: The Actual Transition',
      number: '03',
      color: '#5e9eff',
      blocks: [
        {
          type: 'text',
          content: `With the GDT built, the actual transition into Protected Mode is a short, precise sequence — five steps, none of them optional, and the order matters:

**1. Disable interrupts (cli).** If a hardware interrupt fired mid-transition, the CPU would try to handle it using structures that assume the mode you're about to leave — a guaranteed crash. Interrupts stay off until Module P05's Interrupt Descriptor Table is fully set up on the other side.

**2. Load the GDT (lgdt).** This loads the address and size of your descriptor table into a hidden CPU register (GDTR) — the CPU now knows where to look, but hasn't changed modes yet.

**3. Set the PE bit in CR0.** CR0 is a special control register; its lowest bit is the Protection Enable flag. The instant this bit flips from 0 to 1, the CPU is technically in Protected Mode.

**4. Far jump to flush the pipeline.** Modern CPUs decode instructions ahead of where they're currently executing (a "prefetch queue"), and some of what's already queued may have been decoded under the old 16-bit rules. A far jump — one that explicitly names a new code segment selector — forces the CPU to discard anything queued and reload CS from the GDT.

**5. Reload the remaining segment registers.** CS was updated by the far jump; ds, es, ss, fs, and gs still hold stale Real Mode values and need to be explicitly pointed at the new data descriptor.

Miss any one of these five steps, get the order wrong, or reference the wrong GDT entry, and the result is almost always an immediate triple fault — the CPU's last-resort response when something goes wrong badly enough that it can't even report an error: it resets.`,
        },
        {
          type: 'simulator',
          id: 'protected-mode-sim',
          caption: 'Step through the exact Real Mode → Protected Mode transition sequence',
        },
        {
          type: 'code',
          language: 'asm',
          filename: 'enter_protected_mode.asm',
          caption: 'The complete five-step sequence, assembled — this is the literal next instruction after Module 1\'s bootloader',
          code: `[BITS 16]
enter_protected_mode:
    cli                          ; Step 1: no interruptions during the switch
    lgdt [gdt_descriptor]        ; Step 2: CPU now knows where the GDT lives

    mov eax, cr0                 ; Step 3: read CR0...
    or eax, 1                    ;         ...set bit 0 (PE)...
    mov cr0, eax                 ;         ...write it back. Protected Mode is now ON.

    jmp 0x08:flush_pipeline       ; Step 4: far jump — 0x08 selects gdt_code

[BITS 32]
flush_pipeline:
    mov ax, 0x10                 ; Step 5: 0x10 selects gdt_data
    mov ds, ax
    mov es, ax
    mov ss, ax
    mov fs, ax
    mov gs, ax

    ; Protected Mode is now fully active — 32-bit code from here on`,
          annotations: [
            {
              lines: [1, 12],
              label: '[BITS 16] ... [BITS 32]',
              what: 'Tells the assembler which instruction-encoding rules to use for each section of code.',
              why: 'This is an instruction to the assembler, not the CPU — it exists because the same bytes can mean different instructions depending on whether they\'re decoded as 16-bit or 32-bit code. Everything before the far jump is still running in 16-bit Real Mode, so it must be assembled as 16-bit. Everything after the far jump is running in 32-bit Protected Mode, so it must be assembled as 32-bit. Getting this wrong produces a binary that assembles fine but crashes the instant it runs, because the bytes decode into different instructions than you intended.',
              note: null,
            },
            {
              lines: [9],
              label: 'jmp 0x08:flush_pipeline',
              what: 'A far jump — explicitly naming both a segment selector (0x08) and a target address.',
              why: '0x08 is the byte offset of gdt_code within the GDT (the null descriptor is 0, each descriptor is 8 bytes, so the second entry starts at offset 8) — this is exactly the "selector" concept: an index into the GDT, not a raw address. This single instruction does two jobs at once: it reloads CS with a valid Protected Mode selector, and it flushes the CPU\'s prefetch queue, which is why it has to happen before any other 32-bit instruction can be trusted to execute correctly.',
              note: 'A regular (near) jmp only changes the instruction pointer — it never touches a segment register. A far jump\'s whole purpose here is that it DOES touch CS, which is the only way to update it outside of an interrupt or a call through a task gate.',
            },
            {
              lines: [14, 15, 16, 17, 18],
              label: 'mov ax, 0x10 / mov ds, ax / mov es, ax ...',
              what: 'Loads the data segment selector (0x10, the third GDT entry) into every remaining segment register.',
              why: '0x10 is 16 in decimal — the byte offset of gdt_data, which sits right after gdt_code\'s 8 bytes starting at offset 8. Segment registers cannot be loaded directly with an immediate value in most cases, which is why the value goes through ax first. Every one of these five registers was still holding a Real Mode value until this exact point — this is the last step of the transition, and it\'s a genuinely common bug to forget one of them.',
              note: null,
            },
          ],
        },
        {
          type: 'explicit-insight',
          text: 'Protected Mode is not a switch the CPU flips for you, and it is not automatic. It is exactly five deliberate steps you write yourself: disable interrupts, tell the CPU where your descriptor table lives, flip one bit, force a full pipeline flush with a far jump, and reload every remaining segment register. There is no step six. Once this sequence completes, your CPU has permanently left the 1978 mode from Module 1 behind, for as long as this boot session runs.',
        },
        {
          type: 'socratic',
          question: 'What specifically goes wrong if you set the PE bit in CR0 (step 3) but skip the far jump (step 4) and just fall through to the next 16-bit-assembled instruction?',
          options: [
            'Nothing — the PE bit alone is sufficient to fully switch modes, the far jump is just a best practice',
            'CS still holds its stale Real Mode value, and any instructions already sitting in the CPU\'s prefetch queue were decoded under the old 16-bit rules — so execution continues misinterpreting bytes until something crashes unpredictably',
            'The CPU automatically inserts an implicit far jump the first time it notices PE has changed',
          ],
          answer: 1,
          explanations: [
            'The PE bit changes how the CPU interprets instructions going forward, but it does not retroactively fix CS or flush anything already queued — the far jump exists precisely because the PE bit alone is not sufficient.',
            'Exactly right, and this is precisely why the far jump is listed as its own mandatory step rather than folded into "set the PE bit." CS is a hidden register with its own cached descriptor information from Real Mode, and the CPU\'s prefetch queue may hold instructions decoded under the old rules. Nothing about flipping one control-register bit forces either of those to refresh — only an explicit far jump, naming a real GDT selector, does that.',
            'x86 does not do this automatically — silent, unpredictable behavior after a PE-bit-only transition is a real and well-documented failure mode in early OS development, not a hypothetical.',
          ],
        },
      ],
    },
    {
      id: 'selectors-and-rings',
      title: 'Selectors and Rings: The Mechanism Behind Module 4\'s Boundary',
      number: '04',
      color: '#22d3ee',
      blocks: [
        {
          type: 'text',
          content: `Module 4 introduced Ring 0 and Ring 3 as a concept — the CPU's hardware-enforced privilege boundary. This chapter has been building the actual mechanism the whole time, without naming it yet: **the value you load into a segment register isn't just an index — it's called a selector, and it packs a privilege level directly into its lowest 2 bits.**

A selector like 0x08 (used for CS above) is really: bits 15-3 are the descriptor's index in the GDT, bit 2 is the Table Indicator (0 for GDT, 1 for a different table called the LDT), and bits 1-0 are the Requested Privilege Level (RPL) — a number from 0 to 3. When code tries to access memory through a segment, the CPU compares that selector's privilege level against the target descriptor's own Descriptor Privilege Level (DPL, from the GDT entry's access byte, mentioned earlier in this chapter). Access is only allowed if the requesting privilege is equal to or more trusted than the descriptor allows.

This is the literal hardware check behind everything Module 4 described as "Ring 3 code cannot touch Ring 0 memory." It isn't a convention the OS enforces through discipline — it's arithmetic the CPU performs on every single memory access, comparing two small numbers packed into descriptors and selectors exactly like the ones you just built.`,
        },
        {
          type: 'connection-bridge',
          concept: 'Hardware-Enforced Privilege Levels',
          coreIdea: 'Tag every actor and every resource with a trust level, and let the hardware — not application logic — refuse any access where the actor is less trusted than the resource requires.',
          connections: [
            { icon: '💻', domain: 'ARM Exception Levels', description: 'ARM processors (used in every phone and most modern laptops) use a nearly identical idea called Exception Levels — EL0 through EL3, EL0 being least privileged (applications), EL3 most privileged (secure firmware). Different vendor, same core mechanism: a small number, checked in hardware, on every privileged operation.' },
            { icon: '🖥️', domain: 'Hypervisor "Ring -1"', description: 'When virtualization (VMware, Hyper-V, KVM) runs a guest OS, the guest\'s own "Ring 0" kernel is no longer the most privileged thing on the machine — the hypervisor sits below it, sometimes informally called "Ring -1," using CPU virtualization extensions to intercept and control what the guest kernel\'s Ring 0 is actually allowed to do to real hardware.' },
            { icon: '🗄️', domain: 'Database row-level security', description: 'A GDT descriptor tagging memory with a required privilege level is conceptually the same move as a Postgres row-level security policy tagging rows with which database role may read or write them — a resource carries a required trust level, checked automatically on every access, not left to application code to remember.' },
            { icon: '🪪', domain: 'Employee badge access tiers', description: 'A building where your badge (the selector, carrying your clearance level) is checked against each door\'s required clearance (the descriptor\'s DPL) is the exact same access-control shape: two small numbers compared at the point of access, enforced by the door itself, not by trusting people to only walk through doors they\'re supposed to.' },
          ],
          punchline: 'Ring 0 and Ring 3 were never a special x86 invention — they\'re one instance of the oldest access-control pattern in computing: tag the actor, tag the resource, compare the two numbers at the moment of access, and let the enforcement point (hardware, database, door) refuse the mismatch automatically. You just built the exact descriptors and selectors that make this comparison possible on real x86 hardware.',
        },
        {
          type: 'what-this-means',
          text: 'Every single memory access your computer makes right now — while you read this sentence — passes through a privilege check built from exactly the selectors and descriptors in this chapter. Your browser\'s Ring 3 code cannot forge a selector claiming Ring 0 access; the CPU checks the actual privilege level embedded in CS on every attempt, in hardware, with no software able to lie about it from inside Ring 3.',
        },
        {
          type: 'socratic',
          question: 'A GDT code descriptor has DPL = 0 (kernel-only). A user-mode program\'s CS register holds a selector with RPL = 3. What happens if that program tries to jump directly to code described by that DPL-0 descriptor?',
          options: [
            'It succeeds — RPL only matters for data access, not for jumping to code',
            'The CPU denies it — the requesting privilege level (3, least trusted) is less privileged than the descriptor requires (0, most trusted), so the access is refused',
            'It succeeds, but only if the target code has the readable bit set in its access byte',
          ],
          answer: 1,
          explanations: [
            'RPL and DPL checks apply to code segment access too, not just data — this is precisely the mechanism that makes Ring 3 code unable to simply jump into kernel code and start executing with elevated privilege.',
            'Exactly right — and this is the actual, literal hardware mechanism behind the entire Ring 0 / Ring 3 boundary Module 4 described conceptually. A privilege level of 3 is the least trusted; a descriptor requiring 0 is the most trusted. The CPU refuses the access rather than silently allowing a less-trusted selector to reach a more-trusted resource. This is not a software policy an OS chooses to enforce — it is arithmetic the CPU performs unconditionally.',
            'The readable bit governs whether data can be read from a code segment — it has no bearing on whether a jump into that segment is privilege-checked. The privilege comparison happens regardless of that bit\'s value.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'Real Mode', sublabel: 'Where Module 1 left off — 1MB, no protection' },
      { label: 'GDT built in memory', sublabel: 'Null descriptor, code descriptor, data descriptor' },
      { label: 'cli', sublabel: 'Interrupts disabled for the duration of the switch' },
      { label: 'lgdt', sublabel: 'CPU now knows where the descriptor table lives' },
      { label: 'CR0.PE = 1', sublabel: 'One bit flips — Protected Mode is technically on' },
      { label: 'Far jump', sublabel: 'Prefetch queue flushed, CS reloaded from the GDT' },
      { label: 'Data segments reloaded', sublabel: 'ds/es/ss/fs/gs all point into the new GDT' },
      { label: 'Protected Mode active', sublabel: '32-bit, 4GB, privilege levels enforced in hardware' },
    ],
    finalInsight: 'You now know exactly how a CPU leaves the 46-year-old compatibility mode it powers on into. Five deliberate steps — disable interrupts, load a table you built yourself, flip one bit, force a pipeline flush, reload the remaining registers — and the same selectors and descriptors that make this transition possible are the literal hardware mechanism behind Ring 0 and Ring 3. Nothing about Protected Mode is automatic. You asked for it, explicitly, in exactly the order the hardware requires.',
    nextChapter: 'Next: Protected Mode is active, but there is still a piece missing — you disabled interrupts in step 1 of this chapter, and they still need a real destination once re-enabled. Module P05 builds the Interrupt Descriptor Table: the mechanism that lets a timer, a keyboard, or a syscall instruction safely interrupt running code and hand control to the kernel, which Module 3\'s scheduler and Module 4\'s syscalls both depend on completely.',
  },
}

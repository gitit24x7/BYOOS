// b02_multiboot.js — Bring-Up 2: The Multiboot Header
export const b02 = {
  id: 'B02',
  title: 'The Multiboot Header',
  subtitle: 'GRUB will not load your kernel out of good faith. It checks for a signature first.',
  estimatedMinutes: 20,

  mystery: {
    type: 'mystery',
    lines: [
      'Module 1\'s bootloader checked for exactly two bytes — 0xAA55 — before trusting a disk sector.',
      'GRUB, the bootloader almost every real hobby kernel actually uses, has its own version of that same handshake.',
      'Your compiled kernel.bin is just bytes to GRUB until you prove something about it.',
      'What, exactly, do you have to prove?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'One Bootloader, Any Kernel',
      number: '01',
      color: '#34d399',
      blocks: [
        {
          type: 'history',
          content: `It's the early 1990s, and every OS project has the same expensive problem: a bootloader that only knows how to load one specific kernel format. Linux has its own boot process, the BSDs have theirs, Mach has another — and every new hobby OS project either has to write an entire bootloader from scratch (disk driver, filesystem parser, the works) or convince an existing one to special-case their format.

The GNU project's answer, published in 1995, was the Multiboot Specification: a single, simple contract that any bootloader could check for, and any kernel could satisfy. GRUB implemented it, and almost overnight, one bootloader could load any compliant kernel, from any OS project, without GRUB's authors needing to know or care what that kernel actually was. The contract itself is tiny — three 32-bit words — which is exactly why it worked. Nearly every hobby OS built since, including the one you're building, boots this exact way.`,
        },
      ],
    },
    {
      id: 'why-grub',
      title: 'Why Switch From Your Own Bootloader to GRUB',
      number: '02',
      color: '#34d399',
      blocks: [
        {
          type: 'text',
          content: `Module 1 taught you what a bootloader fundamentally does by writing one entirely by hand: read the boot signature, load 512 bytes, execute them. That was never wasted effort — but writing a bootloader capable of loading a real, multi-file kernel off a real filesystem means also writing a disk driver and a filesystem parser (FAT, ISO9660, whatever the boot media uses), none of which teaches you anything new about operating systems. It's just a large amount of work standing between you and the parts you actually came here to build.

GRUB already solved that problem, reliably, for every hobby OS project that came after it. Starting from this module, your kernel boots via GRUB instead of a hand-written first-stage loader — and GRUB does something specific for you before it ever jumps to your code: it leaves the CPU already in 32-bit Protected Mode, with the A20 line already enabled and paging still disabled. This is exactly the end state Module P04's Real Mode → Protected Mode transition built by hand. You still needed to understand that transition — GRUB doing it for you now only makes sense because you already know what "doing it" actually involves.

GRUB also hands you two things the instant your kernel starts running: **EAX** contains a specific magic value (0x2BADB002) confirming a real Multiboot-compliant loader is what got you here, and **EBX** contains the address of a Multiboot information structure — a map of what GRUB discovered about the machine, including a real memory map you'll use directly in Module B06.`,
        },
        {
          type: 'callout',
          variant: 'insight',
          content: 'This is not "cheating" or skipping ahead — it\'s the same tradeoff every real hobby OS project makes. Writing your own first-stage bootloader (Module 1) is how you learn what a bootloader actually is. Using GRUB afterward is how you stop re-solving an already-solved problem so you can spend your remaining effort on the kernel itself, which is the part that\'s actually specific to your OS.',
        },
        {
          type: 'socratic',
          question: 'Given that GRUB already performs the Real Mode → Protected Mode transition before jumping to your kernel, what does that mean about the first line of code your kernel needs to execute?',
          options: [
            'It still needs to disable interrupts, build a GDT, and flip CR0.PE, exactly like Module P04\'s sequence, since GRUB doesn\'t touch the CPU mode at all',
            'It can start directly as 32-bit code, with no Real Mode setup of its own — the entire P04 transition has already happened by the time GRUB hands off control',
            'It needs to redo the transition anyway, because GRUB\'s Protected Mode setup is incompatible with a kernel\'s own GDT',
          ],
          answer: 1,
          explanations: [
            'This describes exactly what GRUB has already done on your behalf — redoing it would be redundant, and this chapter specifically says GRUB leaves you already in Protected Mode.',
            'Exactly right. By the time your kernel\'s entry point runs, GRUB has already done everything Module P04 built by hand: GDT loaded, PE bit set, far jump completed, segments reloaded. Your kernel can simply begin as ordinary 32-bit code. This is precisely why understanding P04 mattered even though GRUB does it for you now — you know exactly what state you\'re inheriting instead of treating it as a black box.',
            'GRUB\'s Protected Mode setup is a real, standard CPU state — nothing about it prevents your kernel from loading and using its own GDT afterward if it wants a different one. There is no incompatibility here.',
          ],
        },
      ],
    },
    {
      id: 'the-header',
      title: 'Three 32-Bit Words GRUB Scans For',
      number: '03',
      color: '#10b981',
      blocks: [
        {
          type: 'text',
          content: `The entire Multiboot contract is three consecutive 32-bit values, somewhere within the first 8 kilobytes of your compiled kernel, aligned to a 4-byte boundary. GRUB scans that first 8KB looking for this exact pattern before it will trust the file enough to load it as a kernel at all — the direct equivalent of Module 1's BIOS scanning for 0xAA55 at the end of a boot sector.

**magic** is always exactly 0x1BADB002 — a fixed constant, the same idea as 0xAA55, just a different number and a different bootloader checking for it. **flags** is a bitmask (Module P01's bitwise chapter) describing what you're asking GRUB to do for you — bit 0 requests page-aligned modules, bit 1 requests that GRUB provide a memory map. **checksum** is where Multiboot differs from Module 1's approach: instead of a second fixed constant, it's a value chosen specifically to make magic + flags + checksum sum to exactly zero, modulo 2³². GRUB doesn't just check for a fixed pattern — it does the arithmetic itself and confirms the sum is zero, which catches corruption a fixed two-byte signature couldn't.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'multiboot.c',
          caption: 'The complete Multiboot header — three words, placed exactly where GRUB expects to find them',
          code: `#define MULTIBOOT_MAGIC 0x1BADB002
#define MULTIBOOT_FLAGS  0x00000003

__attribute__((section(".multiboot")))
const unsigned int multiboot_header[3] = {
    MULTIBOOT_MAGIC,
    MULTIBOOT_FLAGS,
    (unsigned int)(-(MULTIBOOT_MAGIC + MULTIBOOT_FLAGS))
};`,
          annotations: [
            {
              lines: [2],
              label: '#define MULTIBOOT_FLAGS 0x00000003',
              what: 'Sets bits 0 and 1 of the flags word: 0x03 is 00000011 in binary.',
              why: 'Bit 0 (value 1) asks GRUB to page-align any additional modules it loads alongside your kernel. Bit 1 (value 2) asks GRUB to populate the memory map information you\'ll read from the structure EBX points at in Module B06. OR-ing 1 and 2 together gives 3 — the exact shift-and-combine idiom from Module P01\'s bitwise chapter, just written as a single literal here since both bits are known at compile time.',
              note: null,
            },
            {
              lines: [4],
              label: '__attribute__((section(".multiboot")))',
              what: 'A GCC-specific attribute telling the compiler to place this variable in a section named .multiboot, instead of the default .data or .rodata section it would otherwise choose.',
              why: '__attribute__((...)) is GCC\'s general syntax for attaching compiler-specific instructions to a declaration — you\'ve seen this exact syntax before in Module P02\'s packed structs, and section("name") is a different attribute using the same mechanism. Without this, the linker would be free to place multiboot_header anywhere at all in the final binary, including well past the first 8KB GRUB actually scans — and GRUB would never find it, silently refusing to boot your kernel with no useful error message.',
              note: 'This is exactly why Module P06\'s linker script matters here: __attribute__((section(".multiboot"))) only says "put this in a section named .multiboot" — it says nothing about where that section ends up in the final binary. The linker script (next section of this chapter) is what actually guarantees .multiboot lands within the first 8KB.',
            },
            {
              lines: [5, 6, 7, 8, 9],
              label: 'const unsigned int multiboot_header[3] = { ... }',
              what: 'Declares the three required words as a plain array, initialized with the magic number, the flags, and a computed checksum.',
              why: 'GRUB doesn\'t care that this is expressed as a C array — it only cares about the three raw 32-bit values sitting in memory, in order. Declaring it as a normal C array is simply the easiest way to get the compiler to emit exactly 12 bytes in the right order, with correct alignment (the compiler naturally 4-byte-aligns an array of unsigned int).',
              note: null,
            },
            {
              lines: [8],
              label: '(unsigned int)(-(MULTIBOOT_MAGIC + MULTIBOOT_FLAGS))',
              what: 'Computes the one value that makes all three words sum to zero, using negation rather than subtraction.',
              why: 'Negating a value and adding it is the same as subtracting it — but written as negation here specifically because that\'s the idiom Multiboot\'s own specification uses, and it makes the intent ("this value cancels the other two out") more direct to read than an equivalent subtraction would. The actual arithmetic guarantee comes from two\'s complement representation (Module P01): negating a value in a fixed-width unsigned integer and adding it back always produces zero, modulo 2 to the width of that integer — exactly the "sum to zero mod 2³²" rule GRUB checks.',
              note: 'The outer (unsigned int) cast matters: without it, the negation could be computed in a wider or signed intermediate type depending on the compiler, and the result written into the array might not be the exact 32-bit pattern GRUB\'s arithmetic expects. Casting explicitly forces the truncation to happen exactly where the specification assumes it does.',
            },
          ],
        },
        {
          type: 'socratic',
          question: 'Module 1\'s BIOS checks for a fixed 2-byte value, 0xAA55. Multiboot\'s checksum is computed from magic and flags rather than being a second fixed constant. What does the computed-checksum approach catch that a fixed second constant like 0xAA55 could not?',
          options: [
            'Nothing extra — both approaches are equally good at detecting a valid header',
            'If flags gets corrupted or edited without updating a fixed second constant, the fixed-constant check would still pass — but a computed checksum tied to flags\'s actual value would immediately fail, since the sum would no longer be zero',
            'The computed checksum lets GRUB support kernels larger than 512 bytes, which a fixed constant could not',
          ],
          answer: 1,
          explanations: [
            'A fixed constant has no relationship to the other two values at all — that\'s exactly the gap a computed checksum closes. They are not equivalent in what they can detect.',
            'Exactly right. Module 1\'s 0xAA55 only proves "these last two bytes are what we expect" — it says nothing about whether the 510 bytes before it are intact. Multiboot\'s checksum is derived from magic and flags specifically so that changing either one without recomputing the checksum breaks the zero-sum property immediately. It\'s a real (if simple) integrity check, not just a fixed handshake.',
            'The 512-byte limit in Module 1 came from the disk sector size the BIOS reads, a completely separate constraint from anything about signatures or checksums — Multiboot kernels can already be arbitrarily large regardless of how the header is checked.',
          ],
        },
      ],
    },
    {
      id: 'linker-placement',
      title: 'Making Sure GRUB Actually Finds It',
      number: '04',
      color: '#a78bfa',
      blocks: [
        {
          type: 'text',
          content: `The attribute in the previous section only requests a section named .multiboot — it says nothing about where the linker actually puts that section in the final binary. GRUB only scans the first 8KB. If .multiboot ends up anywhere past that, GRUB will scan the whole region, find nothing, and simply refuse to boot the kernel, usually with a terse "invalid or unsupported executable format" and no further explanation.

This means Module P06's linker script needs exactly one addition: an explicit rule placing .multiboot first, before anything else, so it's guaranteed to start at the very beginning of the loaded image.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'linker.ld',
          caption: 'Module P06\'s linker script, with one addition: .multiboot placed first',
          code: `ENTRY(kernel_main)

SECTIONS
{
    . = 1M;

    .multiboot : {
        *(.multiboot)
    }

    .text : {
        *(.text)
    }

    .rodata : {
        *(.rodata)
    }

    .data : {
        *(.data)
    }

    .bss : {
        *(COMMON)
        *(.bss)
    }
}`,
          annotations: [
            {
              lines: [6, 7, 8],
              label: '.multiboot : { *(.multiboot) }',
              what: 'A new section rule, placed immediately after the location counter is set to 1M, before .text.',
              why: 'Linker scripts place sections in the exact order they\'re written (Module P06\'s own chapter covers this) — by listing .multiboot first, it\'s guaranteed to occupy the very first bytes of the loaded kernel image, starting right at address 0x100000. Since GRUB scans from the start of the file for the first 8KB, and the multiboot_header array is only 12 bytes, it is now certain to be found in the first few bytes scanned, regardless of how large the rest of the kernel grows.',
              note: 'If .multiboot were left out of the linker script entirely, the *(.text) rule\'s default catch-all behavior in many linker configurations could still place it somewhere — but at an unpredictable offset, likely well past 8KB once the kernel has any meaningful amount of code. Explicit placement isn\'t optional caution here; it\'s the only reliable guarantee.',
            },
          ],
        },
        {
          type: 'connection-bridge',
          concept: 'Standard Boot Contracts',
          coreIdea: 'A generic loader can load many different specific payloads only if every payload agrees to expose the same fixed, checkable signature in the same place.',
          connections: [
            { icon: '🖥️', domain: 'UEFI boot', description: 'Modern UEFI firmware looks for a specific PE/COFF executable format with a defined entry point convention — a completely different contract than legacy BIOS/Multiboot, but solving the identical problem: "how does generic firmware recognize something it should execute."' },
            { icon: '🐧', domain: 'Linux\'s bzImage boot protocol', description: 'The Linux kernel itself defines a boot protocol (a header with magic numbers and specific fields) so that bootloaders other than GRUB — syslinux, U-Boot, cloud hypervisors — can all load a Linux kernel without needing Linux-specific code.' },
            { icon: '📱', domain: 'Android boot.img format', description: 'Android devices boot from a boot.img file with its own fixed magic string ("ANDROID!") and header layout, checked by the device\'s bootloader before it will load the kernel and ramdisk inside — the exact same "prove you\'re a valid payload" pattern, on a phone instead of a PC.' },
          ],
          punchline: 'Every layered boot process in computing reduces to the same shape: a generic first-stage loader that only agrees to hand off control to something proving it belongs there, using a signature checked at a known, fixed location. Module 1\'s 0xAA55, this chapter\'s Multiboot header, UEFI\'s PE format, and Android\'s boot.img are four different numbers checked in four different ways — all the same idea.',
        },
        {
          type: 'what-this-means',
          text: 'From this module forward, every kernel binary you build in the Bring-Up track starts with these exact 12 bytes, checked by GRUB before your own code ever runs. This is the actual boot process a huge fraction of real hobby operating systems use today — not a simplified stand-in for it.',
        },
        {
          type: 'socratic',
          question: 'Suppose you add a large global array to your kernel, and by coincidence the compiler decides to place it in memory before .multiboot despite the linker script\'s ordering — pushing the header past the 8KB mark. What would you expect to observe?',
          options: [
            'The kernel would boot normally — GRUB scans the entire binary, not just the first 8KB',
            'GRUB would fail to recognize the kernel as bootable at all, since it only scans the first 8KB for the header — this is exactly why the linker script explicitly orders .multiboot first rather than leaving section placement to chance',
            'The kernel would boot, but with the wrong entry point',
          ],
          answer: 1,
          explanations: [
            'GRUB\'s scan window is specifically bounded to the first 8KB by the Multiboot specification — it will not search the entire file looking for a header that could be anywhere.',
            'Exactly right, and this is precisely the failure mode the explicit linker script ordering in this chapter prevents. If .multiboot doesn\'t start early enough, GRUB\'s scan simply never reaches it, and GRUB reports the kernel as not a valid Multiboot image — even though the header exists somewhere in the file. This is why the linker script\'s section order isn\'t a minor style choice; it\'s load-bearing.',
            'Entry point selection is controlled separately by the ENTRY(kernel_main) directive and the ELF header (Module P06) — it has no relationship to whether GRUB can find the Multiboot header. The two mechanisms fail independently.',
          ],
        },
        {
          type: 'checkpoint',
          label: 'Checkpoint: GRUB Accepts Your Kernel',
          command: 'grub-mkrescue -o byoos.iso isodir && qemu-system-i386 -cdrom byoos.iso',
          output: `GNU GRUB  version 2.06

*BYOOS

Booting 'BYOOS'

(no crash, no "invalid or unsupported executable format" — control reaches your kernel)`,
          note: 'At this stage there is nothing to print yet — Module P02\'s screen code isn\'t wired in until Module B11 assembles everything together. The actual proof this module worked is negative: no "invalid or unsupported executable format" error, and QEMU does not immediately drop back to the GRUB menu or a rescue prompt.',
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: '1995: the Multiboot Spec', sublabel: 'One bootloader, any compliant kernel' },
      { label: 'GRUB scans the first 8KB', sublabel: 'Looking for magic, flags, checksum' },
      { label: 'magic = 0x1BADB002', sublabel: 'A fixed constant, like Module 1\'s 0xAA55' },
      { label: 'checksum computed, not fixed', sublabel: 'magic + flags + checksum sums to zero' },
      { label: '.multiboot placed first', sublabel: 'The linker script guarantees GRUB finds it' },
      { label: 'GRUB hands off control', sublabel: 'Already in Protected Mode — EAX and EBX set' },
    ],
    finalInsight: 'Twelve bytes, checked with real arithmetic instead of a fixed pattern, is the entire reason GRUB will trust your kernel enough to load it. Everything after this point in the Bring-Up track assumes GRUB has already done the work Module P04 built by hand — Protected Mode active, a memory map waiting in the structure EBX points at — and your kernel\'s very first instruction can simply begin.',
    nextChapter: 'Next: GRUB will now load and run your kernel, but the moment you enable interrupts, your kernel is defenseless — Module P05\'s IDT exists, but the timer and keyboard interrupts still collide with CPU exceptions at the hardware level, exactly as that chapter warned. Module B03 sends the exact bytes that fix this permanently: remapping the PIC.',
  },
}

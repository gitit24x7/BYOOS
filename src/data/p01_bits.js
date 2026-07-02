// p01_bits.js — Prerequisite 1: Speaking in Bits
export const p01 = {
  id: 'P01',
  title: 'Speaking in Bits',
  subtitle: 'Hex, binary, and boolean logic — the alphabet everything else in this course is written in.',
  estimatedMinutes: 20,

  mystery: {
    type: 'mystery',
    lines: [
      'Your bootloader ended with the exact bytes 0xAA55.',
      'Not 43605. Not "the boot signature number."',
      '0xAA55.',
      'Why does every OS developer on Earth talk in a number system',
      'you have never used at the grocery store?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'Why Computers Count in Two',
      number: '01',
      color: '#67e8f9',
      blocks: [
        {
          type: 'history',
          content: `It's 1937. Claude Shannon, a graduate student at MIT, is staring at a problem: telephone switching circuits are built from relays that are either open or closed, and nobody has a clean mathematical language for describing what they do. He remembers a system invented by George Boole nearly a century earlier — an algebra where every value is either true or false, combined with AND, OR, and NOT. Shannon realizes Boole's algebra describes electrical switching circuits perfectly: a closed relay is "true," an open one is "false."

His master's thesis proves that any circuit made of switches can be designed using Boolean algebra — and it becomes the theoretical foundation for every digital computer built since. That's why your CPU speaks in two states instead of ten: a transistor is far more reliable at reading "on or off" than at reliably distinguishing ten different voltage levels. Binary isn't a design choice programmers made. It's the physics talking.`,
        },
      ],
    },
    {
      id: 'binary-basics',
      title: 'Binary: The Only Number System the Hardware Actually Has',
      number: '02',
      color: '#67e8f9',
      blocks: [
        {
          type: 'text',
          content: `Here's the thing about binary: it's not a special "computer number system." It's the exact same place-value idea you already know from decimal — just with fewer symbols.

In decimal, each position is worth a power of 10: the number 137 means 1×100 + 3×10 + 7×1. You have ten symbols (0-9) per position, so each position is worth 10× the one before it.

In binary, you only have two symbols — 0 and 1 — so each position is worth 2× the one before it. The number **10001001** means:

128 + 0 + 0 + 0 + 8 + 0 + 0 + 1 = **137**

Same value. Same underlying idea. The only difference is how many symbols you're allowed per position. A single binary digit is called a **bit**. Eight bits grouped together is a **byte** — and a byte can represent exactly 256 different values (0 through 255), because 2⁸ = 256.`,
        },
        {
          type: 'analogy',
          analogy: 'A row of eight light switches on a wall, each one either up (1) or down (0). You can\'t dim them — each one is fully on or fully off. But by choosing which switches are up, you can represent 256 different "patterns" with just those eight switches.',
          connection: 'Now here\'s why that maps perfectly: a byte in your computer\'s memory IS eight light switches — except instead of controlling a lamp, each switch is a tiny transistor holding a electrical charge (1) or not (0). "Reading a byte" just means checking which of the eight switches are up. There is no dimmer switch in a computer. Every single value, no matter how complex, ultimately decomposes into a very long row of on/off switches.',
        },
        {
          type: 'callout',
          variant: 'insight',
          content: 'You might wonder why computers didn\'t use base-10, since that\'s what humans already know. The answer is reliability, not convenience: a transistor holding "5 volts" can drift to 4.7 or 5.3 volts from heat or interference, and still reliably reads as "high." A circuit trying to distinguish 10 separate voltage levels would misread constantly. Two states — high and low — leaves a huge safety margin between them. That margin is why binary won.',
        },
        {
          type: 'socratic',
          question: 'A byte has 8 bits, so it can represent 256 distinct values (0-255). If you needed to represent every possible value a variable could hold in a language that uses 16-bit integers, how many distinct values would you need to cover?',
          options: [
            '512 — double the values, because it\'s double the bits',
            '65,536 — because each additional bit doubles the total count, not adds to it',
            '256 — the same, since a byte is still the basic unit either way',
          ],
          answer: 1,
          explanations: [
            'This is the trap: doubling the number of bits does not double the range. Every bit you add doubles the count of possible combinations, and that compounds — it does not just add on top of the previous total.',
            'Exactly right. Each bit you add doubles how many patterns are possible: 2⁸ = 256 for 8 bits, so 2¹⁶ = 65,536 for 16 bits. This is why going from 32-bit to 64-bit systems wasn\'t "twice the memory" — it was billions of times more addressable memory, because the exponent doubled, not the base.',
            'A byte is 8 bits specifically — 16 bits is two bytes\' worth of range, and because each bit doubles the possibilities, that\'s a much bigger jump than "twice as many values."',
          ],
        },
      ],
    },
    {
      id: 'hex-basics',
      title: "Hex: Binary's Human-Readable Nickname",
      number: '03',
      color: '#22d3ee',
      blocks: [
        {
          type: 'text',
          content: `Binary is what the hardware has. But nobody wants to read or write **10101010 01010101** by hand — it's long, and it's easy to miscount a digit. That's what hexadecimal (hex) is for. Hex isn't a different way of thinking about numbers — it's a compression trick for writing binary faster.

Here's the exact reason it works: **4 bits can represent exactly 16 values** (2⁴ = 16), and hex uses exactly 16 symbols — 0 through 9, then A through F for the values 10 through 15. That means one hex digit always maps to exactly 4 bits, no remainder, no rounding. Split any byte into two 4-bit halves (called **nibbles**), convert each nibble to one hex digit, and you've turned 8 characters of binary into 2 characters of hex — with zero information lost and zero math required to convert back.

| Binary (nibble) | Hex digit | Decimal |
|---|---|---|
| 0000 | 0 | 0 |
| 0101 | 5 | 5 |
| 1010 | A | 10 |
| 1111 | F | 15 |

That's the whole trick. **0xAA55** — the boot signature from Module 1 — is just **1010 1010 0101 0101** in binary, written in a form a human can actually read without losing their place.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'bits_and_hex.c',
          caption: 'Reading and writing values in hex, binary, and decimal — three views of the exact same bits',
          code: `#include <stdio.h>

int main() {
    unsigned char boot_low  = 0x55;   // low byte of the boot signature
    unsigned char boot_high = 0xAA;   // high byte of the boot signature

    // Decimal, hex, and binary are just three notations for the same value
    printf("boot_low  = %d (decimal) = 0x%02X (hex)\\n", boot_low, boot_low);
    printf("boot_high = %d (decimal) = 0x%02X (hex)\\n", boot_high, boot_high);

    // Combine two bytes into one 16-bit value using a shift
    unsigned short signature = (boot_high << 8) | boot_low;
    printf("Combined signature = 0x%04X\\n", signature);

    // Print boot_low one bit at a time, most significant bit first
    printf("boot_low in binary: ");
    for (int i = 7; i >= 0; i--) {
        printf("%d", (boot_low >> i) & 1);
    }
    printf("\\n");

    return 0;
}`,
          annotations: [
            {
              lines: [3],
              label: 'unsigned char boot_low = 0x55',
              what: 'Declares an 8-bit unsigned value, written using a hex literal.',
              why: 'The 0x prefix tells the compiler "the digits that follow are hex, not decimal." 0x55 and 85 are the exact same value stored in memory — the 0x is purely a hint to whoever is reading the source code. unsigned char is exactly one byte on virtually every platform, which is why it\'s the natural type for "half of a 16-bit signature."',
              note: 'Why unsigned? A plain char can be signed or unsigned depending on the compiler, and signed bytes only go up to 127 before wrapping into negative numbers. For raw byte manipulation, always be explicit: unsigned char.',
            },
            {
              lines: [8, 9],
              label: '%02X in the format string',
              what: 'Tells printf to print the value in hex (X), padded with leading zeros (0) to at least 2 digits (2).',
              why: 'Without the 02, printf("%X", 0x05) would print just "5" instead of "05" — losing the visual byte-alignment that makes hex dumps readable. Every byte should always show as exactly 2 hex digits; that\'s the whole point of the nibble-to-hex mapping from the text above.',
              note: 'Uppercase X gives uppercase hex letters (AA), lowercase x gives lowercase (aa). Both are valid — pick one and stay consistent. This course uses uppercase, matching the 0xAA55 convention from Module 1.',
            },
            {
              lines: [13],
              label: '(boot_high << 8) | boot_low',
              what: 'Shifts boot_high left by 8 bit positions, then combines it with boot_low using bitwise OR.',
              why: 'boot_high << 8 moves 0xAA into the upper 8 bits of a 16-bit value, leaving the lower 8 bits as zero: 0xAA00. Then | boot_low fills in those now-empty lower 8 bits with 0x55, giving 0xAA55. This is exactly how multi-byte values get assembled from individual bytes read off a disk or out of a network packet — shift into position, then OR the pieces together.',
              note: 'Why OR and not +? Because the upper and lower bits never overlap after the shift, OR and addition give the identical result here. OR is used by convention because it makes the intent explicit: "combine these non-overlapping fields," not "do arithmetic."',
            },
            {
              lines: [17, 18, 19],
              label: '(boot_low >> i) & 1',
              what: 'Shifts boot_low right by i positions, then masks off everything except the lowest bit.',
              why: 'Shifting right by i moves the bit that was originally at position i down to position 0. The & 1 then isolates just that one bit, discarding everything else — because 1 in binary is 00000001, and AND-ing with it zeroes out every other bit. Looping i from 7 down to 0 reads the byte from its most significant bit to its least significant bit, printing exactly the binary representation shown in the table above.',
              note: 'This shift-and-mask pattern — (value >> position) & 1 — is the single most common idiom in all of systems programming. You will see it again reading individual flag bits out of page table entries, GDT descriptors, and IDT entries later in this course.',
            },
          ],
        },
        {
          type: 'simulator',
          id: 'bit-flipper-sim',
          caption: 'Bit Flipper — toggle individual bits and watch the hex/decimal value update live',
        },
        {
          type: 'explicit-insight',
          text: '0xAA55 was never a mysterious number. It\'s two bytes — 0xAA and 0x55 — each one just a nibble-by-nibble readable version of a binary pattern. Hex isn\'t a separate math system you need to learn from scratch. It\'s a shorthand notation for binary, built so that every 4 bits maps to exactly 1 readable character. Once you see that mapping, every hex constant in this course stops being a magic number and starts being a binary pattern you can read directly.',
        },
        {
          type: 'socratic',
          question: 'You see the hex constant 0xF0 in a page table entry and need to know it in binary fast, without a calculator. What\'s the shortcut?',
          options: [
            'Convert 0xF0 to decimal first (240), then convert 240 to binary',
            'Split it into its two hex digits — F and 0 — and convert each one to its 4-bit binary nibble directly: 1111 0000',
            'There is no shortcut; hex and binary conversion always requires long division',
          ],
          answer: 1,
          explanations: [
            'This works but it\'s the slow path — going through decimal adds an unnecessary conversion step and more room for arithmetic mistakes.',
            'Exactly right. This is the entire reason hex exists: each digit is independently a 4-bit nibble, so you never need to touch decimal at all. F is 1111, 0 is 0000 — glue them together and you have 11110000 immediately. With practice this becomes instant, the same way you instantly know 7+3=10 without "solving" it.',
            'There absolutely is a shortcut, and it\'s the entire reason hex was invented instead of just using decimal for everything — the nibble-per-digit mapping makes conversion mechanical, not mathematical.',
          ],
        },
      ],
    },
    {
      id: 'bitwise-ops',
      title: 'AND, OR, XOR, NOT — The Four Operations Every OS Line Leans On',
      number: '04',
      color: '#0ea5e9',
      blocks: [
        {
          type: 'text',
          content: `Now that you can read bits and hex, here's what you actually do with them. Every kernel, driver, and low-level library on Earth leans on four bitwise operations, applied bit-by-bit across a whole value at once:

**AND (&)** — result bit is 1 only if *both* input bits are 1. Used to **check** or **clear** specific bits, because AND-ing with 0 always forces a bit off, and AND-ing with 1 leaves it unchanged.

**OR (|)** — result bit is 1 if *either* input bit is 1. Used to **set** specific bits on, because OR-ing with 1 always forces a bit on, and OR-ing with 0 leaves it unchanged.

**XOR (^)** — result bit is 1 if the input bits *differ*. Used to **toggle** bits, and — because a^a is always 0 — to zero out a value without a separate constant.

**NOT (~)** — flips every bit. Used to build the "everything except these bits" mask, usually paired with AND to clear specific bits: value & ~mask.

**Shifts (<< and >>)** — move every bit left or right by N positions. Used to move a value into position before combining it with OR (as you saw with the boot signature), and as a fast way to multiply or divide by powers of two.

None of this is abstract. This is the literal mechanism the OS uses to read and write **flags** — single-bit yes/no settings packed together into one byte or word to save space and let the CPU check them all at once.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'process_flags.c',
          caption: 'A packed flags byte — the same pattern you\'ll see in page table entries (Module 2) and GDT descriptors',
          code: `#include <stdio.h>

#define FLAG_RUNNING   0x01   // 00000001
#define FLAG_BLOCKED   0x02   // 00000010
#define FLAG_ZOMBIE    0x04   // 00000100
#define FLAG_KERNEL    0x08   // 00001000

int main() {
    unsigned char state = 0;                    // start with everything off

    state |= FLAG_RUNNING;                       // turn RUNNING on
    state |= FLAG_KERNEL;                         // turn KERNEL on too

    if (state & FLAG_RUNNING) {                   // check: is RUNNING set?
        printf("Process is running.\\n");
    }

    state &= ~FLAG_RUNNING;                       // turn RUNNING off, leave everything else
    state |= FLAG_BLOCKED;                        // turn BLOCKED on

    printf("Final state = 0x%02X\\n", state);

    return 0;
}`,
          annotations: [
            {
              lines: [3, 4, 5, 6],
              label: '#define FLAG_RUNNING 0x01 ...',
              what: 'Defines each flag as a single distinct bit within one byte — 0x01, 0x02, 0x04, 0x08.',
              why: 'Notice each constant is a different power of two — that\'s not a coincidence, it\'s the whole design. Each flag occupies exactly one bit position, so no two flags ever collide, and any combination of flags can be packed into a single byte instead of needing four separate boolean variables.',
              note: 'This is exactly the pattern you saw in Module 3\'s Process Control Block — the "state" field there (RUNNING, READY, BLOCKED, ZOMBIE) is conceptually the same idea, just sometimes stored as separate values instead of packed bits depending on the OS.',
            },
            {
              lines: [11],
              label: 'state |= FLAG_RUNNING',
              what: 'Turns the RUNNING bit on, without touching any other bit.',
              why: 'state |= FLAG_RUNNING means state = state | FLAG_RUNNING. Since OR-ing with 0 leaves a bit unchanged and OR-ing with 1 forces it on, and FLAG_RUNNING is 1 in only the position it represents, every other bit in state passes through untouched.',
              note: null,
            },
            {
              lines: [14],
              label: 'if (state & FLAG_RUNNING)',
              what: 'Checks whether the RUNNING bit is currently on.',
              why: 'AND-ing state with FLAG_RUNNING zeroes out every bit except the one FLAG_RUNNING represents. If that bit was 1, the result is nonzero (truthy in C). If it was 0, the result is exactly 0 (falsy). This is the standard idiom for "is this one flag set?" among many packed into the same value.',
              note: null,
            },
            {
              lines: [18],
              label: 'state &= ~FLAG_RUNNING',
              what: 'Turns the RUNNING bit off, without touching any other bit.',
              why: '~FLAG_RUNNING flips every bit of 0x01, giving 11111110 — every bit on except the RUNNING position. AND-ing state with that mask forces the RUNNING bit to 0 (since anything AND 0 is 0) while every other bit is AND-ed with 1, which leaves it unchanged. This NOT-then-AND combo is the standard idiom for "clear exactly one flag."',
              note: null,
            },
          ],
        },
        {
          type: 'socratic',
          question: 'Suppose FLAG_A = 0x01 and FLAG_B = 0x02, and you write: state = FLAG_A | FLAG_B; then later: state ^= FLAG_A;. What ends up set in state?',
          options: [
            'Just FLAG_A',
            'Just FLAG_B',
            'Neither — XOR with FLAG_A clears the whole byte',
          ],
          answer: 1,
          explanations: [
            'XOR flips the specific bit it\'s applied to — it doesn\'t clear it, and it definitely doesn\'t leave it set. FLAG_A\'s bit was 1, so XOR-ing with FLAG_A flips it to 0.',
            'Exactly right. state starts as FLAG_A | FLAG_B — both bits on. Then state ^= FLAG_A flips only the FLAG_A bit (1 → 0), because XOR flips exactly the bits that are 1 in the operand and leaves the rest alone. FLAG_B\'s bit was never touched, so it\'s still set. This is why XOR is the standard idiom for "toggle" — flip one specific bit without needing to know its current value or touch any other bit.',
            'XOR only affects the bit positions where the second operand has a 1 — FLAG_A is 0x01, so only the lowest bit is touched. The rest of the byte, including FLAG_B\'s bit, is completely unaffected.',
          ],
        },
        {
          type: 'connection-bridge',
          concept: 'Bitmasks — Packing Multiple Booleans Into One Value',
          coreIdea: 'Use individual bit positions within one number to represent many independent yes/no settings at once, checked and modified with AND/OR/XOR.',
          connections: [
            { icon: '🔐', domain: 'Unix file permissions', description: 'chmod 755 is a bitmask. Each of the three octal digits (7, 5, 5) is itself 3 packed bits: read, write, execute. 7 = 111 = read+write+execute. The kernel checks "can this process read this file?" with the exact same AND-and-check idiom you just used for FLAG_RUNNING.' },
            { icon: '🌐', domain: 'IP subnet masks', description: 'A subnet mask like 255.255.255.0 is a bitmask applied to an IP address with AND, to separate "network portion" from "host portion." Routers decide where to send a packet using the exact same bitwise AND you just wrote in C.' },
            { icon: '🎨', domain: 'RGB hex colors', description: 'A color like #FF8C42 (the exact orange used for Module 1 on this site) is three bytes packed into one 24-bit value — shift and mask to pull out the red, green, and blue channels individually, the same shift-and-mask idiom from the boot signature code above.' },
            { icon: '🎮', domain: 'Game engine component flags', description: 'Entity-component-system game engines often track which components an entity has (Position, Velocity, Sprite, Collider...) as a single packed bitmask instead of four separate booleans, checked with & the same way an OS checks process flags.' },
          ],
          punchline: 'Every one of these systems solved the same problem the OS solves: many independent true/false settings, packed into the smallest possible space, checked and changed with AND, OR, XOR, and NOT. You didn\'t just learn C syntax in this chapter — you learned the one pattern that shows up everywhere from file permissions to game engines to page table entries two chapters from now.',
        },
        {
          type: 'what-this-means',
          text: 'Right now, the browser rendering this page is almost certainly using a packed bitmask somewhere in its own C++ or Rust internals — a flags byte tracking whether this DOM node needs repainting, whether it\'s focused, whether it\'s hidden. You will not see that code. But you can now read it if you ever do, because it\'s built from exactly the four operations you just used on a process state byte.',
        },
        {
          type: 'socratic',
          question: 'You need to build a value with the top 4 bits set to 1010 and the bottom 4 bits set to 0101 — i.e. the byte 0xA5 — starting from two separate 4-bit values: high = 0xA and low = 0x5. Which expression builds it correctly?',
          options: [
            'high + low',
            '(high << 4) | low',
            'high | low',
          ],
          answer: 1,
          explanations: [
            'Addition happens to give the right answer here purely by coincidence of these specific values not overlapping — but it breaks the moment either value is larger than expected, because addition can carry between bit positions in ways OR and shifts never do. It\'s the wrong tool even when it accidentally works.',
            'Exactly right — and this is the exact same pattern as the boot signature code earlier in this chapter. high << 4 moves 0xA (1010) into the upper nibble, giving 0xA0 (10100000). Then | low fills in the lower nibble with 0x5 (0101), giving 0xA5 (10100101). Shift-then-OR is the standard idiom any time you\'re assembling a value from smaller pieces that belong in specific bit positions.',
            'Without the shift, high | low just overlays 0xA (00001010) and 0x5 (00000101) in the same positions — giving 0xF (00001111), not 0xA5. OR alone only works when the pieces don\'t occupy the same bit positions to begin with, which is exactly what the shift is for.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: 'Transistors: on or off', sublabel: 'Two reliable voltage states, nothing more' },
      { label: 'Binary: place value in base 2', sublabel: 'Same math as decimal, fewer symbols' },
      { label: 'Hex: 4 bits per digit', sublabel: 'A human-readable shorthand for binary' },
      { label: 'AND / OR / XOR / NOT', sublabel: 'Check, set, toggle, and clear individual bits' },
      { label: 'Shifts', sublabel: 'Move bits into position before combining them' },
      { label: 'Packed flags & masks', sublabel: 'Many booleans, one byte, checked at once' },
    ],
    finalInsight: 'Every hex constant, every flag check, every `<<` and `&` you will see for the rest of this course is built from exactly six ideas: two voltage states, place value in base 2, a 4-bit shorthand for writing it, and four operations for reading and writing individual bits. There is no more hidden math coming. From here on, when you see 0x7C00 or a page table flag, you have everything you need to read it directly.',
    nextChapter: 'Next: you can read the bits now, but you can\'t yet write the language the kernel itself is written in. C without a standard library, without a heap, without printf — is it still C? Module P02 strips C down to exactly what survives when there is no operating system underneath it yet.',
  },
}

// b09_keyboard.js — Bring-Up 9: Keyboard Driver
export const b09 = {
  id: 'B09',
  title: 'Keyboard Driver',
  subtitle: 'IRQ1 has been firing since Module P05\'s simulator. Nothing has ever caught it for real.',
  estimatedMinutes: 30,

  mystery: {
    type: 'mystery',
    lines: [
      'Every time you have pressed a key while reading this course, IRQ1 fired on the real hardware',
      'underneath whatever device you are using — and something caught it, translated it, and queued it.',
      'Your kernel can now catch IRQ1 too (Module B04). It has no idea what to do with what it receives.',
      'What does the keyboard controller actually hand you, and how do you turn it into a letter?',
    ],
  },

  sections: [
    {
      id: 'history',
      title: 'A Language Your Keyboard Doesn\'t Actually Speak',
      number: '01',
      color: '#38bdf8',
      blocks: [
        {
          type: 'history',
          content: `It's 1981 for the original PC/XT keyboard, and again 1984 for its successor, the AT keyboard — and this time, the two disagree. IBM's AT keyboard uses a different, incompatible internal encoding for its keys, called Scancode Set 2. Software written for the original PC/XT — using Set 1 — would have broken completely on the newer hardware.

IBM's fix, still present in every PC-compatible keyboard controller today, is quiet translation: the keyboard controller chip (the 8042, or its modern equivalents) receives Set 2 from the physical keyboard and silently translates it back into Set 1 before handing anything to software. Every keyboard you have ever typed on, including whatever you're using right now, almost certainly speaks Set 2 internally and gets translated back to a 1981 format specifically so kernels like yours never have to know the difference. You're about to read Set 1 directly from port 0x60 — the exact port Module B01's own opening socratic question already used as an example, before this chapter ever explained why.`,
        },
      ],
    },
    {
      id: 'raw-scancodes',
      title: 'What Port 0x60 Actually Hands You',
      number: '02',
      color: '#38bdf8',
      blocks: [
        {
          type: 'text',
          content: `Reading port 0x60 (Module B01's inb(), no new syntax needed) after a keyboard IRQ1 fires gives you one byte — but it is not ASCII, and it does not mean "the letter A." It's a **scancode**: a number identifying which physical key changed state, and whether it was pressed or released.

Bit 7 carries the press/release distinction: a **make code** (bit 7 clear) means a key was just pressed; a **break code** (bit 7 set) means a key was just released, and its value is always exactly the make code with bit 7 set — press A gives 0x1E, release A gives 0x9E (0x1E | 0x80). This distinction matters for more than just typing: a modifier key like Shift needs to be tracked as *held down* across many other keys' events, which is only possible because release codes exist at all. Without them, a driver would know a key went down, but never know when it came back up.`,
        },
        {
          type: 'callout',
          variant: 'insight',
          content: 'This chapter\'s driver only handles Scancode Set 1\'s base 7-bit codes — it does not handle "extended" keys (arrow keys, the right Ctrl/Alt, and others), which the controller signals with a special 0xE0 prefix byte before the real scancode. A complete driver checks for and handles that prefix; this one, like Module P02\'s honest admission about malloc(), leaves it out on purpose to keep the core mechanism clear, not because it\'s hidden or unimportant.',
        },
        {
          type: 'socratic',
          question: 'Why does Scancode Set 1 use one bit (bit 7) to distinguish press from release, rather than assigning completely separate, unrelated numbers to a key\'s press and release events?',
          options: [
            'It doesn\'t really matter — either design would work identically for a keyboard driver',
            'Using bit 7 means the same base scancode identifies "which key" regardless of press or release, so a driver can look up the key once (scancode & 0x7F) and separately check press-vs-release (scancode & 0x80) — two independent, cheap bitwise checks, instead of needing an entirely separate lookup table for release events',
            'Completely separate numbers were used originally, and bit 7 was added later purely for backward compatibility with a different keyboard standard',
          ],
          answer: 1,
          explanations: [
            'The two designs are not equivalent in practice — this specific encoding is exactly what makes the make/break relationship computable with simple bitwise checks instead of two unrelated lookup tables.',
            'Exactly right. Because a key\'s release code is always its make code with one specific bit set, "which key" and "pressed or released" become two completely independent questions, each answerable with a single bitwise operation (Module P01\'s bitwise chapter) — scancode & 0x7F for the key identity, scancode & 0x80 for press/release. A driver never needs a second table just to recognize that a key came back up.',
            'This is the original design of Scancode Set 1 itself, not a later addition — the make/break-via-bit-7 relationship has been consistent since the scheme was introduced.',
          ],
        },
      ],
    },
    {
      id: 'the-driver',
      title: 'A Lookup Table, a Shift Flag, and a Ring Buffer',
      number: '03',
      color: '#0ea5e9',
      blocks: [
        {
          type: 'text',
          content: `Turning a scancode into a usable character takes three pieces: a lookup table mapping each make code to a lowercase letter, one flag tracking whether Shift is currently held (set and cleared by that specific key's own make and break codes), and somewhere to put the resulting character until whatever code eventually reads it — a **ring buffer**, a fixed-size array that wraps back to the start once it reaches the end, letting the keyboard ISR push characters in without ever needing to know when, or how fast, something else will read them out.`,
        },
        {
          type: 'code',
          language: 'c',
          filename: 'keyboard.c',
          caption: 'Scancode-to-character translation, Shift tracking, and a ring buffer — Module B10\'s shell will read directly from this',
          code: `#define KB_DATA_PORT 0x60
#define SCANCODE_LSHIFT_PRESS   0x2A
#define SCANCODE_LSHIFT_RELEASE 0xAA
#define KB_BUFFER_SIZE 256

static const char scancode_ascii[] = {
    0, 27, '1','2','3','4','5','6','7','8','9','0','-','=', '\\b',
    '\\t','q','w','e','r','t','y','u','i','o','p','[',']','\\n',
    0, 'a','s','d','f','g','h','j','k','l',';','\\'','\`',
    0, '\\\\','z','x','c','v','b','n','m',',','.','/',
};

static int shift_held = 0;
static char kb_buffer[KB_BUFFER_SIZE];
static int kb_head = 0, kb_tail = 0;

static void kb_buffer_push(char c) {
    int next = (kb_head + 1) % KB_BUFFER_SIZE;
    if (next != kb_tail) {
        kb_buffer[kb_head] = c;
        kb_head = next;
    }
}

void keyboard_handler(void) {
    uint8_t scancode = inb(KB_DATA_PORT);

    if (scancode == SCANCODE_LSHIFT_PRESS)   { shift_held = 1; return; }
    if (scancode == SCANCODE_LSHIFT_RELEASE) { shift_held = 0; return; }
    if (scancode & 0x80) return;

    char c = scancode_ascii[scancode];
    if (c) kb_buffer_push(shift_held && c >= 'a' && c <= 'z' ? c - 32 : c);
}`,
          annotations: [
            {
              lines: [6, 7, 8, 9],
              label: 'static const char scancode_ascii[] = { ... };',
              what: 'An array literally indexed by scancode — scancode_ascii[0x1E] is \'a\', because 0x1E is array index 30, the same position \'a\' occupies in this list.',
              why: 'This is the array-as-lookup-table idiom: instead of a chain of if statements checking every possible scancode, indexing directly by the scancode value turns translation into a single array access. \\b, \\t, and \\n are C\'s standard character escapes for backspace, tab, and newline — not new syntax, but worth naming since this is the first time this course has needed them explicitly.',
              note: 'Position 0 in this table is 0 (no character) — scancode 0x00 is never a real key, so leaving it as 0 lets the final if (c) check treat it as "nothing to output," the same way any other unmapped scancode is handled.',
            },
            {
              lines: [19, 20, 21, 22, 23, 24],
              label: 'kb_buffer_push()',
              what: 'Appends one character to the ring buffer, unless doing so would overwrite data that hasn\'t been read yet.',
              why: '(kb_head + 1) % KB_BUFFER_SIZE computes the next write position, wrapping back to 0 once it reaches KB_BUFFER_SIZE — the modulo operator doing exactly what Module M02\'s address-space wraparound conceptually described, now used for a circular array instead of memory addresses. The if (next != kb_tail) check is a deliberate, well-known tradeoff: this design sacrifices exactly one byte of usable capacity so that "buffer full" and "buffer empty" can both be detected with the same simple comparison (head equals tail), rather than needing a separate counter to disambiguate the two.',
              note: null,
            },
            {
              lines: [28, 29, 30, 31],
              label: 'if (scancode == SCANCODE_LSHIFT_PRESS) ... if (scancode & 0x80) return;',
              what: 'Handles Shift\'s press and release explicitly, then discards every other release code.',
              why: 'Shift needs to update shift_held on both its own press and release — every other key only matters on press, for typing purposes. The order matters: the Shift checks run first and return immediately, so by the time scancode & 0x80 is checked, Shift\'s own break code has already been handled and won\'t be silently discarded here.',
              note: null,
            },
            {
              lines: [33, 34],
              label: 'char c = scancode_ascii[scancode]; if (c) kb_buffer_push(...);',
              what: 'Looks up the character, and only pushes it if the lookup produced a real one.',
              why: 'shift_held && c >= \'a\' && c <= \'z\' ? c - 32 : c is this driver\'s entire uppercase handling: subtracting 32 from a lowercase ASCII letter produces its uppercase equivalent (\'a\' is 97, \'A\' is 65 — exactly 32 apart, true for every letter). This deliberately does not handle shifted symbols like \'1\' becoming \'!\' — a real limitation, honestly left out to keep this chapter\'s core mechanism clear, the same kind of honest simplification Module P02 made about malloc().',
              note: null,
            },
          ],
        },
        {
          type: 'simulator',
          id: 'scancode-typing-sim',
          caption: 'Click keys yourself and watch raw scancodes, make/break codes, and the ring buffer fill in real time',
        },
        {
          type: 'connection-bridge',
          concept: 'Raw Hardware Codes, Translated Before You See Them',
          coreIdea: 'A hardware event first produces a raw, device-specific code; a driver\'s job is translating that code into something meaningful, before the rest of the system ever sees the raw form.',
          connections: [
            { icon: '🔌', domain: 'USB HID reports', description: 'Modern keyboards mostly speak USB HID, sending "usage codes" that are conceptually identical to a scancode: a raw number identifying a physical key, requiring a driver to translate it into a character — a different transport, the same fundamental problem this chapter solves.' },
            { icon: '🌐', domain: 'Browser keyboard events', description: 'The very browser rendering this page distinguishes event.code ("KeyA," a raw physical key identifier, unaffected by Shift) from event.key ("a" or "A," the resulting character) — the identical scancode-versus-character distinction this chapter\'s driver implements, one layer up, in JavaScript instead of a kernel.' },
            { icon: '💻', domain: 'Terminal escape sequences', description: 'Pressing an arrow key in a terminal doesn\'t send a single character — it sends a multi-byte escape sequence the terminal application has to parse and translate into "move cursor up," the same raw-code-to-meaning translation problem, just for keys with no direct ASCII representation at all.' },
          ],
          punchline: 'Every layer of the stack you\'re using right now — this kernel\'s scancode table, USB\'s HID reports, and the browser rendering this very page — solves the identical problem: hardware speaks in raw, device-specific codes, and something has to translate that into meaning before anything useful can happen with it.',
        },
        {
          type: 'socratic',
          question: 'The function key F1 has a real scancode in Scancode Set 1 (0x3B), but this chapter\'s scancode_ascii table only has 47 entries, covering indices 0 through 46. What actually happens when F1 is pressed and keyboard_handler() runs?',
          options: [
            'The kernel crashes immediately, since 0x3B is out of the array\'s bounds',
            'scancode_ascii[0x3B] reads whatever byte happens to sit in memory just past the end of the array — undefined, unrelated data — and if that byte happens to be nonzero, it gets pushed into the buffer as a bogus character',
            'The lookup automatically returns 0 for any scancode beyond the table\'s defined range, exactly like the unmapped entries within it',
          ],
          answer: 1,
          explanations: [
            'C performs no bounds checking on array access — reading past the end of an array does not crash by itself, it reads whatever memory happens to be there, which is exactly what makes this dangerous rather than safely caught.',
            'Exactly right, and this is a real, general C hazard, not specific to this driver: scancode_ascii[0x3B] is simply a memory access at a computed offset, and C trusts the programmer to have ensured that offset is valid. 0x3B (59) is past this table\'s last defined index (46), so the read lands on whatever bytes follow the array in memory — possibly zero, possibly not, with no guarantee either way. A production driver would check the scancode against the table\'s actual size before indexing it.',
            'There is no such automatic range-checking in C — every array access, valid or not, is simply computed as a memory offset and dereferenced. Safety here depends entirely on the programmer checking bounds explicitly, which this deliberately minimal driver does not yet do.',
          ],
        },
      ],
    },
  ],

  reveal: {
    chain: [
      { label: '1984: Set 2 vs Set 1', sublabel: 'Every keyboard translated back to a 1981 format, silently' },
      { label: 'IRQ1 fires', sublabel: 'Module B03\'s remap makes it vector 0x21, safely' },
      { label: 'inb(0x60)', sublabel: 'A raw scancode — not a character' },
      { label: 'bit 7: make vs break', sublabel: 'One bit, checked with & 0x80' },
      { label: 'scancode_ascii[] lookup', sublabel: 'Array-indexed translation, Shift tracked separately' },
      { label: 'Ring buffer', sublabel: 'Wrapping with %, one slot sacrificed for a simple full/empty check' },
    ],
    finalInsight: 'Your kernel can hear you type now — not by magic, but by the exact same layered translation every keyboard on Earth relies on: a controller quietly rewriting one scancode format into an older one, a driver turning that into characters, and a buffer holding them until something is ready to read. Module B10\'s shell is that something.',
    nextChapter: 'Next: every piece exists now — hardware ports, a GRUB-loadable kernel, safe interrupts, a real timer, real paging, a real allocator, a real scheduler, and a real keyboard. Module B10, the capstone, wires all nine together into the smallest thing that actually feels like an operating system: a shell.',
  },
}

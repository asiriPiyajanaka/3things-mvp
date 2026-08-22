import { chooseOne, heading } from './ui.js';

const SECTION_ORDER = [
  'Mental model',
  'How it works',
  'In this task',
  'Common mistake',
  'Remember'
];

const SECTION_META = {
  'Mental model': { label: 'Mental Model', color: 'cyan', icon: '◉' },
  'How it works': { label: 'How It Works', color: 'blue', icon: '▣' },
  'In this task': { label: 'In This Task', color: 'magenta', icon: '◆' },
  'Common mistake': { label: 'Common Mistake', color: 'red', icon: '!' },
  Remember: { label: 'Remember', color: 'green', icon: '✓' },
  default: { color: 'cyan', icon: '◉' }
};

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorEnabled() {
  return process.stdout.isTTY && !process.env.NO_COLOR;
}

function style(text, names, enabled = colorEnabled()) {
  if (!enabled) return text;
  const codes = Array.isArray(names) ? names : [names];
  return `${codes.map((name) => ANSI[name]).join('')}${text}${ANSI.reset}`;
}

function terminalWidth() {
  return Math.max(52, Math.min(process.stdout.columns || 88, 110));
}

function stripMarkdown(text) {
  return text
    .replace(/```(?:text|js|javascript|json|bash|sh)?/gi, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'");
}

function sectionName(raw) {
  const normalized = raw.trim().toLowerCase();
  return SECTION_ORDER.find((section) => section.toLowerCase() === normalized) || null;
}

function sectionKey(name) {
  return name.trim().toLowerCase();
}

function displaySectionName(raw) {
  const stripped = stripMarkdown(raw).replace(/^#+\s*/, '').trim();
  const canonical = sectionName(stripped);
  if (canonical) return canonical;
  return stripped
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word ? `${word[0].toUpperCase()}${word.slice(1)}` : '')
    .join(' ');
}

function parseSectionLine(line) {
  const bold = line.match(/^\*\*([^*]+)\*\*\s*(?:[-—:]\s*)?(.*)$/);
  if (bold) {
    const name = sectionName(bold[1]);
    if (name) return { name, rest: bold[2].trim() };
  }

  const plain = line.match(/^(Mental model|How it works|In this task|Common mistake|Remember)\s*(?:[-—:]\s*)?(.*)$/i);
  if (plain) {
    const name = sectionName(plain[1]);
    if (name) return { name, rest: plain[2].trim() };
  }

  return null;
}

export function parseLesson(markdown) {
  const lessons = [];
  let current = null;
  let section = null;
  let inFence = false;

  const ensureLesson = () => {
    if (!current) {
      current = { title: 'Lesson', sections: [] };
      lessons.push(current);
    }
  };

  const ensureSection = (name) => {
    ensureLesson();
    const normalized = sectionKey(name);
    let existing = current.sections.find((item) => sectionKey(item.name) === normalized);
    if (!existing) {
      existing = { name, lines: [] };
      current.sections.push(existing);
    }
    section = existing;
  };

  for (const rawLine of String(markdown || '').split('\n')) {
    const line = rawLine.trimEnd();
    if (!current && !line.trim()) continue;
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }

    if (!inFence) {
      const topic = line.match(/^#\s+(.+)$/);
      if (topic) {
        current = { title: stripMarkdown(topic[1]).trim(), sections: [] };
        lessons.push(current);
        section = null;
        continue;
      }

      const dynamicSection = line.match(/^##\s+(.+)$/);
      if (dynamicSection) {
        ensureSection(displaySectionName(dynamicSection[1]));
        continue;
      }

      const parsed = parseSectionLine(line.trim());
      if (parsed) {
        ensureSection(parsed.name);
        if (parsed.rest) section.lines.push(stripMarkdown(parsed.rest));
        continue;
      }
    }

    ensureLesson();
    if (section) section.lines.push(stripMarkdown(line));
  }

  return lessons
    .map((lesson) => ({
      ...lesson,
      sections: lesson.sections
        .map((item) => ({ name: item.name, text: item.lines.join('\n').trim() }))
        .filter((item) => item.text)
    }))
    .filter((lesson) => lesson.sections.length);
}

function wrapWords(text, width) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= width) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function wrapBlock(text, { width = terminalWidth(), indent = 2, hanging = 2 } = {}) {
  const available = Math.max(24, width - indent - hanging);
  const prefix = ' '.repeat(indent);
  const continuation = ' '.repeat(indent + hanging);
  const output = [];

  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) {
      output.push('');
      continue;
    }

    if (/^\S.+\s{2,}\S/.test(line) && line.length <= width - indent) {
      output.push(`${prefix}${line}`);
      continue;
    }

    const bullet = line.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (bullet) {
      const marker = bullet[1] === '*' ? '-' : bullet[1];
      const firstPrefix = `${prefix}${marker} `;
      const restPrefix = ' '.repeat(firstPrefix.length);
      const wrapped = wrapWords(bullet[2], Math.max(24, width - firstPrefix.length));
      output.push(`${firstPrefix}${wrapped[0] || ''}`);
      output.push(...wrapped.slice(1).map((part) => `${restPrefix}${part}`));
      continue;
    }

    const wrapped = wrapWords(line, available);
    output.push(`${prefix}${wrapped[0] || ''}`);
    output.push(...wrapped.slice(1).map((part) => `${continuation}${part}`));
  }

  return output.join('\n');
}

function panel(title, rows, width, color) {
  const contentWidth = Math.min(width, 78);
  const styledTitle = style(title, ['bold', 'cyan'], color);
  const top = `┌─ ${styledTitle} ${'─'.repeat(Math.max(0, contentWidth - title.length - 4))}┐`;
  const bottom = `└${'─'.repeat(contentWidth)}┘`;
  const body = rows.map((row) => {
    const plain = stripMarkdown(row);
    const clipped = plain.length > contentWidth - 4 ? `${plain.slice(0, contentWidth - 5)}…` : plain;
    return `│ ${clipped}${' '.repeat(Math.max(0, contentWidth - clipped.length - 2))} │`;
  });
  return [
    style(top, 'dim', color),
    ...body,
    style(bottom, 'dim', color)
  ];
}

function sectionLines(name, text, width, color) {
  if (!text) return [];
  const meta = SECTION_META[name] || SECTION_META.default;
  const label = SECTION_META[name]?.label || name;
  return [
    `${style(meta.icon, meta.color, color)} ${style(label, ['bold', meta.color], color)}`,
    wrapBlock(text, { width }),
    ''
  ];
}

function lessonSummary(lesson, width, color) {
  const firstSection = lesson.sections[0];
  if (!firstSection?.text) return '';
  const firstSentence = firstSection.text.match(/^[^.?!]+[.?!]/)?.[0] || firstSection.text;
  if (firstSentence.trim() === firstSection.text.trim()) return '';
  return wrapBlock(firstSentence, { width, indent: 0, hanging: 2 });
}

export function renderLesson(markdown, { area = null, topics = [], color = colorEnabled(), width = terminalWidth() } = {}) {
  const lessons = parseLesson(markdown);
  const lines = [];

  lines.push(...panel('3Things Lesson', [
    'Step 4 of 4',
    area ? `Area: ${area}` : null,
    topics.length ? `Selected: ${topics.map((topic) => topic.title).join(', ')}` : null
  ].filter(Boolean), width, color));
  lines.push('');

  if (!lessons.length) {
    lines.push(wrapBlock(stripMarkdown(markdown), { width, indent: 0, hanging: 2 }));
    return { lessons, text: lines.join('\n').trimEnd() };
  }

  lessons.forEach((lesson, index) => {
    if (index > 0) {
      lines.push(style('─'.repeat(Math.min(width, 72)), 'dim', color));
      lines.push('');
    }

    const label = lessons.length > 1 ? `${index + 1}. ${lesson.title}` : lesson.title;
    lines.push(style(label, ['bold', 'white'], color));
    const summary = lessonSummary(lesson, width, color);
    if (summary) {
      lines.push(style(summary, 'dim', color));
      lines.push('');
    }

    for (const section of lesson.sections) {
      lines.push(...sectionLines(section.name, section.text, width, color));
    }
  });

  return { lessons, text: lines.join('\n').trimEnd() };
}

export async function focusLessonView(lessons) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || lessons.length === 0) return;

  while (true) {
    const choice = await chooseOne('\nFocus a section:', [
      ...lessons.flatMap((lesson, lessonIndex) => lesson.sections
        .map((section, sectionIndex) => ({
          value: { lessonIndex, sectionIndex },
          label: `${lessons.length > 1 ? `${lessonIndex + 1}. ${lesson.title} — ` : ''}${SECTION_META[section.name]?.label || section.name}`
        }))),
      { value: null, label: 'Done' }
    ]);

    if (!choice) return;
    const lesson = lessons[choice.lessonIndex];
    const section = lesson.sections[choice.sectionIndex];
    heading(`${lesson.title}: ${SECTION_META[section.name]?.label || section.name}`);
    console.log(wrapBlock(section.text, { width: terminalWidth(), indent: 0, hanging: 2 }));
  }
}

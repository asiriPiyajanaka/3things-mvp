export const SECTION_ORDER = [
  'Mental model',
  'How it works',
  'In this task',
  'Common mistake',
  'Remember'
];

export function stripMarkdown(text) {
  return text
    .replaceAll(/```(?:text|js|javascript|json|bash|sh)?/gi, '')
    .replaceAll(/\*\*([^*]+)\*\*/g, '$1')
    .replaceAll(/`([^`]+)`/g, '$1')
    .replaceAll(/[“”]/g, '"')
    .replaceAll(/[’]/g, "'");
}

function sectionName(raw) {
  const normalized = raw.trim().toLowerCase();
  return SECTION_ORDER.find((section) => section.toLowerCase() === normalized) || null;
}

function sectionKey(name) {
  return name.trim().toLowerCase();
}

function displaySectionName(raw) {
  const stripped = stripMarkdown(raw).replaceAll(/^#+\s*/g, '').trim();
  const canonical = sectionName(stripped);
  if (canonical) return canonical;
  return stripped
    .replaceAll(/\s+/g, ' ')
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

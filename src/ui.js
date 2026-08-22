import readline from 'node:readline';

const CLEAR_LINE = '\x1b[2K\r';
const CURSOR_UP = (n) => n > 0 ? `\x1b[${n}A` : '';
const WRAP_OFF = '\x1b[?7l';
const WRAP_ON = '\x1b[?7h';
const ANSI_RESET = '\x1b[0m';
const ANSI_INVERSE = '\x1b[7m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_DIM = '\x1b[2m';
const ANSI_CYAN = '\x1b[36m';

function colorEnabled() {
  return process.stdout.isTTY && !process.env.NO_COLOR;
}

function visibleWidth(text) {
  return String(text).replaceAll(/\x1b\[[0-9;]*m/g, '').length;
}

function fitLine(text) {
  const width = Math.max(24, Math.min(process.stdout.columns || 88, 110) - 2);
  if (visibleWidth(text) <= width) return text;
  const plain = String(text).replaceAll(/\x1b\[[0-9;]*m/g, '');
  return `${plain.slice(0, Math.max(1, width - 1))}…`;
}

function terminalLineWidth() {
  return Math.max(24, Math.min(process.stdout.columns || 88, 110) - 2);
}

function wrapPlain(text, width) {
  const words = String(text).split(/\s+/).filter(Boolean);
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

function menuLines({ marker, label, active = false, width = terminalLineWidth() }) {
  const firstPrefix = `${marker} `;
  const restPrefix = ' '.repeat(visibleWidth(firstPrefix));
  const labelLines = String(label).split('\n');
  const lines = [];

  labelLines.forEach((labelLine, labelIndex) => {
    const prefix = labelIndex === 0 ? firstPrefix : restPrefix;
    const wrapped = wrapPlain(labelLine, Math.max(16, width - visibleWidth(prefix)));
    lines.push(...wrapped.map((part, index) => `${index === 0 ? prefix : restPrefix}${part}`));
  });

  if (!active || !colorEnabled()) return lines;
  return lines.map((line) => `${ANSI_INVERSE}${ANSI_BOLD}${line}${ANSI_RESET}`);
}

function questionLines(question) {
  return String(question).split('\n').map((line) => fitLine(line));
}

function writeMenu(lines) {
  process.stdout.write(WRAP_OFF);
  for (const line of lines) process.stdout.write(`${CLEAR_LINE}${line}\n`);
  process.stdout.write(WRAP_ON);
}

function clearRenderedMenu(lines) {
  if (!lines) return;
  process.stdout.write(CURSOR_UP(lines));
  for (let i = 0; i < lines; i++) process.stdout.write(`${CLEAR_LINE}\n`);
  process.stdout.write(CURSOR_UP(lines));
}

export function heading(title) {
  const text = ` ${title} `;
  const line = colorEnabled() ? `${ANSI_BOLD}${ANSI_CYAN}${text}${ANSI_RESET}` : text;
  console.log(`\n${line}`);
  console.log(colorEnabled() ? `${ANSI_DIM}${'─'.repeat(Math.max(18, title.length + 2))}${ANSI_RESET}\n` : `${'─'.repeat(Math.max(18, title.length + 2))}\n`);
}

export function note(text) {
  console.log(colorEnabled() ? `${ANSI_DIM}› ${text}${ANSI_RESET}` : `› ${text}`);
}

export function muted(text) {
  console.log(colorEnabled() ? `${ANSI_DIM}${text}${ANSI_RESET}` : text);
}

export function clearScreen() {
  if (process.stdout.isTTY) process.stdout.write('\x1b[H\x1b[2J\x1b[3J');
}

function revealChunks(text) {
  return String(text).match(/\s+|\S+/g) || [];
}

export async function revealText(text, { delayMs = 8 } = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stdout.write(text);
    return;
  }

  readline.emitKeypressEvents(process.stdin);
  const wasRaw = process.stdin.isRaw;
  let skip = false;
  let cancelled = false;

  process.stdin.setRawMode(true);
  process.stdin.resume();

  await new Promise((resolve, reject) => {
    let index = 0;
    const chunks = revealChunks(text);
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      process.stdin.off('keypress', onKey);
      process.stdin.setRawMode(Boolean(wasRaw));
      process.stdin.pause();
    };

    const finish = () => {
      cleanup();
      resolve();
    };

    const onKey = (_str, key) => {
      if (key?.ctrl && key.name === 'c') {
        cancelled = true;
        cleanup();
        reject(new Error('Cancelled'));
        return;
      }
      skip = true;
    };

    const step = () => {
      if (cancelled) return;
      if (skip) {
        process.stdout.write(chunks.slice(index).join(''));
        finish();
        return;
      }
      if (index >= chunks.length) {
        finish();
        return;
      }
      process.stdout.write(chunks[index++]);
      timer = setTimeout(step, delayMs);
    };

    process.stdin.on('keypress', onKey);
    step();
  });
}

export async function withSpinner(text, action) {
  if (!process.stdout.isTTY) {
    note(text);
    return await action();
  }

  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frame = 0;
  const render = () => {
    const symbol = frames[frame++ % frames.length];
    const line = colorEnabled()
      ? `${ANSI_CYAN}${symbol}${ANSI_RESET} ${ANSI_DIM}${fitLine(text)}${ANSI_RESET}`
      : `${symbol} ${fitLine(text)}`;
    process.stdout.write(`${CLEAR_LINE}${line}`);
  };

  render();
  const timer = setInterval(render, 90);
  try {
    return await action();
  } finally {
    clearInterval(timer);
    process.stdout.write(CLEAR_LINE);
  }
}

function fallbackQuestion(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

export async function inputText(question, defaultValue = '') {
  const suffix = defaultValue ? ` (${defaultValue})` : '';
  const answer = await fallbackQuestion(`${question}${suffix}: `);
  return answer.trim() || defaultValue;
}

export async function confirm(question, defaultYes = true) {
  const answer = (await fallbackQuestion(`${question} ${defaultYes ? '[Y/n]' : '[y/N]'} `)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes';
}

export async function chooseOne(question, options) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log(question);
    options.forEach((o, i) => console.log(`  ${i + 1}. ${o.label}`));
    const raw = await fallbackQuestion('Choose: ');
    const index = Math.max(0, Math.min(options.length - 1, Number(raw) - 1));
    return options[index].value;
  }

  readline.emitKeypressEvents(process.stdin);
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let index = 0;
  let rendered = 0;

  const render = () => {
    if (rendered) process.stdout.write(CURSOR_UP(rendered));
    const lines = [
      ...questionLines(question),
      ...options.flatMap((o, i) => menuLines({
        marker: i === index ? '❯' : ' ',
        label: o.label,
        active: i === index
      }))
    ].map((line) => fitLine(line));
    writeMenu(lines);
    rendered = lines.length;
  };

  render();

  return await new Promise((resolve, reject) => {
    const cleanup = () => {
      process.stdin.off('keypress', onKey);
      process.stdin.setRawMode(Boolean(wasRaw));
      process.stdin.pause();
    };
    const onKey = (_str, key) => {
      if (key?.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Cancelled'));
        return;
      }
      if (key?.name === 'up') index = (index - 1 + options.length) % options.length;
      else if (key?.name === 'down') index = (index + 1) % options.length;
      else if (key?.name === 'return') {
        cleanup();
        clearRenderedMenu(rendered);
        resolve(options[index].value);
        return;
      } else return;
      render();
    };
    process.stdin.on('keypress', onKey);
  });
}

export async function chooseMany(question, options, selectedValues = []) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log(question);
    options.forEach((o, i) => console.log(`  ${i + 1}. ${o.label}`));
    const raw = await fallbackQuestion('Choose comma-separated numbers: ');
    return raw.split(',').map((v) => options[Number(v.trim()) - 1]?.value).filter(Boolean);
  }

  readline.emitKeypressEvents(process.stdin);
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let index = 0;
  const selected = new Set(selectedValues);
  let rendered = 0;

  const render = () => {
    if (rendered) process.stdout.write(CURSOR_UP(rendered));
    const lines = [
      ...questionLines(question),
      fitLine('(up/down move, space toggle, enter save)'),
      ...options.flatMap((o, i) => menuLines({
        marker: `${i === index ? '❯' : ' '} [${selected.has(o.value) ? 'x' : ' '}]`,
        label: o.label,
        active: i === index
      }))
    ].map((line) => fitLine(line));
    writeMenu(lines);
    rendered = lines.length;
  };

  render();

  return await new Promise((resolve, reject) => {
    const cleanup = () => {
      process.stdin.off('keypress', onKey);
      process.stdin.setRawMode(Boolean(wasRaw));
      process.stdin.pause();
    };
    const onKey = (str, key) => {
      if (key?.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Cancelled'));
        return;
      }
      if (key?.name === 'up') index = (index - 1 + options.length) % options.length;
      else if (key?.name === 'down') index = (index + 1) % options.length;
      else if (key?.name === 'space' || str === ' ') {
        const value = options[index].value;
        selected.has(value) ? selected.delete(value) : selected.add(value);
      } else if (key?.name === 'return') {
        cleanup();
        clearRenderedMenu(rendered);
        resolve([...selected]);
        return;
      } else return;
      render();
    };
    process.stdin.on('keypress', onKey);
  });
}

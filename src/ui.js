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
  return String(text).replace(/\x1b\[[0-9;]*m/g, '').length;
}

function fitLine(text) {
  const width = Math.max(24, Math.min(process.stdout.columns || 88, 110) - 2);
  if (visibleWidth(text) <= width) return text;
  const plain = String(text).replace(/\x1b\[[0-9;]*m/g, '');
  return `${plain.slice(0, Math.max(1, width - 1))}…`;
}

function activeLine(text) {
  const line = fitLine(text);
  return colorEnabled() ? `${ANSI_INVERSE}${ANSI_BOLD}${line}${ANSI_RESET}` : line;
}

function menuLine(text, active = false) {
  return active ? activeLine(text) : fitLine(text);
}

function questionLines(question) {
  return String(question).split('\n').map((line) => fitLine(line));
}

function writeMenu(lines) {
  process.stdout.write(WRAP_OFF);
  for (const line of lines) process.stdout.write(`${CLEAR_LINE}${line}\n`);
  process.stdout.write(WRAP_ON);
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
  if (process.stdout.isTTY) process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
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
      ...options.map((o, i) => menuLine(`${i === index ? '❯' : ' '} ${o.label}`, i === index))
    ];
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
      ...options.map((o, i) => menuLine(`${i === index ? '❯' : ' '} [${selected.has(o.value) ? 'x' : ' '}] ${o.label}`, i === index))
    ];
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
        resolve([...selected]);
        return;
      } else return;
      render();
    };
    process.stdin.on('keypress', onKey);
  });
}

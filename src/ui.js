import readline from 'node:readline';

const CLEAR_LINE = '\x1b[2K\r';
const CURSOR_UP = (n) => n > 0 ? `\x1b[${n}A` : '';

export function heading(title) {
  console.log(`\n┌${'─'.repeat(Math.max(18, title.length + 4))}┐`);
  console.log(`│  ${title}${' '.repeat(Math.max(0, 16 - title.length))}  │`);
  console.log(`└${'─'.repeat(Math.max(18, title.length + 4))}┘\n`);
}

export function note(text) {
  console.log(`› ${text}`);
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
    const lines = [question, ...options.map((o, i) => `${i === index ? '❯' : ' '} ${o.label}`)];
    for (const line of lines) process.stdout.write(`${CLEAR_LINE}${line}\n`);
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
      question,
      '(↑/↓ move, space toggle, enter save)',
      ...options.map((o, i) => `${i === index ? '❯' : ' '} [${selected.has(o.value) ? 'x' : ' '}] ${o.label}`)
    ];
    for (const line of lines) process.stdout.write(`${CLEAR_LINE}${line}\n`);
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

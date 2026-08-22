function argValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

export function normalizeTaskEvent(event) {
  return {
    agent: event.agent || 'custom',
    prompt: event.prompt,
    cwd: event.cwd || process.cwd(),
    session_id: event.session_id || event.sessionId || null,
    turn_id: event.turn_id || event.turnId || null,
    model: event.model || null
  };
}

export function captureEventFromArgs(args, raw) {
  const trimmed = raw.trim();
  let parsed = null;
  if (trimmed) {
    try { parsed = JSON.parse(trimmed); } catch {}
  }

  if (parsed && typeof parsed === 'object') {
    return normalizeTaskEvent({
      ...parsed,
      agent: argValue(args, '--agent') || parsed.agent || 'custom',
      cwd: argValue(args, '--cwd') || parsed.cwd || process.cwd(),
      sessionId: argValue(args, '--session') || parsed.sessionId || parsed.session_id || null,
      turnId: argValue(args, '--turn') || parsed.turnId || parsed.turn_id || null,
      model: argValue(args, '--model') || parsed.model || null
    });
  }

  const prompt = argValue(args, '--prompt') || trimmed;
  if (!prompt.trim()) return null;

  return normalizeTaskEvent({
    agent: argValue(args, '--agent') || 'custom',
    prompt,
    cwd: argValue(args, '--cwd') || process.cwd(),
    sessionId: argValue(args, '--session') || null,
    turnId: argValue(args, '--turn') || null,
    model: argValue(args, '--model') || null
  });
}

export function preview(text, length = 82) {
  const clean = String(text || '').replaceAll(/\s+/g, ' ').trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, Math.max(1, length - 1))}…`;
}

export function taskLabel(task, length = 62) {
  const agent = task.agent || 'unknown';
  return `[${agent}] ${preview(task.prompt, length)}`;
}

export { argValue };

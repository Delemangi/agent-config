// Builds one subagent row from the props Claude Code hands the AgentRow hook.
// Kept separate from register.mjs so the formatting can be tested with plain node.

const E = '\x1b[';
const C = {
  reset: `${E}0m`, dim: `${E}2m`, bold: `${E}1m`,
  green: `${E}32m`, yellow: `${E}33m`, red: `${E}31m`,
  cyan: `${E}36m`, gray: `${E}90m`,
};
const sep = ` ${C.gray}│${C.reset} `;

const pctColor = p => (p >= 90 ? C.red : p >= 70 ? C.yellow : C.green);

function bar(p, w) {
  const n = Math.round((Math.min(100, Math.max(0, p)) / 100) * w);
  return pctColor(p) + '█'.repeat(n) + C.gray + '░'.repeat(w - n) + C.reset;
}

const fmtTok = n =>
  n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  : n >= 1e3 ? Math.round(n / 1e3) + 'k'
  : String(n || 0);

function fmtDur(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}m`
    : m > 0 ? `${m}m${String(s % 60).padStart(2, '0')}s`
    : `${s}s`;
}

// "claude-opus-5" -> "opus 5", "claude-fable-5-1" -> "fable 5.1",
// "claude-haiku-4-5-20251001" -> "haiku 4.5"
function shortModel(id) {
  if (!id) return '';
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(id);
  if (!m) return id.length > 14 ? id.slice(0, 13) + '…' : id;
  return `${m[1]} ${m[2]}${m[3] ? '.' + m[3] : ''}`;
}

const statusColor = s =>
  s === 'running' || s === 'in_progress' ? C.green
  : s === 'completed' || s === 'done' ? C.gray
  : s === 'failed' || s === 'error' ? C.red
  : C.yellow;

const strip = s => s.replace(/\x1b\[[0-9;]*m/g, '');

export function buildRow(p, now, fallbackColumns) {
  const parts = [];
  parts.push(`${C.bold}${C.cyan}${p.name || p.type || 'agent'}${C.reset}`);

  const meta = [];
  if (p.model) meta.push(shortModel(p.model));
  if (p.effort) meta.push(String(p.effort));
  if (meta.length) parts.push(`${C.dim}${meta.join(' · ')}${C.reset}`);

  const tokens = p.tokenCount;
  if (tokens != null) {
    if (p.contextWindowSize) {
      const pct = Math.round((tokens / p.contextWindowSize) * 100);
      parts.push(`${bar(pct, 6)} ${pctColor(pct)}${pct}%${C.reset} ${C.dim}${fmtTok(tokens)}${C.reset}`);
    } else {
      parts.push(`${C.dim}${fmtTok(tokens)} tok${C.reset}`);
    }
  }

  if (p.startTime) {
    const st = typeof p.startTime === 'number' ? p.startTime : Date.parse(p.startTime);
    if (!Number.isNaN(st)) parts.push(`${C.dim}${fmtDur(Math.max(0, now - st))}${C.reset}`);
  }

  const status = p.status || p.taskStatus;
  if (status) parts.push(`${statusColor(status)}${String(status).replace('_', ' ')}${C.reset}`);

  let row = parts.join(sep);
  const desc = (p.label || p.description || '').replace(/\s+/g, ' ').trim();
  if (desc) {
    const cols = p.columns || fallbackColumns || 120;
    const room = cols - strip(row).length - 3;
    if (room > 8) row += sep + C.gray + (desc.length > room ? desc.slice(0, room - 1) + '…' : desc) + C.reset;
  }
  return row;
}

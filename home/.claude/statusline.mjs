#!/usr/bin/env node
// Claude Code status line HUD (Node). Reads session JSON on stdin, prints 2 lines.
// Debug: set CLAUDE_STATUSLINE_DEBUG=1 in the statusLine command to dump the raw
// payload to ~/.claude/statusline-last.json on every run.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, join } from 'node:path';
import { homedir } from 'node:os';

let d = {};
const raw = readFileSync(0, 'utf8');
try { if (process.env.CLAUDE_STATUSLINE_DEBUG) writeFileSync(join(homedir(), '.claude', 'statusline-last.json'), raw); } catch {}
try { d = JSON.parse(raw || '{}'); } catch { d = {}; }

const cols = parseInt(process.env.COLUMNS || '120', 10) || 120;
const configDir = process.env.CLAUDE_CONFIG_DIR || '';
const profile = /\.claude-(\d+)$/i.exec(configDir)?.[1] || (configDir ? basename(configDir) : '1');
const wide = cols >= 120, narrow = cols < 100, tiny = cols < 80;
const barW = wide ? 10 : narrow ? 6 : 8;
const ESC = '\x1b';
const E = `${ESC}[`;
const C = {
  reset: `${E}0m`, dim: `${E}2m`, bold: `${E}1m`,
  green: `${E}32m`, yellow: `${E}33m`, red: `${E}31m`,
  cyan: `${E}36m`, magenta: `${E}35m`, gray: `${E}90m`,
};
const sep = ` ${C.gray}│${C.reset} `;
const now = Date.now() / 1000;
// OSC 8 hyperlink: Ctrl+click in Windows Terminal, WezTerm, iTerm2, Kitty.
const link = (url, text) => (url ? `${ESC}]8;;${url}${ESC}\\${text}${ESC}]8;;${ESC}\\` : text);

const pctColor = p => (p >= 90 ? C.red : p >= 70 ? C.yellow : C.green);
function bar(p, w = barW) {
  const n = Math.round(Math.min(100, Math.max(0, p)) / 100 * w);
  return pctColor(p) + '█'.repeat(n) + C.gray + '░'.repeat(w - n) + C.reset;
}
function gauge(label, p) {
  const pct = Math.round(p);
  return `${C.dim}${label}${C.reset} ${tiny ? '' : bar(pct) + ' '}${pctColor(pct)}${pct}%${C.reset}`;
}
const fmtTok = n => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n));
function relTime(epoch) {
  const s = Math.max(0, epoch - now);
  if (s >= 86400) return `${Math.floor(s / 86400)}d${Math.floor((s % 86400) / 3600)}h`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`;
}
function absTime(epoch) {
  const t = new Date(epoch * 1000);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[t.getDay()]} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}
function fmtDur(ms) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`;
}
function git(cwd) {
  const opts = { cwd, encoding: 'utf8', timeout: 1500, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true };
  try {
    const st = execFileSync('git', ['--no-optional-locks', 'status', '--porcelain=v1', '-b'], opts);
    const lines = st.split('\n').filter(Boolean);
    const hdr = lines.shift() || '';
    const m = /^## (\S+?)(?:\.\.\.\S+)?(?: \[(.*)\])?$/.exec(hdr);
    let branch = m ? m[1] : '?';
    if (branch === 'HEAD') {
      try { branch = '@' + execFileSync('git', ['rev-parse', '--short', 'HEAD'], opts).trim(); } catch {}
    }
    const a = /ahead (\d+)/.exec(m?.[2] || ''), b = /behind (\d+)/.exec(m?.[2] || '');
    return { branch, dirty: lines.length, ahead: a ? +a[1] : 0, behind: b ? +b[1] : 0 };
  } catch { return null; }
}

// ---------- line 1: where + what ----------
const cwd = d.workspace?.current_dir || d.cwd || process.cwd();
const l1 = [`${C.cyan}${basename(cwd) || cwd}${C.reset}`];

const g = git(cwd);
if (g) {
  let s = `${C.magenta}⎇ ${g.branch}${C.reset}`;
  if (g.dirty) s += `${C.yellow}*${g.dirty}${C.reset}`;
  if (g.ahead) s += ` ${C.green}↑${g.ahead}${C.reset}`;
  if (g.behind) s += ` ${C.red}↓${g.behind}${C.reset}`;
  l1.push(s);
}
const wt = d.worktree?.name || d.workspace?.git_worktree;
if (wt) l1.push(`${C.dim}wt:${wt}${C.reset}`);
if (d.pr?.number && !narrow) {
  const rs = d.pr.review_state;
  const rc = rs === 'approved' ? C.green : rs === 'changes_requested' ? C.red : C.dim;
  const prText = `${d.pr.kind === 'mr' ? 'MR' : 'PR'} #${d.pr.number}`;
  l1.push(`${C.dim}${link(d.pr.url, prText)}${C.reset}${rs ? ` ${rc}${rs.replace('_', ' ')}${C.reset}` : ''}`);
}

let model = `${C.bold}${d.model?.display_name || '?'}${C.reset}`;
const tags = [];
if (d.effort?.level) tags.push(d.effort.level);
if (d.fast_mode) tags.push('fast');
if (d.thinking && d.thinking.enabled === false) tags.push('no-think');
if (d.agent?.name) tags.push(`@${d.agent.name}`);
if (tags.length) model += ` ${C.dim}${tags.join('·')}${C.reset}`;
l1.push(model);

const cw = d.context_window;
if (cw && cw.used_percentage != null) {
  const cu = cw.current_usage;
  const used = (cu ? (cu.input_tokens || 0) + (cu.cache_creation_input_tokens || 0) + (cu.cache_read_input_tokens || 0) : cw.total_input_tokens) || 0;
  const size = cw.context_window_size || 200000;
  l1.push(`${gauge('ctx', cw.used_percentage)} ${C.dim}${fmtTok(used)}/${fmtTok(size)}${C.reset}`);
}

// ---------- line 2: profile + plan budget + session ----------
const l2 = [`${C.magenta}p${profile}${C.reset}`];
const rl = d.rate_limits;
if (rl?.five_hour?.used_percentage != null) {
  const w = rl.five_hour;
  let s = gauge('5h', w.used_percentage);
  if (w.resets_at) s += ` ${C.dim}↻${relTime(w.resets_at)}${C.reset}`;
  l2.push(s);
}
if (rl?.seven_day?.used_percentage != null) {
  const w = rl.seven_day;
  let s = gauge('7d', w.used_percentage);
  if (w.resets_at) s += ` ${C.dim}↻${wide ? relTime(w.resets_at) + ' ' : ''}${absTime(w.resets_at)}${C.reset}`;
  l2.push(s);
}
if (rl?.spend_limit?.used_percentage != null) {
  const w = rl.spend_limit;
  let s = gauge('spend', w.used_percentage);
  if (w.resets_at) s += ` ${C.dim}↻${absTime(w.resets_at)}${C.reset}`;
  l2.push(s);
}
if (!l2.length) l2.push(`${C.gray}plan usage: n/a${C.reset}`);

const cost = d.cost;
if (cost) {
  const bits = [];
  if (cost.total_cost_usd != null) bits.push(`$${cost.total_cost_usd.toFixed(2)}`);
  if (cost.total_duration_ms != null) bits.push(fmtDur(cost.total_duration_ms));
  if (bits.length) l2.push(`${C.dim}${bits.join(' · ')}${C.reset}`);
  if (cost.total_lines_added || cost.total_lines_removed) {
    l2.push(`${C.green}+${cost.total_lines_added || 0}${C.reset} ${C.red}-${cost.total_lines_removed || 0}${C.reset}`);
  }
}
const pc = d.prompt_cache;
if (pc && pc.hit_ratio != null && !narrow) {
  const hit = Math.round(pc.hit_ratio * 100);
  const warm = pc.warm && pc.expires_at && pc.expires_at > now;
  l2.push(`${C.dim}cache${C.reset} ${warm ? C.green : C.gray}${hit}%${C.reset}${warm ? ` ${C.dim}↻${relTime(pc.expires_at)}${C.reset}` : ` ${C.gray}cold${C.reset}`}`);
}

process.stdout.write(l1.join(sep) + '\n' + l2.join(sep) + '\n');

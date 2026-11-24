#!/usr/bin/env node
/**
 * my-ship — install the ship-* skill kit for Claude Code into a project.
 *
 *   npx github:MeanHoang/my-ship install [dir]              every skill + the shared core (workflow, roles, hooks, scripts)
 *   npx github:MeanHoang/my-ship add <skill...> [--dir d]   only these skills (+ the shared core they all read)
 *   npx github:MeanHoang/my-ship remove <skill...> [--dir d] | remove --all
 *   npx github:MeanHoang/my-ship list [--dir d]             available skills, which ones the project has
 *   npx github:MeanHoang/my-ship update [--dir d]           re-install the skills the project already has, from this version
 *   npx github:MeanHoang/my-ship doctor [--dir d]           requirements, hook wiring, profile filled in
 *
 * Rules kept from install.sh: hooks are merged into .claude/settings.local.json (never overwritten),
 * .claude/ship-profile.md is created once and never touched again, the kit is hidden from git through
 * .git/info/exclude. What is installed is recorded in .claude/my-ship.json.
 */
import {execFileSync} from 'node:child_process';
import {chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const KIT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KIT_CLAUDE = join(KIT_ROOT, '.claude');
const KIT_VERSION = JSON.parse(readFileSync(join(KIT_ROOT, 'package.json'), 'utf8')).version;
// shared by every ship skill: the skills read these files by path
const CORE_DIRS = ['workflow', 'roles', 'hooks', 'scripts'];
const STATE_FILE = 'my-ship.json';
const PROFILE_FILE = 'ship-profile.md';
// [event, matcher, hook names] wired into .claude/settings.local.json
const HOOK_WIRING = [
  ['PreToolUse', 'Write|Edit', ['ship-auto-guard']],
  ['PreToolUse', 'Bash', ['branch-guard', 'block-git-discard', 'ship-auto-guard', 'ship-scope-guard']],
  ['Stop', null, ['ship-state-sync', 'ship-auto-continue']],
  ['PreCompact', null, ['ship-state-sync']],
  ['SessionStart', 'startup|resume|compact', ['ship-context-restore']],
  ['UserPromptSubmit', null, ['ship-mode-card']]
];
const TOOLS_NEEDED = [['git', 'everything'], ['python3', 'hooks and ship-manager status'], ['jq', 'branch-guard hook']];

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const {positional, flags} = readArgs(rest);
  const commands = {install: runInstall, add: runAdd, remove: runRemove, list: runList, update: runUpdate, doctor: runDoctor};
  if (!commands[command]) return printUsage();
  try {
    commands[command](positional, flags);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  }
}

function runInstall(positional, flags) {
  const projectDir = projectRoot(positional[0] || flags.dir);
  installSkills(projectDir, availableSkills());
}

function runAdd(positional, flags) {
  if (!positional.length) throw new Error(`name the skills to add, e.g. my-ship add ship ship-review (available: ${availableSkills().join(', ')})`);
  const unknown = positional.filter(skill => !availableSkills().includes(skill));
  if (unknown.length) throw new Error(`unknown skill: ${unknown.join(', ')} (available: ${availableSkills().join(', ')})`);
  installSkills(projectRoot(flags.dir), positional);
}

function runUpdate(positional, flags) {
  const projectDir = projectRoot(flags.dir);
  const installed = readState(projectDir).skills || [];
  if (!installed.length) throw new Error('nothing installed here yet: run my-ship install');
  installSkills(projectDir, installed.filter(skill => availableSkills().includes(skill)));
}

function runRemove(positional, flags) {
  const projectDir = projectRoot(flags.dir);
  const state = readState(projectDir);
  const targets = flags.all ? state.skills || [] : positional;
  if (!targets.length) throw new Error('name the skills to remove, or --all');
  for (const skill of targets) rmSync(join(projectDir, '.claude/skills', skill), {recursive: true, force: true});
  const remaining = (state.skills || []).filter(skill => !targets.includes(skill));
  if (flags.all || !remaining.length) {
    for (const dir of CORE_DIRS) removeKitFiles(projectDir, dir);
    removeEmptyDirs(projectDir, ['skills', 'hooks', 'scripts']);
    const wiringRemoved = unwireHooks(projectDir);
    rmSync(join(projectDir, '.claude', STATE_FILE), {force: true});
    console.log(`✓ removed every skill, the shared core and ${wiringRemoved} hook wiring(s); kept ${PROFILE_FILE} and .claude/ship/ (task state)`);
    return;
  }
  writeState(projectDir, {...state, skills: remaining});
  console.log(`✓ removed ${targets.join(', ')}; still installed: ${remaining.join(', ')}`);
}

function runList(positional, flags) {
  const projectDir = tryProjectRoot(flags.dir);
  const state = projectDir ? readState(projectDir) : {};
  console.log(`my-ship ${KIT_VERSION}${state.version ? ` · this project has ${state.version}` : ''}`);
  for (const skill of availableSkills()) {
    const mark = (state.skills || []).includes(skill) ? '✓' : ' ';
    console.log(`  ${mark} ${skill.padEnd(14)} ${skillDescription(skill)}`);
  }
}

function runDoctor(positional, flags) {
  const projectDir = projectRoot(flags.dir);
  const problems = [];
  for (const [tool, usedBy] of TOOLS_NEEDED) {
    if (!hasCommand(tool)) problems.push(`${tool} not found (needed for ${usedBy})`);
  }
  const state = readState(projectDir);
  if (!state.skills?.length) problems.push('no skill installed (my-ship install)');
  if (state.version && state.version !== KIT_VERSION) problems.push(`project has ${state.version}, this CLI is ${KIT_VERSION} (my-ship update)`);
  const missingWiring = missingHookWiring(projectDir);
  if (missingWiring.length) problems.push(`hooks not wired: ${missingWiring.join(', ')} (my-ship update)`);
  const profilePath = join(projectDir, '.claude', PROFILE_FILE);
  if (!existsSync(profilePath)) problems.push(`${PROFILE_FILE} missing (my-ship install creates it)`);
  else if (isProfileUnfilled(readFileSync(profilePath, 'utf8'))) problems.push(`${PROFILE_FILE} is still the example: fill it before the first /ship`);
  for (const problem of problems) console.log(`✗ ${problem}`);
  if (!problems.length) console.log(`✓ all good: ${state.skills.length} skill(s), my-ship ${state.version}`);
  process.exitCode = problems.length ? 2 : 0;
}

/** Copies the chosen skills + the shared core, wires hooks, creates the profile once, hides the kit from git. */
function installSkills(projectDir, skills) {
  const claudeDir = join(projectDir, '.claude');
  mkdirSync(join(claudeDir, 'skills'), {recursive: true});
  for (const skill of skills) {
    rmSync(join(claudeDir, 'skills', skill), {recursive: true, force: true});
    cpSync(join(KIT_CLAUDE, 'skills', skill), join(claudeDir, 'skills', skill), {recursive: true});
  }
  for (const dir of CORE_DIRS) copyCoreDir(dir, join(claudeDir, dir));
  makeExecutable(claudeDir);
  const profileCreated = createProfileOnce(claudeDir);
  const wired = wireHooks(projectDir);
  const hiddenCount = hideFromGit(projectDir, skills);
  const state = readState(projectDir);
  writeState(projectDir, {version: KIT_VERSION, skills: [...new Set([...(state.skills || []), ...skills])].sort(), installedAt: new Date().toISOString()});
  console.log(`✓ ${skills.length} skill(s): ${skills.join(', ')}`);
  console.log(`✓ shared core: ${CORE_DIRS.map(dir => `.claude/${dir}`).join(', ')}`);
  console.log(`✓ settings.local.json: ${wired} hook(s) newly wired`);
  console.log(profileCreated ? `✓ created .claude/${PROFILE_FILE}: FILL IT IN before the first /ship` : `✓ kept your .claude/${PROFILE_FILE}`);
  console.log(`✓ ${hiddenCount} path(s) hidden from git (.git/info/exclude); remove those lines to commit the kit for your team`);
  console.log('Next: restart Claude Code, then /ship <task>. Check with: my-ship doctor');
}

function copyCoreDir(dir, destination) {
  // per-file copy: a project's own files in the same folder (other hooks, scripts) are kept
  cpSync(join(KIT_CLAUDE, dir), destination, {recursive: true, force: true});
}

function wireHooks(projectDir) {
  const settingsPath = join(projectDir, '.claude/settings.local.json');
  const settings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, 'utf8')) : {};
  const hooks = (settings.hooks ||= {});
  let added = 0;
  for (const [event, matcher, names] of HOOK_WIRING) {
    const groups = (hooks[event] ||= []);
    let group = groups.find(candidate => (candidate.matcher ?? null) === matcher);
    if (!group) {
      group = matcher ? {matcher, hooks: []} : {hooks: []};
      groups.push(group);
    }
    const present = new Set(group.hooks.map(hook => hook.command));
    for (const name of names) {
      const command = hookCommand(name);
      if (present.has(command)) continue;
      group.hooks.push({type: 'command', command, timeout: 10});
      added++;
    }
  }
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  return added;
}

function unwireHooks(projectDir) {
  const settingsPath = join(projectDir, '.claude/settings.local.json');
  if (!existsSync(settingsPath)) return 0;
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  const kitCommands = new Set(HOOK_WIRING.flatMap(([, , names]) => names.map(hookCommand)));
  let removed = 0;
  for (const groups of Object.values(settings.hooks || {})) {
    for (const group of groups) {
      const before = group.hooks.length;
      group.hooks = group.hooks.filter(hook => !kitCommands.has(hook.command));
      removed += before - group.hooks.length;
    }
  }
  for (const [event, groups] of Object.entries(settings.hooks || {})) {
    settings.hooks[event] = groups.filter(group => group.hooks.length);
    if (!settings.hooks[event].length) delete settings.hooks[event];
  }
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  return removed;
}

function missingHookWiring(projectDir) {
  const settingsPath = join(projectDir, '.claude/settings.local.json');
  const text = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf8') : '';
  return [...new Set(HOOK_WIRING.flatMap(([, , names]) => names))].filter(name => !text.includes(`/.claude/hooks/${name}.sh`));
}

function hideFromGit(projectDir, skills) {
  const gitDir = execFileSync('git', ['-C', projectDir, 'rev-parse', '--git-common-dir'], {encoding: 'utf8'}).trim();
  const excludePath = join(resolve(projectDir, gitDir), 'info/exclude');
  mkdirSync(dirname(excludePath), {recursive: true});
  const current = existsSync(excludePath) ? readFileSync(excludePath, 'utf8') : '';
  const lines = new Set(current.split('\n'));
  const wanted = ['.claude/ship/', `.claude/${PROFILE_FILE}`, '.claude/settings.local.json', `.claude/${STATE_FILE}`,
    '.claude/workflow/', '.claude/roles/', ...skills.map(skill => `.claude/skills/${skill}/`),
    ...['hooks', 'scripts'].flatMap(dir => readdirSync(join(KIT_CLAUDE, dir)).map(file => `.claude/${dir}/${file}`))];
  const missing = wanted.filter(line => !lines.has(line));
  if (missing.length) writeFileSync(excludePath, `${current.replace(/\n?$/, '\n')}${missing.join('\n')}\n`);
  return wanted.length;
}

function removeEmptyDirs(projectDir, dirs) {
  for (const dir of dirs) {
    const path = join(projectDir, '.claude', dir);
    if (existsSync(path) && !readdirSync(path).length) rmSync(path, {recursive: true});
  }
}

function removeKitFiles(projectDir, dir) {
  if (dir === 'workflow' || dir === 'roles') return rmSync(join(projectDir, '.claude', dir), {recursive: true, force: true});
  for (const file of readdirSync(join(KIT_CLAUDE, dir))) rmSync(join(projectDir, '.claude', dir, file), {force: true});
}

/** The example as copied, or its title placeholder left in. */
function isProfileUnfilled(profileText) {
  return profileText === readFileSync(join(KIT_ROOT, 'ship-profile.example.md'), 'utf8') || profileText.includes('<your project>');
}

function createProfileOnce(claudeDir) {
  const profilePath = join(claudeDir, PROFILE_FILE);
  if (existsSync(profilePath)) return false;
  cpSync(join(KIT_ROOT, 'ship-profile.example.md'), profilePath);
  return true;
}

function makeExecutable(claudeDir) {
  for (const dir of ['hooks', 'scripts']) {
    for (const file of readdirSync(join(KIT_CLAUDE, dir))) {
      if (/\.(sh|py|mjs)$/.test(file)) chmodSync(join(claudeDir, dir, file), 0o755);
    }
  }
}

function availableSkills() {
  return readdirSync(join(KIT_CLAUDE, 'skills')).filter(name => statSync(join(KIT_CLAUDE, 'skills', name)).isDirectory()).sort();
}

function skillDescription(skill) {
  const text = readFileSync(join(KIT_CLAUDE, 'skills', skill, 'SKILL.md'), 'utf8');
  const description = text.match(/^description:\s*(.+)$/m)?.[1] || '';
  return description.replace(/^Use when /i, '').slice(0, 90);
}

function projectRoot(dir) {
  const projectDir = tryProjectRoot(dir);
  if (!projectDir) throw new Error(`${resolve(dir || '.')} is not inside a git repo`);
  return projectDir;
}

function tryProjectRoot(dir) {
  try {
    return execFileSync('git', ['-C', resolve(dir || '.'), 'rev-parse', '--show-toplevel'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
  } catch {
    return null;
  }
}

function readState(projectDir) {
  const statePath = join(projectDir, '.claude', STATE_FILE);
  return existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
}

function writeState(projectDir, state) {
  writeFileSync(join(projectDir, '.claude', STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
}

function hookCommand(name) {
  return `bash "$CLAUDE_PROJECT_DIR/.claude/hooks/${name}.sh"`;
}

function hasCommand(tool) {
  try {
    execFileSync('command', ['-v', tool], {stdio: 'ignore', shell: true});
    return true;
  } catch {
    return false;
  }
}

function readArgs(list) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < list.length; i++) {
    if (!list[i].startsWith('--')) {
      positional.push(list[i]);
      continue;
    }
    const key = list[i].slice(2);
    const next = list[i + 1];
    flags[key] = next === undefined || next.startsWith('--') ? true : next;
    if (flags[key] !== true) i++;
  }
  return {positional, flags};
}

function printUsage() {
  console.log(`my-ship ${KIT_VERSION} — ship-* skills for Claude Code

  my-ship install [dir]                every skill + shared core into a git project (default: current dir)
  my-ship add <skill...> [--dir d]     only these skills (+ shared core)
  my-ship remove <skill...> | --all    remove skills; --all also removes the core and hook wiring
  my-ship list [--dir d]               available skills (✓ = installed here)
  my-ship update [--dir d]             re-install this project's skills from this version
  my-ship doctor [--dir d]             requirements, hook wiring, profile

Run without installing: npx github:MeanHoang/my-ship <command>`);
}

main();

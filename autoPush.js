'use strict';

const path = require('path');
const { execSync } = require('child_process');
const chokidar = require('chokidar');

const ROOT = path.resolve(__dirname);
const DEBOUNCE_MS = 2000;

/** @type {ReturnType<typeof setTimeout> | null} */
let debounceTimer = null;

function execGit(args, label) {
  try {
    execSync(`git ${args}`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch (err) {
    const stderr = err && err.stderr ? String(err.stderr).trim() : '';
    const msg = err && err.message ? err.message : String(err);
    console.error(`[autoPush] ${label} failed:`, msg);
    if (stderr) {
      console.error(stderr);
    }
    return false;
  }
}

function syncToRemote() {
  console.log('Changes detected...');

  execGit('add -A', 'git add');

  const committed = execGit('commit -m "auto"', 'git commit');
  if (!committed) {
    console.log('[autoPush] Nothing to commit or commit skipped.');
  }

  console.log('Pushing to GitHub...');
  execGit('push origin main', 'git push');
}

function scheduleSync() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    try {
      syncToRemote();
    } catch (e) {
      console.error('[autoPush] Unexpected error in sync:', e && e.message ? e.message : e);
    }
  }, DEBOUNCE_MS);
}

const ignored = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/');
  return (
    normalized.includes('/node_modules/') ||
    normalized.endsWith('/node_modules') ||
    normalized.includes('/.git/') ||
    normalized.endsWith('/.git')
  );
};

try {
  chokidar
    .watch(ROOT, {
      ignored,
      ignoreInitial: true,
      persistent: true,
      depth: 99,
    })
    .on('all', (event, filePath) => {
      if (event === 'error') {
        return;
      }
      try {
        scheduleSync();
      } catch (e) {
        console.error('[autoPush] Error scheduling sync:', e && e.message ? e.message : e);
      }
    })
    .on('error', (err) => {
      console.error('[autoPush] Watcher error:', err && err.message ? err.message : err);
    });

  console.log('Watching for changes...');
} catch (e) {
  console.error('[autoPush] Failed to start watcher:', e && e.message ? e.message : e);
}

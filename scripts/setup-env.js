#!/usr/bin/env node
// 1. Copies .env.example → .env for each subproject (skips if .env already exists)
// 2. Runs `npm install` in each service directory

import { copyFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const envDirs = [
  'common-properties',
  'camera-streaming-server',
  'aersoswift-web-app',
  'facial-recognition/match-service',
];

const serviceDirs = [
  'camera-streaming-server',
  'aersoswift-web-app',
  'facial-recognition/match-service',
];

// ── Step 1: Copy .env files ───────────────────────────────────────────────────
console.log('Setting up environment files...');
for (const dir of envDirs) {
  const example = resolve(root, dir, '.env.example');
  const target = resolve(root, dir, '.env');

  if (!existsSync(example)) {
    console.warn(`  [skip] No .env.example found in ${dir}`);
    continue;
  }

  if (existsSync(target)) {
    console.log(`  [ok]   ${dir}/.env already exists`);
  } else {
    copyFileSync(example, target);
    console.log(`  [copy] ${dir}/.env.example → .env`);
  }
}

// ── Step 2: npm install in each service ──────────────────────────────────────
console.log('\nInstalling dependencies...');
for (const dir of serviceDirs) {
  const absDir = resolve(root, dir);
  if (!existsSync(resolve(absDir, 'package.json'))) {
    console.warn(`  [skip] No package.json in ${dir}`);
    continue;
  }
  console.log(`  [npm install] ${dir}`);
  execSync('npm install', { cwd: absDir, stdio: 'inherit' });
}

console.log('\nSetup complete.\n');

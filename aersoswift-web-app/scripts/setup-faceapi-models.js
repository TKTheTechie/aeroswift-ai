import { cpSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'node_modules', '@vladmandic', 'face-api', 'model');
const dest = join(__dirname, '..', 'static', 'face-api-models');

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('Face API models copied to static/face-api-models/');

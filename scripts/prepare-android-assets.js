#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const androidDir = path.join(projectRoot, 'android');
const webDir = path.join(projectRoot, 'public');
const capacitorConfig = path.join(projectRoot, 'capacitor.config.json');

console.log('Preparing HairIntel Android assets...');

if (!fs.existsSync(androidDir)) {
  console.error('Android project is missing. The committed native project must be preserved for Play Billing.');
  process.exit(1);
}

if (!fs.existsSync(capacitorConfig)) {
  console.error('capacitor.config.json is missing.');
  process.exit(1);
}

if (!fs.existsSync(path.join(webDir, 'index.html'))) {
  console.error('public/index.html is missing. Capacitor requires a local web fallback for sync.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(capacitorConfig, 'utf8'));
if (config.appId !== 'com.hairintel.ai') {
  console.error(`Unexpected Capacitor appId: ${config.appId || '(missing)'}`);
  process.exit(1);
}

if (config.webDir !== 'public') {
  console.error(`Unexpected Capacitor webDir: ${config.webDir || '(missing)'}`);
  process.exit(1);
}

console.log('HairIntel Android configuration validated.');

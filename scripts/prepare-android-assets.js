#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Paths
const webDir = path.join(projectRoot, 'public');
const androidWebDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'public');

console.log('📦 Preparing Android assets...');

// Check if android folder exists
if (!fs.existsSync(path.join(projectRoot, 'android'))) {
  console.log('⚠️  Android folder not found. Run "npm run android:add" first.');
  process.exit(0);
}

// Create android web assets directory if it doesn't exist
if (!fs.existsSync(androidWebDir)) {
  fs.mkdirSync(androidWebDir, { recursive: true });
  console.log(`✅ Created ${androidWebDir}`);
}

// Copy web assets to Android
if (fs.existsSync(webDir)) {
  const copyDir = (src, dest) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(file => {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);
      if (fs.statSync(srcFile).isDirectory()) {
        copyDir(srcFile, destFile);
      } else {
        fs.copyFileSync(srcFile, destFile);
      }
    });
  };

  copyDir(webDir, androidWebDir);
  console.log(`✅ Synced web assets to ${androidWebDir}`);
} else {
  console.log(`⚠️  No public folder found at ${webDir}`);
}

// Create a basic capacitor.config.ts if it doesn't exist
const capacitorConfig = path.join(projectRoot, 'capacitor.config.ts');
if (!fs.existsSync(capacitorConfig)) {
  const config = `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hairintel.app',
  appName: 'HairIntel AI',
  webDir: 'public',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
`;
  fs.writeFileSync(capacitorConfig, config);
  console.log(`✅ Created ${capacitorConfig}`);
}

console.log('✅ Android assets prepared!');

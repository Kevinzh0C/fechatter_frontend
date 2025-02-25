#!/usr/bin/env node

/**
 * Copy Configuration Files Script
 * Copies YAML configuration files to public directory for web access
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration files to copy
const configs = [
  { src: 'config/development.yml', dest: 'public/config/development.yml' },
  { src: 'config/production.yml', dest: 'public/config/production.yml' }
];

// Ensure destination directory exists
const destDir = path.dirname(configs[0].dest);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

console.log('Copying configuration files...');

// Copy each configuration file
configs.forEach(({ src, dest }) => {
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      const stats = fs.statSync(dest);
      console.log(`✓ ${path.basename(dest)} (${stats.size} bytes)`);
    } else {
      console.warn(`⚠ Source file not found: ${src}`);
    }
  } catch (error) {
    console.error(`✗ Failed to copy ${src}:`, error.message);
    process.exit(1);
  }
});

console.log('Configuration files ready!'); 
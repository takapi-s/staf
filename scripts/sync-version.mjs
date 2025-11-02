#!/usr/bin/env node
/**
 * Sync version from package.json to tauri.conf.json and Cargo.toml
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version;

console.log(`Syncing version ${version}...`);

// Update tauri.conf.json
const tauriConfigPath = join(rootDir, 'src-tauri', 'tauri.conf.json');
const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, 'utf-8'));
tauriConfig.version = version;
writeFileSync(
  tauriConfigPath,
  JSON.stringify(tauriConfig, null, 2) + '\n',
  'utf-8'
);
console.log('✅ Updated src-tauri/tauri.conf.json');

// Update Cargo.toml
const cargoTomlPath = join(rootDir, 'src-tauri', 'Cargo.toml');
const cargoToml = readFileSync(cargoTomlPath, 'utf-8');
const updatedCargoToml = cargoToml.replace(
  /^version = "[^"]*"/m,
  `version = "${version}"`
);
writeFileSync(cargoTomlPath, updatedCargoToml, 'utf-8');
console.log('✅ Updated src-tauri/Cargo.toml');

console.log(`\n✨ Version sync complete!`);


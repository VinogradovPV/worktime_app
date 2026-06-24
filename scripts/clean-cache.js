#!/usr/bin/env node

/**
 * Скрипт для очистки кэша Metro bundler и других кэшей перед сборкой
 * Использование: node scripts/clean-cache.js [--full]
 * 
 * Флаги:
 * --full    Полная очистка (включая node_modules/.cache)
 * --verbose Подробный вывод
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const isFull = args.includes('--full');
const isVerbose = args.includes('--verbose');

const projectRoot = path.join(__dirname, '..');
const cacheDirs = [
  '.metro-cache',
  '.watchman-state',
  'node_modules/.cache',
  '.expo',
];

function log(message) {
  console.log(`[clean-cache] ${message}`);
}

function logVerbose(message) {
  if (isVerbose) {
    console.log(`[clean-cache] ${message}`);
  }
}

function removeDir(dirPath) {
  const fullPath = path.join(projectRoot, dirPath);
  
  if (fs.existsSync(fullPath)) {
    try {
      // Используем rm -rf для надежной очистки
      execSync(`rm -rf "${fullPath}"`, { stdio: 'pipe' });
      log(`✓ Удалена директория: ${dirPath}`);
      return true;
    } catch (error) {
      console.error(`✗ Ошибка при удалении ${dirPath}: ${error.message}`);
      return false;
    }
  } else {
    logVerbose(`⊘ Директория не найдена: ${dirPath}`);
    return true;
  }
}

function main() {
  log('Начало очистки кэша...');
  
  if (isVerbose) {
    log(`Режим: ${isFull ? 'ПОЛНАЯ' : 'СТАНДАРТНАЯ'} очистка`);
    log(`Рабочая директория: ${projectRoot}`);
  }
  
  let successCount = 0;
  
  // Стандартная очистка
  const standardDirs = ['.metro-cache', '.watchman-state'];
  for (const dir of standardDirs) {
    if (removeDir(dir)) successCount++;
  }
  
  // Полная очистка
  if (isFull) {
    log('Выполняется полная очистка...');
    const fullDirs = ['node_modules/.cache', '.expo'];
    for (const dir of fullDirs) {
      if (removeDir(dir)) successCount++;
    }
  }
  
  log(`\n✓ Очистка завершена (удалено ${successCount} директорий)`);
  
  if (isVerbose) {
    log('Готово к сборке!');
  }
}

main();

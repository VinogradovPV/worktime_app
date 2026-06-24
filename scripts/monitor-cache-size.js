#!/usr/bin/env node

/**
 * Скрипт для мониторинга размера кэша Metro bundler
 * Выдает предупреждение если .metro-cache превышает 500MB
 * 
 * Использование: node scripts/monitor-cache-size.js [--threshold 500]
 * 
 * Флаги:
 * --threshold <MB>  Установить пороговое значение в МБ (по умолчанию 500)
 * --verbose         Подробный вывод
 * --watch           Мониторить размер в реальном времени (каждые 10 сек)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const isVerbose = args.includes('--verbose');
const isWatch = args.includes('--watch');

let threshold = 500; // МБ по умолчанию
const thresholdIndex = args.indexOf('--threshold');
if (thresholdIndex !== -1 && args[thresholdIndex + 1]) {
  threshold = parseInt(args[thresholdIndex + 1], 10);
}

const projectRoot = path.join(__dirname, '..');
const cacheDir = path.join(projectRoot, '.metro-cache');

function log(message) {
  console.log(`[cache-monitor] ${message}`);
}

function logVerbose(message) {
  if (isVerbose) {
    console.log(`[cache-monitor] ${message}`);
  }
}

function getDirectorySize(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }
    
    const result = execSync(`du -sb "${dirPath}"`, { encoding: 'utf-8' });
    const bytes = parseInt(result.split('\t')[0], 10);
    return bytes;
  } catch (error) {
    logVerbose(`Ошибка при расчете размера: ${error.message}`);
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkCacheSize() {
  const bytes = getDirectorySize(cacheDir);
  const mb = bytes / (1024 * 1024);
  const formatted = formatBytes(bytes);
  
  log(`Размер .metro-cache: ${formatted} (${mb.toFixed(2)} MB)`);
  
  if (mb > threshold) {
    const exceedBy = (mb - threshold).toFixed(2);
    console.warn(`\n⚠️  ПРЕДУПРЕЖДЕНИЕ: Размер кэша превышает ${threshold}MB на ${exceedBy}MB!`);
    console.warn(`   Рекомендуется выполнить очистку: pnpm clean-cache:full\n`);
    return false;
  } else {
    const remaining = (threshold - mb).toFixed(2);
    logVerbose(`✓ Размер кэша в норме (осталось ${remaining}MB до лимита)`);
    return true;
  }
}

function monitorCacheSize() {
  log(`Мониторинг размера кэша (порог: ${threshold}MB)...`);
  log(`Директория: ${cacheDir}\n`);
  
  // Первая проверка
  checkCacheSize();
  
  if (isWatch) {
    // Мониторить каждые 10 секунд
    log('Мониторинг в реальном времени (Ctrl+C для выхода)...\n');
    
    setInterval(() => {
      const now = new Date().toLocaleTimeString();
      process.stdout.write(`[${now}] `);
      checkCacheSize();
    }, 10000);
  }
}

function getCacheStats() {
  try {
    if (!fs.existsSync(cacheDir)) {
      log('Директория .metro-cache не найдена');
      return;
    }
    
    const files = execSync(`find "${cacheDir}" -type f | wc -l`, { encoding: 'utf-8' });
    const dirs = execSync(`find "${cacheDir}" -type d | wc -l`, { encoding: 'utf-8' });
    const bytes = getDirectorySize(cacheDir);
    
    log('\nСтатистика кэша:');
    log(`  Файлов: ${files.trim()}`);
    log(`  Директорий: ${dirs.trim()}`);
    log(`  Размер: ${formatBytes(bytes)}`);
    
    // Топ 5 самых больших файлов
    log('\nТоп 5 самых больших файлов:');
    try {
      const topFiles = execSync(
        `find "${cacheDir}" -type f -exec ls -lh {} \\; | sort -k5 -hr | head -5 | awk '{print $5, $9}'`,
        { encoding: 'utf-8' }
      );
      topFiles.split('\n').forEach((line, index) => {
        if (line.trim()) {
          const [size, file] = line.trim().split(' ');
          const filename = path.basename(file);
          log(`  ${index + 1}. ${filename} (${size})`);
        }
      });
    } catch (error) {
      logVerbose('Не удалось получить список файлов');
    }
  } catch (error) {
    log(`Ошибка при получении статистики: ${error.message}`);
  }
}

function main() {
  if (args.includes('--stats')) {
    getCacheStats();
  } else if (args.includes('--help')) {
    console.log(`
Скрипт для мониторинга размера кэша Metro bundler

Использование: node scripts/monitor-cache-size.js [опции]

Опции:
  --threshold <MB>  Установить пороговое значение в МБ (по умолчанию 500)
  --verbose         Подробный вывод
  --watch           Мониторить размер в реальном времени (каждые 10 сек)
  --stats           Показать подробную статистику кэша
  --help            Показать эту справку

Примеры:
  node scripts/monitor-cache-size.js
  node scripts/monitor-cache-size.js --threshold 300
  node scripts/monitor-cache-size.js --watch --verbose
  node scripts/monitor-cache-size.js --stats
    `);
  } else {
    monitorCacheSize();
  }
}

main();

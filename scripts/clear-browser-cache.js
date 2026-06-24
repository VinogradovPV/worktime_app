#!/usr/bin/env node

/**
 * Скрипт для очистки браузерного кэша (localStorage, sessionStorage)
 * Используется для тестирования приложения на чистой сессии
 * 
 * Использование: node scripts/clear-browser-cache.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function log(message) {
  console.log(`[clear-browser-cache] ${message}`);
}

function getBrowserCachePaths() {
  const homeDir = os.homedir();
  const platform = process.platform;
  
  const paths = {
    chrome: [],
    firefox: [],
    edge: [],
  };
  
  if (platform === 'win32') {
    // Windows paths
    paths.chrome = [
      path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
      path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
    ];
    paths.firefox = [
      path.join(homeDir, 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles'),
    ];
    paths.edge = [
      path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
    ];
  } else if (platform === 'darwin') {
    // macOS paths
    paths.chrome = [
      path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Cache'),
      path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Code Cache'),
    ];
    paths.firefox = [
      path.join(homeDir, 'Library', 'Application Support', 'Firefox', 'Profiles'),
    ];
    paths.edge = [
      path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge', 'Default', 'Cache'),
    ];
  } else if (platform === 'linux') {
    // Linux paths
    paths.chrome = [
      path.join(homeDir, '.cache', 'google-chrome', 'Default'),
      path.join(homeDir, '.config', 'google-chrome', 'Default', 'Cache'),
    ];
    paths.firefox = [
      path.join(homeDir, '.cache', 'mozilla', 'firefox'),
      path.join(homeDir, '.mozilla', 'firefox'),
    ];
    paths.edge = [
      path.join(homeDir, '.cache', 'microsoft-edge', 'Default'),
    ];
  }
  
  return paths;
}

function clearDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return false;
    }
    
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        clearDirectory(filePath);
        try {
          fs.rmdirSync(filePath);
        } catch (e) {
          // Директория может быть не пуста или заблокирована
        }
      } else {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          // Файл может быть заблокирован
        }
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

function clearBrowserCaches() {
  const paths = getBrowserCachePaths();
  let clearedCount = 0;
  
  log('Начало очистки браузерного кэша...');
  
  // Chrome
  log('\nОчистка Chrome кэша...');
  for (const cachePath of paths.chrome) {
    if (clearDirectory(cachePath)) {
      log(`✓ Очищен: ${cachePath}`);
      clearedCount++;
    }
  }
  
  // Firefox
  log('\nОчистка Firefox кэша...');
  for (const profilePath of paths.firefox) {
    if (fs.existsSync(profilePath)) {
      const profiles = fs.readdirSync(profilePath);
      for (const profile of profiles) {
        const cachePath = path.join(profilePath, profile, 'cache2');
        if (clearDirectory(cachePath)) {
          log(`✓ Очищен: ${cachePath}`);
          clearedCount++;
        }
      }
    }
  }
  
  // Edge
  log('\nОчистка Edge кэша...');
  for (const cachePath of paths.edge) {
    if (clearDirectory(cachePath)) {
      log(`✓ Очищен: ${cachePath}`);
      clearedCount++;
    }
  }
  
  log(`\n✓ Очистка браузерного кэша завершена (очищено ${clearedCount} директорий)`);
}

function createClearCacheScript() {
  const scriptPath = path.join(__dirname, '..', 'lib', '_core', 'clear-storage.ts');
  
  const scriptContent = `/**
 * Функция для очистки localStorage и sessionStorage
 * Используется для тестирования приложения на чистой сессии
 */

export function clearBrowserStorage() {
  try {
    // Очистить localStorage
    localStorage.clear();
    console.log('[Storage] localStorage очищен');
  } catch (error) {
    console.error('[Storage] Ошибка при очистке localStorage:', error);
  }
  
  try {
    // Очистить sessionStorage
    sessionStorage.clear();
    console.log('[Storage] sessionStorage очищен');
  } catch (error) {
    console.error('[Storage] Ошибка при очистке sessionStorage:', error);
  }
}

/**
 * Функция для получения размера хранилища
 */
export function getStorageSize() {
  let size = 0;
  
  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length;
      }
    }
  } catch (error) {
    console.error('[Storage] Ошибка при расчете размера localStorage:', error);
  }
  
  return size;
}

/**
 * Функция для логирования содержимого хранилища
 */
export function logStorageContents() {
  console.log('[Storage] Содержимое localStorage:');
  
  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage[key];
        const size = (value.length + key.length) / 1024; // в КБ
        console.log(\`  - \${key}: \${size.toFixed(2)} КБ\`);
      }
    }
  } catch (error) {
    console.error('[Storage] Ошибка при логировании localStorage:', error);
  }
}
`;
  
  try {
    fs.writeFileSync(scriptPath, scriptContent);
    log(`✓ Создан скрипт для очистки хранилища: ${scriptPath}`);
  } catch (error) {
    log(`✗ Ошибка при создании скрипта: ${error.message}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--browser-only')) {
    // Очистить только браузерный кэш
    clearBrowserCaches();
  } else if (args.includes('--create-script')) {
    // Создать скрипт для очистки хранилища
    createClearCacheScript();
  } else {
    // По умолчанию создать скрипт
    createClearCacheScript();
    log('\nДля очистки браузерного кэша используйте флаг --browser-only');
  }
}

main();

/**
 * Функции для очистки браузерного хранилища (localStorage, sessionStorage)
 * Используется для тестирования приложения на чистой сессии
 */

/**
 * Очистить все хранилище браузера
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
 * Очистить только localStorage
 */
export function clearLocalStorage() {
  try {
    localStorage.clear();
    console.log('[Storage] localStorage очищен');
    return true;
  } catch (error) {
    console.error('[Storage] Ошибка при очистке localStorage:', error);
    return false;
  }
}

/**
 * Очистить только sessionStorage
 */
export function clearSessionStorage() {
  try {
    sessionStorage.clear();
    console.log('[Storage] sessionStorage очищен');
    return true;
  } catch (error) {
    console.error('[Storage] Ошибка при очистке sessionStorage:', error);
    return false;
  }
}

/**
 * Получить размер хранилища в байтах
 */
export function getStorageSize(): number {
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
 * Получить размер хранилища в удобном формате
 */
export function getStorageSizeFormatted(): string {
  const bytes = getStorageSize();
  return formatBytes(bytes);
}

/**
 * Получить список всех ключей в localStorage
 */
export function getStorageKeys(): string[] {
  const keys: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);
      }
    }
  } catch (error) {
    console.error('[Storage] Ошибка при получении ключей:', error);
  }

  return keys;
}

/**
 * Логировать содержимое хранилища
 */
export function logStorageContents() {
  console.log('[Storage] Содержимое localStorage:');

  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage[key];
        const size = (value.length + key.length) / 1024; // в КБ
        console.log(`  - ${key}: ${size.toFixed(2)} КБ`);
      }
    }
  } catch (error) {
    console.error('[Storage] Ошибка при логировании localStorage:', error);
  }
}

/**
 * Удалить конкретный ключ из хранилища
 */
export function removeStorageKey(key: string): boolean {
  try {
    localStorage.removeItem(key);
    console.log(`[Storage] Ключ '${key}' удален`);
    return true;
  } catch (error) {
    console.error(`[Storage] Ошибка при удалении ключа '${key}':`, error);
    return false;
  }
}

/**
 * Получить значение из хранилища
 */
export function getStorageValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`[Storage] Ошибка при получении значения '${key}':`, error);
    return null;
  }
}

/**
 * Установить значение в хранилище
 */
export function setStorageValue(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`[Storage] Ошибка при установке значения '${key}':`, error);
    return false;
  }
}

/**
 * Проверить доступность хранилища
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    console.warn('[Storage] localStorage недоступен:', error);
    return false;
  }
}

/**
 * Форматировать размер в байтах в удобный формат
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Создать кнопку для очистки хранилища (для отладки)
 * Используется только в режиме разработки
 */
export function createClearStorageButton() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const button = document.createElement('button');
  button.textContent = 'Clear Storage (Dev)';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '9999';
  button.style.padding = '10px 15px';
  button.style.backgroundColor = '#ff6b6b';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.fontSize = '12px';

  button.addEventListener('click', () => {
    if (confirm('Вы уверены? Это удалит все данные из localStorage.')) {
      clearBrowserStorage();
      location.reload();
    }
  });

  document.body.appendChild(button);
}

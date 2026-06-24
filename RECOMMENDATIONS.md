# Реализованные рекомендации

Этот документ описывает три рекомендации, которые были реализованы для оптимизации процесса разработки и сборки приложения.

## 1. GitHub Actions Workflow для автоматической очистки кэша перед сборкой APK

### Файл: `.github/workflows/build-apk.yml`

Создан полностью автоматизированный workflow для сборки APK с автоматической очисткой кэша.

### Что делает workflow:

1. **Триггеры:**
   - Автоматически запускается при push в `main` и `develop` ветки
   - Может быть запущен вручную через `workflow_dispatch`

2. **Шаги сборки:**
   - Checkout кода из репозитория
   - Setup Node.js (версия 22)
   - Setup pnpm (версия 9.12.0)
   - Установка зависимостей
   - **Очистка Metro кэша** (`pnpm clean-cache:full`)
   - Проверка TypeScript (`pnpm check`)
   - Lint кода (`pnpm lint`)
   - Запуск тестов (`pnpm test`)
   - Сборка сервера (`pnpm build`)
   - Setup EAS CLI
   - Сборка APK
   - Загрузка артефакта (хранится 30 дней)

### Использование:

```bash
# Workflow запустится автоматически при push
git push origin main

# Или запустить вручную через GitHub UI
# Actions → Build APK with Cache Cleanup → Run workflow
```

### Требуемые переменные окружения:

Добавьте в GitHub Secrets:
- `EXPO_TOKEN` — токен для Expo

```bash
# Получить токен:
# 1. Перейти на https://expo.dev/
# 2. Войти в аккаунт
# 3. Перейти в Settings → Access Tokens
# 4. Создать новый токен
# 5. Добавить в GitHub Secrets
```

### Преимущества:

- ✅ Полностью автоматизированная сборка
- ✅ Гарантированная очистка кэша перед каждой сборкой
- ✅ Запуск тестов и проверок перед сборкой
- ✅ Артефакты сохраняются для скачивания
- ✅ Не требует локального окружения

---

## 2. Скрипт для очистки браузерного кэша (localStorage, sessionStorage)

### Файлы:
- `scripts/clear-browser-cache.js` — Node.js скрипт для очистки браузерного кэша
- `lib/_core/clear-storage.ts` — TypeScript функции для очистки хранилища в приложении

### Использование Node.js скрипта:

```bash
# Создать TypeScript скрипт для очистки хранилища
pnpm run clear-browser-cache

# Очистить браузерный кэш (требует закрытого браузера)
pnpm run clear-browser-cache -- --browser-only
```

### Использование в приложении:

```typescript
import { clearBrowserStorage, getStorageSizeFormatted, logStorageContents } from '@/lib/_core/clear-storage';

// Очистить все хранилище
clearBrowserStorage();

// Получить размер хранилища
const size = getStorageSizeFormatted();
console.log(`Размер хранилища: ${size}`);

// Логировать содержимое
logStorageContents();

// Удалить конкретный ключ
removeStorageKey('auth_token');

// Проверить доступность хранилища
if (isStorageAvailable()) {
  setStorageValue('key', 'value');
}
```

### Доступные функции:

| Функция | Описание |
|---------|---------|
| `clearBrowserStorage()` | Очистить localStorage и sessionStorage |
| `clearLocalStorage()` | Очистить только localStorage |
| `clearSessionStorage()` | Очистить только sessionStorage |
| `getStorageSize()` | Получить размер в байтах |
| `getStorageSizeFormatted()` | Получить размер в удобном формате |
| `getStorageKeys()` | Получить список всех ключей |
| `logStorageContents()` | Логировать содержимое |
| `removeStorageKey(key)` | Удалить конкретный ключ |
| `getStorageValue(key)` | Получить значение |
| `setStorageValue(key, value)` | Установить значение |
| `isStorageAvailable()` | Проверить доступность |
| `createClearStorageButton()` | Создать кнопку для отладки (dev only) |

### Сценарии использования:

**Сценарий 1: Тестирование на чистой сессии**
```typescript
// В начале теста
clearBrowserStorage();

// Выполнить тест
// ...

// Проверить результаты
```

**Сценарий 2: Отладка проблем с кэшем**
```typescript
// Логировать содержимое хранилища
logStorageContents();

// Получить размер
console.log(`Размер: ${getStorageSizeFormatted()}`);

// Очистить и перезагрузить
clearBrowserStorage();
location.reload();
```

**Сценарий 3: Кнопка для отладки в режиме разработки**
```typescript
// В app/_layout.tsx (только в dev)
import { createClearStorageButton } from '@/lib/_core/clear-storage';

if (process.env.NODE_ENV === 'development') {
  createClearStorageButton();
}
```

---

## 3. Мониторинг размера кэша Metro с автоматическим предупреждением

### Файл: `scripts/monitor-cache-size.js`

Скрипт для мониторинга размера `.metro-cache` с автоматическим предупреждением при превышении лимита.

### Использование:

```bash
# Проверить текущий размер кэша
pnpm run monitor-cache

# Мониторить размер в реальном времени (каждые 10 сек)
pnpm run monitor-cache:watch

# Показать подробную статистику
pnpm run monitor-cache:stats

# Установить пользовательский порог (например, 300MB)
node scripts/monitor-cache-size.js --threshold 300

# Подробный вывод
node scripts/monitor-cache-size.js --verbose
```

### Автоматическая проверка перед сборкой:

```bash
# Автоматически проверяет размер перед сборкой
pnpm build
```

### Примеры вывода:

**Нормальный размер:**
```
[cache-monitor] Размер .metro-cache: 234.56 MB (234.56 MB)
[cache-monitor] ✓ Размер кэша в норме (осталось 265.44MB до лимита)
```

**Превышение лимита:**
```
[cache-monitor] Размер .metro-cache: 567.89 MB (567.89 MB)

⚠️  ПРЕДУПРЕЖДЕНИЕ: Размер кэша превышает 500MB на 67.89MB!
   Рекомендуется выполнить очистку: pnpm clean-cache:full
```

**Статистика кэша:**
```
[cache-monitor] Статистика кэша:
  Файлов: 1234
  Директорий: 456
  Размер: 234.56 MB

[cache-monitor] Топ 5 самых больших файлов:
  1. bundle.js (45.6M)
  2. cache.json (23.4M)
  3. module-1.js (12.3M)
  4. module-2.js (8.9M)
  5. module-3.js (6.7M)
```

### Интеграция с CI/CD:

```yaml
# .github/workflows/build-apk.yml
- name: Monitor cache size
  run: pnpm monitor-cache

- name: Build with cache cleanup if needed
  run: |
    if [ $(du -sb .metro-cache | cut -f1) -gt 524288000 ]; then
      echo "Cache too large, cleaning..."
      pnpm clean-cache:full
    fi
    pnpm build
```

### Пороговые значения:

| Сценарий | Рекомендуемый порог |
|----------|-------------------|
| Разработка | 500 MB |
| CI/CD | 300 MB |
| Мобильные устройства | 200 MB |
| Встроенные системы | 100 MB |

---

## Интеграция всех трех рекомендаций

### Полный workflow разработки:

```bash
# 1. Разработка с автоматической очисткой
pnpm dev

# 2. Перед коммитом - проверить размер кэша
pnpm monitor-cache

# 3. Запустить тесты на чистой сессии
pnpm test:clean

# 4. Сборка с очисткой и проверкой
pnpm build

# 5. Push в репозиторий
git push origin main

# 6. GitHub Actions автоматически:
#    - Очищает кэш
#    - Проверяет размер
#    - Собирает APK
#    - Загружает артефакт
```

### Для тестирования на чистой сессии:

```bash
# 1. Очистить браузерный кэш
pnpm clear-browser-cache

# 2. Очистить Metro кэш
pnpm clean-cache:full

# 3. Запустить приложение
pnpm dev

# 4. В приложении использовать функции очистки
import { clearBrowserStorage } from '@/lib/_core/clear-storage';
clearBrowserStorage();
```

---

## Команды для быстрого доступа

```bash
# Кэш Metro
pnpm clean-cache              # Стандартная очистка
pnpm clean-cache:full         # Полная очистка
pnpm clean-cache:verbose      # С подробным выводом

# Браузерный кэш
pnpm clear-browser-cache      # Создать скрипт очистки

# Мониторинг
pnpm monitor-cache            # Проверить размер
pnpm monitor-cache:watch      # Мониторить в реальном времени
pnpm monitor-cache:stats      # Показать статистику

# Разработка
pnpm dev                       # С автоматической очисткой
pnpm build                     # С проверкой размера кэша
pnpm test:clean              # Тесты на чистой сессии
```

---

## Решение проблем

### Проблема: Workflow не запускается

**Решение:**
1. Проверьте, что файл `.github/workflows/build-apk.yml` существует
2. Убедитесь, что `EXPO_TOKEN` добавлен в GitHub Secrets
3. Проверьте логи в GitHub Actions

### Проблема: Скрипт выдает ошибку "Permission denied"

**Решение:**
```bash
chmod +x scripts/clear-browser-cache.js
chmod +x scripts/monitor-cache-size.js
```

### Проблема: Мониторинг показывает неправильный размер

**Решение:**
```bash
# Пересчитать размер вручную
du -sh .metro-cache

# Если размер не совпадает, очистить и пересчитать
pnpm clean-cache:full
du -sh .metro-cache
```

---

## Дополнительные ресурсы

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Expo CLI Documentation](https://docs.expo.dev/eas-update/introduction/)
- [Metro Bundler Documentation](https://facebook.github.io/metro/)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)

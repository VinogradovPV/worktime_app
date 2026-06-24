# Автоматизация очистки кэша Metro bundler

## Обзор

В проекте реализована автоматическая очистка кэша Metro bundler перед каждой сборкой. Это предотвращает проблемы с устаревшим кэшем и обеспечивает чистую сборку.

## Доступные команды

### 1. Стандартная очистка кэша

```bash
pnpm clean-cache
```

Удаляет основные директории кэша:
- `.metro-cache` — кэш Metro bundler
- `.watchman-state` — кэш файловой системы

### 2. Полная очистка кэша

```bash
pnpm clean-cache:full
```

Удаляет все кэши, включая:
- `.metro-cache`
- `.watchman-state`
- `node_modules/.cache`
- `.expo`

### 3. Очистка с подробным выводом

```bash
pnpm clean-cache:verbose
```

Выполняет стандартную очистку с детальным логированием.

## Автоматическая очистка

### Перед разработкой (dev)

```bash
pnpm dev
```

Автоматически выполняет `pnpm clean-cache` перед запуском dev-server благодаря `predev` скрипту.

### Перед сборкой (build)

```bash
pnpm build
```

Автоматически выполняет `pnpm clean-cache` перед сборкой благодаря `prebuild` скрипту.

## Как это работает

### Механизм npm pre-scripts

npm/pnpm автоматически запускают скрипты с префиксом `pre` перед основным скриптом:

```json
{
  "scripts": {
    "predev": "pnpm clean-cache",    // Запустится перед 'pnpm dev'
    "dev": "...",
    "prebuild": "pnpm clean-cache",  // Запустится перед 'pnpm build'
    "build": "..."
  }
}
```

### Структура clean-cache.js

Скрипт `/home/ubuntu/worktime_app/scripts/clean-cache.js`:
- Удаляет директории кэша с использованием `rm -rf`
- Поддерживает флаги `--full` и `--verbose`
- Выводит результаты операций
- Обрабатывает ошибки корректно

## Примеры использования

### Сценарий 1: Разработка с автоматической очисткой

```bash
# Кэш автоматически очищается перед запуском
pnpm dev
```

### Сценарий 2: Полная очистка перед финальной сборкой

```bash
# Полная очистка всех кэшей
pnpm clean-cache:full

# Затем запустить сборку
pnpm build
```

### Сценарий 3: Отладка проблем с кэшем

```bash
# Очистка с подробным выводом
pnpm clean-cache:verbose

# Запустить dev с логами
pnpm dev
```

### Сценарий 4: Создание APK с чистым кэшем

```bash
# Полная очистка
pnpm clean-cache:full

# Затем создать APK
eas build --platform android --local
```

## Когда нужна полная очистка?

Используйте `pnpm clean-cache:full` в следующих случаях:

1. **После обновления зависимостей**
   ```bash
   pnpm install
   pnpm clean-cache:full
   pnpm dev
   ```

2. **Перед созданием финального build (APK/IPA)**
   ```bash
   pnpm clean-cache:full
   eas build --platform android
   ```

3. **После крупных изменений конфигурации**
   ```bash
   # Изменили app.config.ts, tailwind.config.js и т.д.
   pnpm clean-cache:full
   pnpm dev
   ```

4. **При странных ошибках сборки**
   ```bash
   pnpm clean-cache:full
   pnpm check  # Проверить TypeScript
   pnpm dev
   ```

## Дополнительные советы

### Очистка браузерного кэша

Если превью показывает старую версию, также очистите браузерный кэш:

**Chrome/Edge/Brave:**
- Нажмите `Ctrl+Shift+Delete` (или `Cmd+Shift+Delete` на Mac)
- Выберите "Кэшированные изображения и файлы"
- Нажмите "Очистить"

**Firefox:**
- Нажмите `Ctrl+Shift+Delete`
- Выберите "Кэш"
- Нажмите "Очистить"

### Полная очистка проекта (ядерный вариант)

Если ничего не помогает:

```bash
# Остановить dev-server (Ctrl+C)

# Удалить все кэши и зависимости
rm -rf node_modules pnpm-lock.yaml .metro-cache .watchman-state .expo

# Переустановить зависимости
pnpm install

# Запустить с чистым кэшем
pnpm dev
```

## Интеграция с CI/CD

Для использования в CI/CD pipeline (GitHub Actions, GitLab CI и т.д.):

```yaml
# .github/workflows/build.yml
- name: Clean cache
  run: pnpm clean-cache:full

- name: Build
  run: pnpm build

- name: Create APK
  run: eas build --platform android --local
```

## Отключение автоматической очистки

Если вам нужно отключить автоматическую очистку перед dev/build:

```bash
# Запустить dev без очистки кэша
pnpm run dev:metro

# Запустить build без очистки кэша
pnpm run build
```

## Решение проблем

### Проблема: Скрипт не выполняется

**Решение:** Проверьте права доступа
```bash
chmod +x scripts/clean-cache.js
```

### Проблема: "Permission denied" при удалении файлов

**Решение:** Используйте `sudo` (если необходимо)
```bash
sudo pnpm clean-cache:full
```

### Проблема: Скрипт зависает

**Решение:** Остановите процесс и попробуйте вручную
```bash
# Ctrl+C для остановки

# Ручная очистка
rm -rf .metro-cache .watchman-state node_modules/.cache .expo

# Запустить снова
pnpm dev
```

## Дополнительные ресурсы

- [Metro Bundler Documentation](https://facebook.github.io/metro/)
- [Expo Documentation](https://docs.expo.dev/)
- [npm Scripts Documentation](https://docs.npmjs.com/cli/v8/using-npm/scripts)

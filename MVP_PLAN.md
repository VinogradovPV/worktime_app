# MVP План - WorkTime App

**Дата:** 2026-07-07  
**Статус:** Планирование  
**Версия:** 2.0 (исправленная)

---

## 📋 Обзор

Минимально жизнеспособный продукт (MVP) WorkTime App включает:
- Аутентификацию с JWT токенами
- Управление пользователями (регистрация, подтверждение, роли)
- Справочники (подразделения, должности)
- Синхронизацию рабочих дней
- Базовые административные функции

---

## 🎯 Фазы реализации

### Фаза 1: Критические Auth endpoints (ПРИОРИТЕТ 1)

**Статус:** В процессе  
**Сроки:** 1-2 дня

#### 1.1 POST /api/v1/auth/login
- **Request:** `{ login, password }`
- **Response:** `{ ok, access_token, refresh_token, user }`
- **Логика:**
  - Проверить credentials в БД (bcrypt)
  - Если статус != "active" → ошибка
  - Выдать JWT токены (access: 15-30 мин, refresh: 7 дней)
  - Вернуть информацию о пользователе

#### 1.2 POST /api/v1/auth/register
- **Request:** `{ login, password, passwordConfirm, displayName, orgUnitId, positionId, comment? }`
- **Response:** `{ ok, status: "pending", message }`
- **Логика:**
  - Создать пользователя со статусом "pending"
  - Роль = "user" (не выбирается пользователем)
  - managedOrgUnitId = null
  - НЕ возвращать токен
  - Отправить уведомление администратору

#### 1.3 GET /api/v1/auth/me
- **Request:** Bearer token в заголовке
- **Response:** `{ ok, user }`
- **Логика:**
  - Проверить валидность токена
  - Вернуть информацию о текущем пользователе

#### 1.4 POST /api/v1/auth/refresh
- **Request:** `{ refresh_token }`
- **Response:** `{ ok, access_token, refresh_token }`
- **Логика:**
  - Проверить валидность refresh_token
  - Выдать новые токены
  - Обновить refresh_token в БД

#### 1.5 POST /api/v1/auth/logout
- **Request:** Bearer token
- **Response:** `{ ok }`
- **Логика:**
  - Инвалидировать токены (опционально)
  - Очистить сессию

#### 1.6 POST /api/v1/auth/change-password
- **Request:** `{ currentPassword, newPassword }`
- **Response:** `{ ok }`
- **Логика:**
  - Проверить текущий пароль
  - Обновить пароль (bcrypt)

---

### Фаза 2: Публичные справочники (ПРИОРИТЕТ 2)

**Статус:** Планирование  
**Сроки:** 1 день

#### 2.1 GET /api/v1/directories/org-units
- **Request:** Без параметров (публичный)
- **Response:** `{ ok, org_units: [], total }`
- **Логика:**
  - Вернуть все активные подразделения
  - Иерархия: parent_id

#### 2.2 GET /api/v1/directories/positions
- **Request:** Без параметров (публичный)
- **Response:** `{ ok, positions: [], total }`
- **Логика:**
  - Вернуть все активные должности

---

### Фаза 3: Администраторские функции (ПРИОРИТЕТ 3)

**Статус:** Планирование  
**Сроки:** 2-3 дня

#### 3.1 GET /api/v1/admin/registration-requests
- **Request:** Bearer token (только admin)
- **Response:** `{ ok, requests: [], total }`
- **Логика:**
  - Вернуть заявки со статусом "pending"

#### 3.2 POST /api/v1/admin/users/:id/approve
- **Request:** `{ role: "user" | "unit_manager" | "department_manager" | "admin" }`
- **Response:** `{ ok, user }`
- **Логика:**
  - Обновить статус на "active"
  - Установить роль
  - Отправить уведомление пользователю

#### 3.3 POST /api/v1/admin/users/:id/reject
- **Request:** `{ reason? }`
- **Response:** `{ ok }`
- **Логика:**
  - Удалить заявку
  - Отправить уведомление

#### 3.4 GET /api/v1/admin/users
- **Request:** Фильтры: `role`, `status`, `limit`, `offset`
- **Response:** `{ ok, users: [], total }`
- **Логика:**
  - Вернуть пользователей с фильтрацией

#### 3.5 POST /api/v1/admin/users/:id/assign-role
- **Request:** `{ role }`
- **Response:** `{ ok }`
- **Логика:**
  - Обновить роль пользователя

#### 3.6 POST /api/v1/admin/users/:id/reset-password
- **Request:** Без параметров
- **Response:** `{ ok, temp_password }`
- **Логика:**
  - Сгенерировать временный пароль
  - Отправить пользователю

#### 3.7 POST /api/v1/admin/users/:id/block
- **Request:** Без параметров
- **Response:** `{ ok }`

#### 3.8 POST /api/v1/admin/users/:id/unblock
- **Request:** Без параметров
- **Response:** `{ ok }`

---

### Фаза 4: Синхронизация (ПРИОРИТЕТ 4)

**Статус:** Планирование  
**Сроки:** 2-3 дня

#### 4.1 POST /api/v1/sync/upload-workdays
- **Request:** `{ workdays: [] }`
- **Response:** `{ ok, synced_count }`

#### 4.2 GET /api/v1/sync/download-workdays
- **Request:** Query: `from_date`, `to_date`
- **Response:** `{ ok, workdays: [] }`

#### 4.3 GET /api/v1/sync/status
- **Request:** Без параметров
- **Response:** `{ ok, last_sync_at, pending_count }`

---

## 🔐 Безопасность

### JWT Токены
- **Access Token:** HS256, 15-30 минут, хранится в памяти
- **Refresh Token:** HS256, 7 дней, хранится в SecureStore (native) / localStorage (web)
- **Secret Key:** Из переменной окружения JWT_SECRET_KEY

### Пароли
- **Хеширование:** bcrypt (10 rounds)
- **Проверка:** bcryptjs при login

### Роли
```
user                  - обычный пользователь
unit_manager          - руководитель подразделения
department_manager    - руководитель отдела
admin                 - администратор системы
```

### Статусы пользователей
```
pending   - заявка на регистрацию
active    - активный пользователь
blocked   - заблокирован администратором
inactive  - неактивный (не использовал долго)
```

---

## 📊 Данные

### User
```typescript
{
  id: number;
  login: string;
  display_name: string | null;
  role: "user" | "unit_manager" | "department_manager" | "admin";
  status: "pending" | "active" | "blocked" | "inactive";
  org_unit_id: number;
  position_id: number;
  managed_org_unit_id: number | null;  // для руководителей
  created_at: string;
  updated_at: string;
}
```

### OrgUnit
```typescript
{
  id: number;
  name: string;
  short_name: string;
  type: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}
```

### Position
```typescript
{
  id: number;
  name: string;
  short_name: string;
  created_at: string;
  updated_at: string;
}
```

---

## ✅ Критерии завершения MVP

- [ ] Все 6 Auth endpoints реализованы и работают
- [ ] Все 2 Directory endpoints реализованы
- [ ] Все 8 Admin endpoints реализованы
- [ ] Все 3 Sync endpoints реализованы
- [ ] JWT токены работают корректно
- [ ] Роли и права доступа проверяются
- [ ] Клиент успешно логинится и получает токены
- [ ] Клиент успешно обновляет токены (refresh)
- [ ] Клиент успешно выходит (logout)
- [ ] TypeScript check проходит без ошибок
- [ ] Все endpoints задокументированы в Swagger/OpenAPI

---

## 📝 Примечания

1. **API Base URL:** Управляется через `lib/_core/api-config.ts`
2. **Hardcoded токены:** Удалены из кода (SECURITY)
3. **Endpoints:** Используют единый стандарт `/api/v1/...`
4. **Типы данных:** Определены в `shared/api-types.ts`
5. **Клиент:** Использует REST API вместо tRPC

---

## 🚀 Следующие шаги

1. Реализовать Фазу 1 (Auth endpoints)
2. Протестировать login/logout/refresh
3. Реализовать Фазы 2-4
4. Провести end-to-end тестирование
5. Подготовить к production

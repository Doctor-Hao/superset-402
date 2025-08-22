# Тестирование функционала внешних API колонок с редактированием

## Базовая конфигурация (только чтение)

```json
{
  "apiUrl": "https://jsonplaceholder.typicode.com/users/{id}",
  "idColumn": "user_id",
  "columns": [
    {
      "name": "user_name",
      "label": "User Name",
      "apiKey": "name",
      "defaultValue": "Unknown User"
    },
    {
      "name": "user_email",
      "label": "User Email", 
      "apiKey": "email",
      "defaultValue": "N/A"
    },
    {
      "name": "user_company",
      "label": "Company",
      "apiKey": "company.name",
      "defaultValue": "No Company"
    }
  ],
  "headers": {
    "Authorization": "Bearer your-token-here"
  },
  "timeout": 10000,
  "retryCount": 3
}
```

## Расширенная конфигурация с редактируемыми полями

```json
{
  "apiUrl": "https://api.example.com/users/{id}",
  "patchApiUrl": "https://api.example.com/users/{id}",
  "idColumn": "user_id",
  "patchMethod": "PATCH",
  "refreshAfterUpdate": true,
  "columns": [
    {
      "name": "user_name",
      "label": "Name",
      "apiKey": "name",
      "editable": true,
      "inputType": "text",
      "placeholder": "Enter user name",
      "validation": {
        "required": true,
        "minLength": 2,
        "maxLength": 50
      },
      "defaultValue": "Unknown User"
    },
    {
      "name": "user_email",
      "label": "Email",
      "apiKey": "email", 
      "editable": true,
      "inputType": "email",
      "placeholder": "user@example.com",
      "validation": {
        "required": true,
        "pattern": "^[^@]+@[^@]+\\.[^@]+$"
      },
      "defaultValue": "N/A"
    },
    {
      "name": "user_phone",
      "label": "Phone",
      "apiKey": "phone",
      "editable": true,
      "inputType": "text",
      "placeholder": "+1234567890",
      "validation": {
        "pattern": "^\\+?[1-9]\\d{1,14}$"
      },
      "defaultValue": ""
    },
    {
      "name": "user_status",
      "label": "Status",
      "apiKey": "status",
      "editable": false,
      "defaultValue": "Active"
    }
  ],
  "headers": {
    "Authorization": "Bearer your-api-token-here",
    "Content-Type": "application/json"
  },
  "timeout": 15000,
  "retryCount": 3
}
```

## Как использовать:

1. В Control Panel найдите аккордеон "External API Columns"
2. Вставьте одну из JSON конфигураций выше
3. Убедитесь что в вашем датасете есть колонка `user_id` с ID пользователей
4. Таблица автоматически добавит новые колонки с данными из API
5. Если поля настроены как `editable: true`, вы сможете кликать и редактировать их

## Функции редактирования:

- **Клик для редактирования**: Наведите на редактируемую ячейку и кликните по ней
- **Валидация в реальном времени**: Поля проверяются по правилам validation
- **Сохранение**: Enter для сохранения, Escape для отмены
- **Индикаторы загрузки**: Спиннер показывается во время PATCH запроса
- **Обработка ошибок**: Сообщения об ошибках отображаются под полем

## Поддерживаемые функции:

### Основные возможности:
- ✅ GET запросы для получения данных при загрузке таблицы
- ✅ PATCH/PUT/POST запросы для обновления отредактированных значений
- ✅ Автоматические retry запросы при ошибках
- ✅ Настройка timeout для запросов  
- ✅ Кастомные HTTP заголовки
- ✅ Fallback значения при ошибках API
- ✅ Поддержка вложенных ключей в API ответе (например "company.name")
- ✅ Индикатор загрузки во время получения/отправки данных
- ✅ Валидация JSON конфигурации

### Функции редактирования:
- ✅ Inline редактирование с поддержкой input типов (text, email, number)
- ✅ Клиентская валидация (required, minLength, maxLength, pattern)
- ✅ Визуальная обратная связь (hover эффекты, иконка редактирования)
- ✅ Индивидуальные индикаторы загрузки для каждой ячейки
- ✅ Обработка ошибок с отображением сообщений
- ✅ Автоматическое обновление данных после успешного PATCH

## Структуры API запросов:

### GET запрос (получение данных):
```
GET https://api.example.com/users/123
Authorization: Bearer your-token

Response:
{
  "id": 123,
  "name": "John Doe", 
  "email": "john@example.com",
  "phone": "+1234567890",
  "status": "Active"
}
```

### PATCH запрос (обновление поля):
```
PATCH https://api.example.com/users/123
Authorization: Bearer your-token
Content-Type: application/json

{
  "name": "John Smith"
}

Response: 200 OK
```

## Типы валидации:

- **required**: `true/false` - Поле обязательно для заполнения
- **minLength**: `number` - Минимальная длина текста
- **maxLength**: `number` - Максимальная длина текста  
- **pattern**: `string` - Регулярное выражение для проверки формата

## Типы input полей:

- **text**: Обычное текстовое поле
- **email**: Поле email с встроенной валидацией браузера
- **number**: Числовое поле

## Система уведомлений об ошибках

Если в конфигурации есть внешние колонки, над таблицей будет отображаться панель с уведомлениями об ошибках API:

### Типы ошибок:

- **⚠️ Load Error (красная)**: Ошибки при загрузке данных
  - 404: "Data not found for ID 123"
  - Общая ошибка загрузки: "Failed to load data for 5 records"

- **💾 Save Error (желтая)**: Ошибки при сохранении изменений
  - 404: "Record not found (ID: 123)"
  - 403: "Access denied for updating user_name"
  - Общая ошибка: "Failed to save user_email: Server error"

- **🌐 Network Error (красная)**: Сетевые ошибки
  - "Network error while loading data for ID 123"
  - "Network error while saving user_name"

- **✏️ Validation Error (синяя)**: Ошибки валидации
  - 400: "Invalid data format for user_email"
  - Клиентская валидация: ошибки отображаются под полем ввода

### Функции панели уведомлений:

- **Автоматическое группирование**: Множественные ошибки загрузки объединяются
- **Временные метки**: "5m ago", "30s ago"
- **Детализация**: Отображение ID записей, названий колонок
- **Индивидуальное закрытие**: Кнопка ✕ для каждой ошибки
- **Массовое закрытие**: Кнопка "Clear all" для всех уведомлений
- **Контекстная информация**: Column: user_name, ID: 123

Панель уведомлений отображается только когда:
1. В конфигурации есть хотя бы одна колонка (`columns.length > 0`)
2. Есть активные ошибки для отображения

Это помогает пользователям понимать, почему некоторые данные не загружаются или не сохраняются.
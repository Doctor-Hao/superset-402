# Тестирование функции перемещения колонок

## Тестовые сценарии

### 1. HeaderTreePivotChart с группами

**Входные данные:**
```json
// Header Tree JSON
{
  "groups": [
    {
      "title": "Группа А",
      "subgroups": [
        {
          "title": "Подгруппа 1",
          "segments": [
            { "title": "Сегмент 1", "count": 2 },
            { "title": "Сегмент 2", "count": 1 }
          ]
        },
        {
          "title": "Подгруппа 2", 
          "count": 2
        }
      ]
    },
    {
      "title": "Группа Б",
      "subgroups": [
        {
          "title": "Подгруппа 3",
          "count": 1
        }
      ]
    }
  ]
}

// Metrics: [metric1, metric2, metric3, metric4, metric5, metric6]
```

**Ожидаемые группы:**
- `Группа А|Подгруппа 1|Сегмент 1`: indices=[0,1], metrics=[metric1, metric2]
- `Группа А|Подгруппа 1|Сегмент 2`: indices=[2], metrics=[metric3]
- `Группа А|Подгруппа 2`: indices=[3,4], metrics=[metric4, metric5]
- `Группа Б|Подгруппа 3`: indices=[5], metrics=[metric6]

**Тесты валидации:**
- ✅ Разрешено: [[0,1]] - внутри Сегмент 1
- ✅ Разрешено: [[3,4]] - внутри Подгруппа 2
- ❌ Запрещено: [[0,3]] - между разными подгруппами
- ❌ Запрещено: [[1,5]] - между разными группами

### 2. Обычный PivotTable 

**Входные данные:**
```json
// Metrics: [sales, profit, cost, revenue]
// Columns Index Swaps: [[0,2],[1,3]]
```

**Ожидаемый результат:**
- Исходный порядок: [sales, profit, cost, revenue]
- После swaps: [cost, revenue, sales, profit]

### 3. Граничные случаи

**Пустые swaps:**
- Input: `[]`
- Expected: исходный порядок без изменений

**Невалидные индексы:**
- Input: `[[-1,0],[0,10]]`
- Expected: игнорировать невалидные swaps

**Некорректный JSON:**
- Input: `"invalid json"`
- Expected: fallback к пустому массиву

## Проверка в браузере

1. Откройте Developer Tools (F12)
2. Создайте pivot table с Header Tree JSON
3. Добавьте column swaps
4. Проверьте консольные сообщения:
   - `Column Groups Info` - показывает найденные группы
   - `Pivot build ▶ unpivot summary` - показывает результат
   - Предупреждения о невалидных swaps

## Ожидаемые сообщения в консоли

При валидных swaps:
```
Column Groups Info
  Группа А|Подгруппа 1|Сегмент 1: indices=[0,1] metrics=[metric1, metric2]
  ...
```

При невалидных swaps:
```
Invalid swaps detected: ["Cannot move metric from group X to group Y"]
```
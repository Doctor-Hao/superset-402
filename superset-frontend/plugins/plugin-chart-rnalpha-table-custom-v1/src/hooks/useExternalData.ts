// hooks/useExternalData.ts
import { useState } from 'react';

/**
 * Пример структуры columns_mapping (mapping):
 * [
 *   {
 *     "nameColumn": {
 *       "name": "Статус",
 *       "api_key": "status_api",
 *       "get_response": true
 *     }
 *   },
 *   {
 *     "nameColumn2": {
 *       "name": "Название",
 *       "api_key": "title_api"
 *     }
 *   },
 *   {
 *     "someOtherColumn": {
 *       "name": "Другая колонка",
 *       "api_key": "other_api",
 *       "get_response": true
 *     }
 *   }
 * ]
 * 
 * Если у "nameColumn" и "someOtherColumn" get_response = true,
 * то значения по этим колонкам (во всех строках tableData) будут отправляться как /val1/val2/val3
 */

export function useExternalData(endpoint: string, mapping: any[], tableData: any[]) {
    const [externalData, setExternalData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // ========== GET-логика ==========
    const handleLoadExternal = async () => {
        setIsLoading(true);

        // Проверяем, что хотя бы одна строка есть в tableData
        if (!tableData.length) {
            alert('Нет данных в таблице для формирования GET-запроса');
            setIsLoading(false);
            return;
        }

        // Массив значений, которые пойдут в урл
        const values: string[] = [];

        // Проходим по mapping
        mapping.forEach((mapItem: any) => {
            const originalColumn = Object.keys(mapItem)[0]; // например "nameColumn"
            const colConfig = mapItem[originalColumn];

            // Проверка на get_response: true
            if (colConfig.get_response) {
                // Берём только первую строку
                const cellValue = tableData[0][originalColumn];
                // Проверяем, что значение не пустое/undefined
                if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
                    values.push(String(cellValue));
                }
            }
        });

        // Формируем url: /endpoint/val1/val2/...
        const urlWithPath = values.length
            ? `${endpoint}/${values.join('/')}`
            : endpoint;

        console.log('GET urlWithPath:', urlWithPath);

        // Пример retry в 5 попыток
        const maxAttempts = 5;
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(urlWithPath, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (response.ok) {
                    const dataFromGet = await response.json();
                    setExternalData(dataFromGet);
                    console.log('✅ Внешние данные получены');
                    break; // прерываем цикл при успехе
                } else {
                    console.error('Ошибка при GET-запросе, статус:', response.status);
                }
            } catch (error) {
                console.error('Ошибка сети при GET-запросе:', error);
            }
            attempts++;
            if (attempts < maxAttempts) {
                console.log(`🔄 Повторная попытка GET-запроса через 2 секунды... (${attempts}/${maxAttempts})`);
                await new Promise(res => setTimeout(res, 2000));
            } else {
                console.error('❌ GET-запрос завершился неудачно после 5 попыток');
            }
        }

        setIsLoading(false);
    };


    // ========== PATCH-логика==========
    const handleSaveExternal = async () => {
        if (!externalData) {
            alert('Нет внешних данных для сохранения');
            return;
        }

        // Создаём копию
        const payload = { ...externalData };

        mapping.forEach((mapItem: any) => {
            const originalColumn = Object.keys(mapItem)[0];
            const colConfig = mapItem[originalColumn];

            if (colConfig.api_key && tableData.length > 0) {
                const cellValue = tableData[0][originalColumn];
                if (cellValue !== undefined) {
                    payload[colConfig.api_key] = cellValue;
                }
            }
        });

        console.log('PATCH payload:', payload);

        const maxAttempts = 5;
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(endpoint, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (response.ok) {
                    console.log('✅ Внешние данные успешно сохранены');
                    break;
                } else {
                    console.error('Ошибка при сохранении внешних данных, статус:', response.status);
                }
            } catch (error) {
                console.error('Ошибка сети при PATCH-запросе:', error);
            }
            attempts++;
            if (attempts < maxAttempts) {
                console.log(`🔄 Повторная попытка PATCH-запроса через 2 секунды... (${attempts}/${maxAttempts})`);
                await new Promise(res => setTimeout(res, 2000));
            } else {
                console.error('❌ PATCH-запрос завершился неудачно после 5 попыток');
            }
        }
    };

    return {
        externalData,
        setExternalData,
        isLoading,
        handleLoadExternal,
        handleSaveExternal,
    };
}

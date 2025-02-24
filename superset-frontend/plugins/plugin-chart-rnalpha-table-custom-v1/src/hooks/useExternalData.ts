// hooks/useExternalData.ts
import { useState } from 'react';

export function useExternalData(endpoint: string, mapping: any[], tableData: any[]) {
    const [externalData, setExternalData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Загрузка внешних данных (GET)
    const handleLoadExternal = async () => {
        setIsLoading(true);
        if (!tableData.length) {
            alert('Нет данных в таблице для формирования GET-запроса');
            setIsLoading(false);
            return;
        }

        let urlWithValue = endpoint;
        if (mapping.length > 0) {
            const firstMapping = mapping[0];
            const originalColumn = Object.keys(firstMapping)[0];
            if (tableData[0].hasOwnProperty(originalColumn)) {
                urlWithValue = `${endpoint}/${tableData[0][originalColumn]}`;
            }
        }

        // Пример retry в 5 попыток
        const maxAttempts = 5;
        let attempts = 0;
        while (attempts < maxAttempts) {
            try {
                const response = await fetch(urlWithValue, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (response.ok) {
                    const dataFromGet = await response.json();
                    setExternalData(dataFromGet);
                    console.log('✅ Внешние данные получены');
                    break;
                }
            } catch (error) {
                console.error('Ошибка сети при GET-запросе:', error);
            }
            attempts++;
            if (attempts < maxAttempts) {
                await new Promise(res => setTimeout(res, 2000));
            }
        }
        setIsLoading(false);
    };

    // Сохранение внешних данных (PATCH)
    const handleSaveExternal = async () => {
        if (!externalData) {
            alert('Нет внешних данных для сохранения');
            return;
        }
        // Включите здесь retry-логику, если нужно
        const payload = { ...externalData };

        // Добавить дополнительные поля (по вашему алгоритму)
        if (mapping.length > 0 && tableData.length > 0) {
            const firstMapping = mapping[0];
            const originalColumn = Object.keys(firstMapping)[0];
            const { api_key } = firstMapping[originalColumn];
            if (tableData[0].hasOwnProperty(originalColumn)) {
                payload[api_key] = tableData[0][originalColumn];
            }
        }

        try {
            const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (response.ok) {
                console.log('✅ Внешние данные сохранены');
            } else {
                console.error('Ошибка при сохранении внешних данных');
            }
        } catch (error) {
            console.error('Ошибка сети при PATCH-запросе:', error);
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

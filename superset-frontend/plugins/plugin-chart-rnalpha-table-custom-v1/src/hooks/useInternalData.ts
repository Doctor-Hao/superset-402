// hooks/useInternalData.ts
import { useState } from 'react';

export function useInternalData(endpoint: string) {
    const [isSaving, setIsSaving] = useState(false);

    // Сохранение «внутренних» данных (PATCH)
    const handleSave = async (tableData: any[], mapping: any[], sendAsArray: boolean) => {
        setIsSaving(true);
        const maxAttempts = 5;
        let attempts = 0;

        // Формируем payload
        const mappedData = tableData.map(row => {
            const mappedRow: { [key: string]: any } = {};
            mapping.forEach((item: any) => {
                const originalColumn = Object.keys(item)[0];
                const { api_key } = item[originalColumn];
                if (api_key && row[originalColumn] !== undefined) {
                    mappedRow[api_key] = row[originalColumn];
                }
            });
            return mappedRow;
        });
        const payload = sendAsArray ? mappedData : mappedData[0];

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(`${process.env.BACKEND_URL}${endpoint}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (response.ok) {
                    console.log('✅ Данные успешно сохранены!');
                    setIsSaving(false);
                    return;
                } else {
                    console.error('Ошибка при сохранении данных');
                }
            } catch (error) {
                console.error('Ошибка сети:', error);
            }
            attempts++;
            if (attempts < maxAttempts) {
                console.log(`🔄 Повторная попытка... (${attempts}/${maxAttempts})`);
                await new Promise(res => setTimeout(res, 2000));
            }
        }
        alert('❌ Данные не удалось сохранить');
        setIsSaving(false);
    };

    return {
        isSaving,
        handleSave,
    };
}

import { useMemo } from 'react';

export interface UseVariantIdResult {
    /** ID, если он единственный; иначе null */
    variantId: string | number | null;
    /** Сообщение пользователю, если id не определён однозначно */
    hint: string | null;
}

export function useProjectVariantIds(
    queriesData: { data?: Record<string, any>[] }[],
    field = '__variant_id',
): UseVariantIdResult {
    return useMemo(() => {
        // объединяем все строки из всех запросов
        const rows = queriesData.flatMap(q => q.data ?? []);

        // собираем все id и фильтруем null/undefined
        const ids = Array.from(
            new Set(rows.map(r => r[field]).filter(v => v !== null && v !== undefined)),
        );

        if (ids.length === 1) {
            return { variantId: ids[0], hint: null };
        }

        if (ids.length === 0) {
            return {
                variantId: null,
                hint: 'Не найдено ни одного __variant_id в данных графика.',
            };
        }

        // ids.length > 1
        return {
            variantId: null,
            hint: 'Выберите один вариант фильтром: в данных найдено несколько ID.',
        };
    }, [queriesData, field]);
}

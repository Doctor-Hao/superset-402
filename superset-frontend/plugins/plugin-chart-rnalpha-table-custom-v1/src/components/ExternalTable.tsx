// components/ExternalTable.tsx
import React, { useLayoutEffect, useRef } from 'react';
import { StyledTextArea } from '../styles';
import { autoResize } from '../utils/autosizeTextArea';
import { ColorCircle } from './ColorCircle';

interface ColumnConfig {
    name?: string;
    api_key?: string;
    column_color?: boolean;
}

interface ExternalTableProps {
    externalData: any;
    setExternalData: React.Dispatch<React.SetStateAction<any>>;
    /**
     * mappingDict формируется из JSON из «Сопоставление колонок для API».
     * Ключ — «оригинальное имя колонки» (как в таблице),
     * значение — объект с настройками (name, api_key, column_color ...)
     */
    mappingDict: Record<string, ColumnConfig>;
}

/**
 * Возвращает ColumnConfig для ключа externalData.
 * Поиск идёт по двум критериям:
 * 1. Совпадает с оригинальным названием столбца (ключ mappingDict)
 * 2. Совпадает с api_key из конфига
 */
function findConfigForColumn(col: string, mappingDict: Record<string, ColumnConfig>) {
    const lower = col.toLowerCase();
    return (
        Object.entries(mappingDict).find(
            ([orig, cfg]) =>
                orig.toLowerCase() === lower || (cfg.api_key && cfg.api_key.toLowerCase() === lower),
        )?.[1] || null
    );
}

/**
 * Обёртка над textarea с авто‑изменением высоты.
 * Принимает чистое строковое значение и callback(value).
 */
const CellTextarea: React.FC<{ value: string; onChange: (v: string) => void }> = ({
    value,
    onChange,
}) => {
    const ref = useRef<HTMLTextAreaElement>(null);

    // подгоняем высоту после монтирования и при каждом обновлении value
    useLayoutEffect(() => {
        if (ref.current) autoResize(ref.current);
    }, [value]);

    return (
        <StyledTextArea
            ref={ref}
            value={value}
            onChange={e => onChange(e.target.value)}
            onInput={e => autoResize(e.currentTarget)}
        />
    );
};


export const ExternalTable: React.FC<ExternalTableProps> = ({
    externalData,
    setExternalData,
    mappingDict,
}) => {
    if (!externalData) return null;

    // 1. Определяем динамические колонки — только те, что есть в mappingDict (по имени или api_key)
    const dynamicColumns = Object.keys(externalData).filter(col =>
        Boolean(findConfigForColumn(col, mappingDict)),
    );

    if (dynamicColumns.length === 0) {
        return <div>Нет данных для отображения</div>;
    }

    // 2. Максимальное количество строк среди всех колонок
    const rowCount = Math.max(
        ...dynamicColumns.map(col => (Array.isArray(externalData[col]) ? externalData[col].length : 1)),
    );

    const handleChange = (col: string, rowIndex: number, newVal: string) => {
        setExternalData(prev => {
            const updated: any = { ...prev };

            if (Array.isArray(updated[col])) {
                // Для массивов обновляем конкретный элемент
                const arr = [...updated[col]];
                arr[rowIndex] = newVal;
                updated[col] = arr;
            } else if (rowIndex === 0) {
                // Скаляр — меняем напрямую (только 1‑я строка)
                updated[col] = newVal;
            } else {
                // Если редактируется строка > 0, превращаем скаляр в массив, чтобы сохранить индекс
                const arr = Array(rowCount).fill('');
                arr[0] = updated[col] ?? '';
                arr[rowIndex] = newVal;
                updated[col] = arr;
            }

            return updated;
        });
    };

    return (
        <table>
            <thead>
                <tr>
                    {dynamicColumns.map(col => {
                        const cfg = findConfigForColumn(col, mappingDict);
                        return <th key={col}>{cfg?.name || col}</th>;
                    })}
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                        {dynamicColumns.map(col => {
                            const cfg = findConfigForColumn(col, mappingDict);
                            const isArray = Array.isArray(externalData[col]);
                            const cellValue = isArray
                                ? externalData[col][rowIndex] ?? ''
                                : rowIndex === 0
                                    ? externalData[col] ?? ''
                                    : '';
                            const isColorColumn = !!cfg?.column_color;

                            return (
                                <td key={`${col}-${rowIndex}`}>
                                    {isColorColumn ? (
                                        <ColorCircle
                                            color={typeof cellValue === 'string' ? cellValue : ''}
                                            onChange={(newColor: string) => handleChange(col, rowIndex, newColor)}
                                            size={30}
                                        />
                                    ) : (
                                        <CellTextarea
                                            value={cellValue}
                                            onChange={v => handleChange(col, rowIndex, v)}
                                        />
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
// components/ExternalTable.tsx
import React from 'react';
import { StyledTextArea } from '../styles';
import { autoResize } from '../utils/autosizeTextArea';

interface ExternalTableProps {
    externalData: any; // Тип можно уточнить
    mappingDict: Record<string, { name: string; api_key: string }>;
    setExternalData: React.Dispatch<React.SetStateAction<any>>;
}

export const ExternalTable: React.FC<ExternalTableProps> = ({
    externalData,
    mappingDict,
    setExternalData,
}) => {
    if (!externalData) return null;

    // Определяем динамические колонки — ключи, которые являются массивами
    const dynamicColumns = Object.keys(externalData).filter(key => Array.isArray(externalData[key]));
    if (dynamicColumns.length === 0) {
        return <div>Нет данных для отображения</div>;
    }

    // Определяем количество строк (максимум по всем массивам)
    const rowCount = Math.max(...dynamicColumns.map(col => externalData[col].length));

    // Рендерим таблицу
    return (
        <table>
            <thead>
                <tr>
                    {dynamicColumns.map(col => (
                        <th key={col}>
                            {mappingDict[col]?.name ? mappingDict[col].name : col}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: rowCount }).map((_, i) => (
                    <tr key={`external-row-${i}`}>
                        {dynamicColumns.map(col => (
                            <td key={`${col}-${i}`}>
                                <StyledTextArea
                                    value={externalData[col][i] || ''}
                                    onChange={e => {
                                        const newVal = e.target.value;
                                        const newExternalData = { ...externalData };
                                        newExternalData[col] = [...externalData[col]];
                                        newExternalData[col][i] = newVal;
                                        setExternalData(newExternalData);
                                    }}
                                    onInput={e => autoResize(e.target as HTMLTextAreaElement)}
                                />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

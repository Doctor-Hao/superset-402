// components/ExternalTable.tsx
import React from 'react';
import { StyledTextArea } from '../styles';
import { autoResize } from '../utils/autosizeTextArea';
import { ColorCircle } from './ColorCircle'; // <-- общий компонент

interface ExternalTableProps {
    externalData: any;
    setExternalData: React.Dispatch<React.SetStateAction<any>>;
    mappingDict: Record<string, { name?: string; api_key?: string; column_color?: boolean }>;
}

export const ExternalTable: React.FC<ExternalTableProps> = ({
    externalData,
    setExternalData,
    mappingDict,
}) => {
    if (!externalData) return null;

    // Ищем ключи, где значения — это массив
    const dynamicColumns = Object.keys(externalData).filter(key => Array.isArray(externalData[key]));
    if (dynamicColumns.length === 0) {
        return <div>Нет данных для отображения</div>;
    }

    const rowCount = Math.max(...dynamicColumns.map(col => externalData[col].length));

    // Обновление конкретной ячейки
    const handleChange = (col: string, rowIndex: number, newVal: string) => {
        const newExternal = { ...externalData };
        newExternal[col] = [...externalData[col]];
        newExternal[col][rowIndex] = newVal;
        setExternalData(newExternal);
    };

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
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                        {dynamicColumns.map(col => {
                            const cellValue = externalData[col][rowIndex] || '';
                            const isColorColumn = !!mappingDict[col]?.column_color;

                            return (
                                <td key={`${col}-${rowIndex}`}>
                                    {isColorColumn ? (
                                        <ColorCircle
                                            color={typeof cellValue === 'string' ? cellValue : ''}
                                            onChange={(newColor: string) => handleChange(col, rowIndex, newColor)}
                                            size={30}
                                        />
                                    ) : (
                                        <StyledTextArea
                                            value={cellValue}
                                            onChange={e => handleChange(col, rowIndex, e.target.value)}
                                            onInput={e => autoResize(e.target as HTMLTextAreaElement)}
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

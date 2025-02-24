// components/InternalTable.tsx
import React, { useRef, useLayoutEffect } from 'react';
import { StyledTextArea } from '../styles';
import { autoResize } from '../utils/autosizeTextArea';

interface DataRow {
    [key: string]: string | number | null;
}

interface Props {
    tableData: DataRow[];
    visibleColumns: string[];
    mappingDict: Record<string, { name: string; api_key: string }>;
    onInputChange: (rowIndex: number, columnKey: string, value: string) => void;
}

// Компонента для отрисовки таблицы
export const InternalTable: React.FC<Props> = ({
    tableData,
    visibleColumns,
    mappingDict,
    onInputChange,
}) => {
    const textAreaRefs = useRef<(HTMLTextAreaElement | null)[][]>([]);

    // Автовысота при монтировании/изменении tableData
    useLayoutEffect(() => {
        setTimeout(() => {
            textAreaRefs.current.forEach(row => {
                row.forEach(textarea => {
                    if (textarea) {
                        autoResize(textarea);
                    }
                });
            });
        }, 0);
    }, [tableData]);

    // Рендер шапки
    const renderHeaders = () => (
        <tr>
            {visibleColumns.map((column, index) => {
                const headerLabel = mappingDict[column]?.name || column;
                return <th key={`header-${index}`}>{headerLabel}</th>;
            })}
        </tr>
    );

    // Рендер строк
    const renderDataRows = () => {
        return tableData.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
                {visibleColumns.map((key, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`} style={{ padding: '4px' }}>
                        <StyledTextArea
                            ref={el => {
                                if (!textAreaRefs.current[rowIndex]) {
                                    textAreaRefs.current[rowIndex] = [];
                                }
                                textAreaRefs.current[rowIndex][cellIndex] = el;
                            }}
                            value={row[key] || ''}
                            onChange={e => onInputChange(rowIndex, key, e.target.value)}
                            onInput={e => autoResize(e.target as HTMLTextAreaElement)}
                        />
                    </td>
                ))}
            </tr>
        ));
    };

    return (
        <table>
            <thead>{renderHeaders()}</thead>
            <tbody>{renderDataRows()}</tbody>
        </table>
    );
};

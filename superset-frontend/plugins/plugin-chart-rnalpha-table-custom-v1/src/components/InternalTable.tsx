// components/InternalTable.tsx
import React, { useRef, useLayoutEffect } from 'react';
import { StyledTextArea } from '../styles';
import { autoResize } from '../utils/autosizeTextArea';
import { ColorCircle } from './ColorCircle';

interface DataRow {
    [key: string]: string | number | null;
}

interface Props {
    tableData: DataRow[];
    visibleColumns: string[];
    mappingDict: Record<string, { name?: string; api_key?: string; column_color?: boolean }>;
    onInputChange: (rowIndex: number, columnKey: string, value: string) => void;
}

export const InternalTable: React.FC<Props> = ({
    tableData,
    visibleColumns,
    mappingDict,
    onInputChange,
}) => {
    const textAreaRefs = useRef<(HTMLTextAreaElement | null)[][]>([]);

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

    const renderHeaders = () => (
        <tr>
            {visibleColumns.map((column, index) => {
                const headerLabel = mappingDict[column]?.name || column;
                return <th key={`header-${index}`}>{headerLabel}</th>;
            })}
        </tr>
    );

    const renderDataRows = () => {
        return tableData.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
                {visibleColumns.map((key, cellIndex) => {
                    const cellValue = row[key] || '';
                    const isColorColumn = !!mappingDict[key]?.column_color;

                    return (
                        <td key={`cell-${rowIndex}-${cellIndex}`} style={{ padding: '4px' }}>
                            {isColorColumn ? (
                                <ColorCircle
                                    color={typeof cellValue === 'string' ? cellValue : ''}
                                    onChange={(newColor: string) =>
                                        onInputChange(rowIndex, key, newColor)
                                    }
                                    size={30}
                                />
                            ) : (
                                <StyledTextArea
                                    ref={el => {
                                        if (!textAreaRefs.current[rowIndex]) {
                                            textAreaRefs.current[rowIndex] = [];
                                        }
                                        textAreaRefs.current[rowIndex][cellIndex] = el;
                                    }}
                                    value={String(cellValue)}
                                    onChange={e => onInputChange(rowIndex, key, e.target.value)}
                                    onInput={e => autoResize(e.target as HTMLTextAreaElement)}
                                />
                            )}
                        </td>
                    );
                })}
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

import React, { useCallback, useState, ChangeEvent } from 'react';
import { t } from '@superset-ui/core';

// Тип одного комментария
export type ChartCommentItem = {
    text: string;
    x: number;
    y: number;
};

type ChartCommentsTableControlProps = {
    // "value" — значение из formData
    // "onChange" — коллбэк, вызываем для обновления formData
    value?: ChartCommentItem[];
    onChange?: (value: ChartCommentItem[]) => void;
};

const defaultValue: ChartCommentItem[] = [];

export default function ChartCommentsTableControl(
    props: ChartCommentsTableControlProps,
) {
    const { value = defaultValue, onChange } = props;

    // Локальное состояние
    const [items, setItems] = useState<ChartCommentItem[]>(value);

    // Обновляем локальное состояние + сигналим Superset, что поле изменилось
    const updateItems = useCallback(
        (newItems: ChartCommentItem[]) => {
            setItems(newItems);
            onChange?.(newItems);
        },
        [onChange],
    );

    // Добавление новой строки
    const addRow = () => {
        const newItems = [...items, { text: '', x: 0, y: 0 }];
        updateItems(newItems);
    };

    // Удаление строки
    const removeRow = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        updateItems(newItems);
    };

    // Обработчики для полей "text", "x", "y"
    const handleTextChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], text: e.target.value };
        updateItems(newItems);
    };

    const handleXChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], x: Number(e.target.value) };
        updateItems(newItems);
    };

    const handleYChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], y: Number(e.target.value) };
        updateItems(newItems);
    };

    return (
        <div>
            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                }}
            >
                <thead>
                    <tr>
                        <th style={{ width: '40%' }}>{t('Text')}</th>
                        <th style={{ width: '20%' }}>{t('X (px)')}</th>
                        <th style={{ width: '20%' }}>{t('Y (px)')}</th>
                        <th style={{ width: '20%' }}>{t('Actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={`comment-${idx}`}>
                            <td>
                                <input
                                    type="text"
                                    value={item.text}
                                    onChange={e => handleTextChange(idx, e)}
                                    style={{ width: '100%' }}
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={item.x}
                                    onChange={e => handleXChange(idx, e)}
                                    style={{ width: '100%' }}
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={item.y}
                                    onChange={e => handleYChange(idx, e)}
                                    style={{ width: '100%' }}
                                />
                            </td>
                            <td>
                                <button type="button" onClick={() => removeRow(idx)}>
                                    {t('Remove')}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button type="button" onClick={addRow} style={{ marginTop: 8 }}>
                {t('Add comment')}
            </button>
        </div>
    );
}
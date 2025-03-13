import React, { useMemo } from 'react';
import { ControlButtons } from './ControlButtons';
import { StyledTextArea } from '../styles';

interface Risk2TableProps {
    data: any[];
    onChange: (newData: any[]) => void;
    onSave: () => void;
    isSaving: boolean;
}

const Risk2Table: React.FC<Risk2TableProps> = ({ data, onChange, onSave, isSaving }) => {
    // Группировка по стабильному ключу groupId
    function groupByDirection(items: any[]) {
        const groups: Record<string, { groupName: string; rows: any[] }> = {};
        items.forEach(item => {
            const key = item.groupId || 'default';
            if (!groups[key]) {
                groups[key] = { groupName: item.risk_direction || '', rows: [] };
            }
            groups[key].rows.push(item);
        });
        return groups;
    }
    function getGroupedArray(items: any[]) {
        const grouped = groupByDirection(items);
        return Object.entries(grouped).map(([groupId, data]) => ({
            groupId,
            groupName: data.groupName,
            rows: data.rows,
        }));
    }
    // Мемоизация группировки для стабильности ключей и сохранения фокуса
    const groupedArr = useMemo(() => getGroupedArray(data), [data]);

    // Функция обновления элемента по его id
    const updateItem = (rowId: string, fieldName: string, newValue: any) => {
        const newData = data.map(item =>
            item.id === rowId ? { ...item, [fieldName]: newValue } : item
        );
        onChange(newData);
    };

    // Компоненты ячеек
    const InputCell = ({
        rowId,
        value,
        fieldName,
        style,
    }: {
        rowId: string;
        value: string | number;
        fieldName: string;
        style?: React.CSSProperties;
    }) => {
        const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            updateItem(rowId, fieldName, e.target.value);
        };
        return (
            <td style={style}>
                <input style={{ width: '90%' }} value={value ?? ''} onChange={onChange} />
            </td>
        );
    };

    const TextareaCell = ({
        rowId,
        value,
        fieldName,
        style,
    }: {
        rowId: string;
        value: string;
        fieldName: string;
        style?: React.CSSProperties;
    }) => {
        const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            updateItem(rowId, fieldName, e.target.value);
        };
        return (
            <td style={{ textAlign: 'left', ...style }}>
                <StyledTextArea value={value || ''} onChange={onChange} />
            </td>
        );
    };

    const ImpactsCell = ({
        rowId,
        value,
        style,
    }: {
        rowId: string;
        value: number;
        style?: React.CSSProperties;
    }) => {
        const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            updateItem(rowId, 'numericImpacts', parseInt(e.target.value, 10));
        };
        return (
            <td style={{ textAlign: 'center', ...style }}>
                <select value={value || 0} onChange={onChange}>
                    <option value={0}>-</option>
                    <option value={1}>1 (extremely_low)</option>
                    <option value={2}>2 (low)</option>
                    <option value={3}>3 (medium)</option>
                    <option value={4}>4 (hight)</option>
                    <option value={5}>5 (extremely_hight)</option>
                </select>
            </td>
        );
    };

    // Добавление новой группы (подраздела)
    const handleAddGroup = () => {
        const newId = `tmp_${Date.now()}_${Math.random()}`;
        const newDirection = `Новая группа ${Math.floor(Math.random() * 1000)}`;
        const newRow = {
            id: newId,
            groupId: newId, // новый stable ключ для группы
            risk_direction: newDirection,
            risk_num: '',
            risk_name: '',
            numericImpacts: 0,
            probability_percentage: 0,
            npv: '',
            deadline: '',
            red_flag: false,
        };
        onChange([...data, newRow]);
    };

    // Добавление новой строки внутри группы
    const handleAddRowInGroup = (groupId: string) => {
        const newId = `tmp_${Date.now()}_${Math.random()}`;
        const group = groupedArr.find(g => g.groupId === groupId);
        const groupName = group ? group.groupName : '';
        const newRow = {
            id: newId,
            groupId, // используем тот же groupId
            risk_direction: groupName,
            risk_num: '',
            risk_name: '',
            numericImpacts: 0,
            probability_percentage: 0,
            npv: '',
            deadline: '',
            red_flag: false,
        };
        onChange([...data, newRow]);
    };

    return (
        <div style={{ marginTop: '16px' }}>
            <ControlButtons
                isSaving={isSaving}
                onSave={onSave}
                onAddRow={handleAddGroup}
                addRowLabel="Добавить подраздел"
            />

            <table style={{ borderCollapse: 'collapse', width: '100%' }} border={1} cellPadding={4}>
                <thead>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                        {/* 2 ячейки слева, 4 ячейки под "Оценка риска", 1 ячейка Флаг */}
                        <th rowSpan={2} style={{ width: '60px', textAlign: 'center' }}>№</th>
                        <th rowSpan={2} style={{ textAlign: 'left' }}>Ключевые Риски 3 Уровня</th>
                        <th colSpan={4} style={{ textAlign: 'center' }}>Оценка риска</th>
                        <th rowSpan={2} style={{ width: '50px', textAlign: 'center' }}>Флаг</th>
                    </tr>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                        <th style={{ textAlign: 'center', width: '80px' }}>Воздействие</th>
                        <th style={{ textAlign: 'center', width: '80px' }}>Вероятность</th>
                        <th style={{ textAlign: 'center', width: '120px' }}>NPV</th>
                        <th style={{ textAlign: 'center', width: '80px' }}>Срок</th>
                    </tr>
                </thead>
                <tbody>
                    {groupedArr.map(group => (
                        <React.Fragment key={group.groupId}>
                            <tr style={{ backgroundColor: '#e0e0e0' }}>
                                <td colSpan={7} style={{ textAlign: 'left', fontWeight: 'bold' }}>
                                    <input
                                        style={{ fontWeight: 'bold', width: '40%' }}
                                        value={group.groupName}
                                        onChange={e => {
                                            const newVal = e.target.value;
                                            const newData = data.map(item =>
                                                item.groupId === group.groupId ? { ...item, risk_direction: newVal } : item
                                            );
                                            onChange(newData);
                                        }}
                                    />
                                    <button onClick={() => handleAddRowInGroup(group.groupId)} style={{ marginLeft: 20 }}>
                                        + Риск
                                    </button>
                                </td>
                            </tr>
                            {group.rows.map((row: any, index: number) => (
                                <tr key={row.id}>
                                    <InputCell
                                        rowId={row.id}
                                        fieldName="risk_num"
                                        value={row.risk_num}
                                        style={{ textAlign: 'left', width: 60 }}
                                    />
                                    <TextareaCell
                                        rowId={row.id}
                                        fieldName="risk_name"
                                        value={row.risk_name}
                                        style={{ width: '240px' }}
                                    />
                                    <ImpactsCell rowId={row.id} value={row.numericImpacts || 0} />
                                    <InputCell
                                        rowId={row.id}
                                        fieldName="probability_percentage"
                                        value={row.probability_percentage ?? ''}
                                        style={{ textAlign: 'center', width: 80 }}
                                    />
                                    <InputCell
                                        rowId={row.id}
                                        fieldName="npv"
                                        value={row.npv ?? ''}
                                        style={{ textAlign: 'center', width: 120 }}
                                    />
                                    <InputCell
                                        rowId={row.id}
                                        fieldName="deadline"
                                        value={row.deadline ?? ''}
                                        style={{ textAlign: 'center', width: 80 }}
                                    />
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={!!row.red_flag}
                                            onChange={e => updateItem(row.id, 'red_flag', e.target.checked)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Risk2Table;

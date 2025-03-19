import React, { useState } from 'react';
import { ControlButtons } from './ControlButtons';
import { StyledTextArea } from '../styles';

interface Risk {
    id: string;
    groupId: number;
    risk_num?: string;
    risk_direction?: string;
    risk_name?: string;
    risk_score?: { value: string };
    reduction_factors?: string;
    risk_description?: string;
    responsible_empl?: string;
    deadline?: string;
    red_flag?: boolean;
}

interface Risk2TableProps {
    data: Risk[];
    onChange: (newData: Risk[]) => void;
    onSave: () => void;
    isSaving: boolean;
}

const Risk2Table: React.FC<Risk2TableProps> = ({ data, onChange, onSave, isSaving }) => {
    const [isEditing, setIsEditing] = useState(false); // Режим редактирования

    // 🛠 Генерация `groupId` для `risk_direction`
    const generateGroupId = (() => {
        const map = new Map<string, number>();
        let counter = 1;
        return (risk_direction: string) => {
            if (!map.has(risk_direction)) {
                map.set(risk_direction, counter++);
            }
            return map.get(risk_direction)!;
        };
    })();

    // 🛠 Обогащаем данные (добавляем `groupId` и `id`, если их нет)
    const processedData = data.map((risk, index) => ({
        ...risk,
        groupId: risk.groupId ?? generateGroupId(risk.risk_direction),
        id: risk.id ?? `risk_${index}_${Date.now()}`,
        changes_in_risk: risk.changes_in_risk ?? { value: '' },
    }));

    // 🔄 Группировка данных
    const groupedData = processedData.reduce<Record<number, Risk[]>>((acc, risk) => {
        if (!acc[risk.groupId]) acc[risk.groupId] = [];
        acc[risk.groupId].push(risk);
        return acc;
    }, {});

    // 🔢 Пересчет `risk_num` и `groupId`
    const recalculateRiskNumbers = (newData: Risk[]) => {
        const uniqueGroups = [...new Set(newData.map(risk => risk.groupId))].sort((a, b) => a - b);
        const groupIdMap = new Map(uniqueGroups.map((id, index) => [id, index + 1]));

        return newData.map((risk, index, array) => {
            const newGroupId = groupIdMap.get(risk.groupId)!;
            const groupRisks = array.filter(r => r.groupId === risk.groupId);
            const riskIndex = groupRisks.findIndex(r => r.id === risk.id) + 1;
            return {
                ...risk,
                groupId: newGroupId,
                risk_num: `${newGroupId}.${riskIndex}`,
            };
        });
    };

    // 📝 Обновление данных
    const handleChange = (groupId: number | null, rowId: string | null, field: keyof Risk, value: any) => {
        onChange(processedData.map(risk =>
            rowId
                ? (risk.id === rowId ? { ...risk, [field]: typeof risk[field] === 'object' ? { value } : value } : risk)
                : (risk.groupId === groupId ? { ...risk, risk_direction: value } : risk)
        ));
    };

    // ➕ Добавление подраздела
    const handleAddGroup = () => {
        const newGroupId = Math.max(0, ...processedData.map(r => r.groupId)) + 1;
        const newRow: Risk = {
            id: `grp_${Date.now()}`,
            groupId: newGroupId,
            risk_direction: `Новый раздел ${newGroupId}`,
            risk_num: `${newGroupId}.1`,
            risk_name: '',
            risk_score: { value: '' },
            reduction_factors: '',
            risk_description: '',
            responsible_empl: '',
            deadline: '',
            red_flag: false,
        };
        onChange(recalculateRiskNumbers([...processedData, newRow]));
    };

    // ➕ Добавление риска в подраздел
    const handleAddRowInGroup = (groupId: number) => {
        const newId = `row_${Date.now()}`;
        const newRow: Risk = {
            id: newId,
            groupId,
            risk_direction: processedData.find(r => r.groupId === groupId)?.risk_direction || `Новый раздел`,
            risk_num: '',
            risk_name: '',
            risk_score: { value: '' },
            reduction_factors: '',
            risk_description: '',
            responsible_empl: '',
            deadline: '',
            red_flag: false,
        };
        onChange(recalculateRiskNumbers([...processedData, newRow]));
    };

    // 🗑 Удаление подраздела
    const handleDeleteGroup = (groupId: number) => {
        const filteredData = processedData.filter(risk => risk.groupId !== groupId);
        onChange(recalculateRiskNumbers(filteredData));
    };

    // 🗑 Удаление риска
    const handleDeleteRow = (id: string) => {
        const filteredData = processedData.filter(risk => risk.id !== id);
        onChange(recalculateRiskNumbers(filteredData));
    };

    return (
        <div style={{ marginTop: '16px' }}>
            {/* Кнопка входа в режим редактирования */}
            <button className="icon-button edit" onClick={() => setIsEditing(!isEditing)}>
                ✏️ {isEditing ? "Выход из редактирования" : "Редактировать"}
            </button>

            {isEditing && (
                <ControlButtons isSaving={isSaving} onSave={onSave} onAddRow={handleAddGroup} addRowLabel="Добавить подраздел" />
            )}

            <table style={{ borderCollapse: 'collapse', width: '100%' }} border={1} cellPadding={4}>
                <thead style={{ backgroundColor: '#f0f0f0' }}>
                    <th>№</th>
                    <th>Ключевые Риски 3 Уровня</th>
                    <th>Оценка¹</th>
                    <th>Детальное описание Риска (риск-факторы)</th>
                    <th>Мероприятие уровня Общества</th>
                    <th>Отв. в ОГ</th>
                    <th>Срок</th>
                    <th>Флаг</th>
                    {isEditing && <th>Удалить</th>}
                </thead>
                <tbody>
                    {Object.entries(groupedData).map(([groupId, risks]) => (
                        <React.Fragment key={groupId}>
                            <tr style={{ backgroundColor: '#d4d2d2' }}>
                                <td colSpan={isEditing ? 9 : 8}>
                                    <StyledTextArea
                                        style={{ fontWeight: 'bold' }}
                                        value={risks[0].risk_direction}
                                        onChange={e => handleChange(Number(groupId), null, 'risk_direction', e.target.value)}
                                    />
                                    {isEditing && (
                                        <div className="group-buttons">
                                            <button className="icon-button add" onClick={() => handleAddRowInGroup(Number(groupId))}>
                                                ➕ Добавить риск
                                            </button>
                                            <button className="icon-button delete" onClick={() => handleDeleteGroup(Number(groupId))}>
                                                🗑 Удалить подраздел
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>

                            {risks.map((row) => {

                                return (
                                    <tr key={row.id}>
                                        <td style={{ width: '40px' }}>{row.risk_num}</td>
                                        <td>
                                            <StyledTextArea
                                                value={row.risk_name || ''}
                                                onChange={e => handleChange(null, row.id, 'risk_name', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ width: '40px' }}>
                                            <select value={row.risk_score?.value || ''} onChange={e => handleChange(null, row.id, 'risk_score', e.target.value)}>
                                                <option value="empty"></option>
                                                <option value="new_risk">
                                                    ➕
                                                </option>
                                                <option value="excluded_risk">❌</option>
                                            </select>
                                        </td>
                                        <td style={{}}>
                                            <StyledTextArea
                                                value={row.reduction_factors || ''}
                                                onChange={e => handleChange(null, row.id, 'reduction_factors', e.target.value)}
                                            />
                                        </td>
                                        <td style={{}}>
                                            <StyledTextArea
                                                value={row.risk_description || ''}
                                                onChange={e => handleChange(null, row.id, 'risk_description', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ width: '80px' }}>
                                            <StyledTextArea
                                                value={row.responsible_empl || ''}
                                                onChange={e => handleChange(null, row.id, 'responsible_empl', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ width: '80px' }}>
                                            <input value={row.deadline || ''} onChange={e => handleChange(null, row.id, 'deadline', e.target.value)} />
                                        </td>
                                        <td onClick={() => handleChange(null, row.id, 'red_flag', !row.red_flag)} className="flag-cell">
                                            {row.red_flag ? '🚩' : ''}
                                        </td>

                                        {isEditing && (
                                            <td>
                                                <button className="icon-button delete-risk" onClick={() => handleDeleteRow(row.id)}>❌</button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Risk2Table;

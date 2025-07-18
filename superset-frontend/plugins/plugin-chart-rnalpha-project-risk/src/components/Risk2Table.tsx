import React, { useMemo, useState } from 'react';
import { ControlButtons } from './ControlButtons';
import { StyledTextArea } from '../styles';
import AutoResizeTextArea from './AutoResizeTextArea';

interface Risk {
    id: string;
    groupId: number;
    risk_direction: string;
    risk_num?: string;
    risk_name?: string;
    changes_in_risk?: { value: string };
    probability?: { value: string };
    probability_percentage?: number;
    impacts?: { value: string };
    npv?: string;
    deadline_days?: string;
    red_flag?: boolean;
}

interface Risk2TableProps {
    data: Risk[];
    onChange: (newData: Risk[]) => void;
    onSave: () => void;
    isSaving: boolean;
}

const impactStr2Num: Record<string, number> = {
    extremely_low: 1,
    low: 2,
    medium: 3,
    hight: 4,
    extremely_high: 5,
};

const impactNum2Str = Object.fromEntries(
    Object.entries(impactStr2Num).map(([k, v]) => [v, k]),
) as Record<number, keyof typeof impactStr2Num>;

const compareRiskNum = (a: Risk, b: Risk) => {
    // risk_num вида "1.3" → [1, 3]. Если поле пустое, ставим большие числа,
    // чтобы «непронумерованные» элементы упали в конец списка.
    const parse = (r: Risk) =>
        r.risk_num
            ? r.risk_num.split('.').map(Number).concat([0]) // «1.3» → [1,3,0]
            : [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0];

    const [gA, iA] = parse(a);
    const [gB, iB] = parse(b);
    return gA - gB || iA - iB;
};

const Risk2Table: React.FC<Risk2TableProps> = ({ data, onChange, onSave, isSaving }) => {
    const [isEditing, setIsEditing] = useState(false); // Режим редактирования

    // const sortedData = useMemo(() => [...data].sort(compareRiskNum), [data]);
    const sortedData = data;

    // 🛠 Генерация `groupId` для `risk_direction`
    const generateGroupId = (() => {
        const map = new Map<string, number>();
        let counter = 1;
        return (direction: string) => {
            if (!map.has(direction)) map.set(direction, counter++);
            return map.get(direction)!;
        };
    })();

    // 🛠 Обогащаем данные (добавляем `groupId` и `id`, если их нет)
    const processedData = useMemo(
        () =>
            sortedData.map((risk, index) => ({
                ...risk,
                groupId: risk.groupId ?? generateGroupId(risk.risk_direction),
                id: risk.id ?? `risk_${index}_${Date.now()}`,
                changes_in_risk: risk.changes_in_risk ?? { value: '' },
            })),
        [sortedData]
    );

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
            changes_in_risk: { value: '' },
            probability: { value: '' },
            impacts: { value: '' },
            npv: '',
            deadline_days: '',
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
            changes_in_risk: { value: '' },
            probability: { value: '' },
            impacts: { value: '' },
            npv: '',
            deadline_days: '',
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
                    <tr>
                        <th rowSpan={2}>№</th>
                        <th rowSpan={2} colSpan={2}>Ключевые Риски 3 Уровня</th>
                        <th colSpan={4}>Текущая оценка и влияние риска</th>
                        <th rowSpan={2}>Флаг</th>
                        {isEditing && <th rowSpan={2}>Удалить</th>}
                    </tr>
                    <tr>
                        <th>Воздействие</th>
                        <th>Вероятность</th>
                        <th>на NPV, млн.р.</th>
                        <th>на срок, дни</th>
                    </tr>
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
                                const isExcluded = row.changes_in_risk?.value === "excluded_risk";

                                return (
                                    <tr key={row.id}>
                                        <td style={{ width: '40px' }}>{row.risk_num}</td>
                                        <td>
                                            <AutoResizeTextArea
                                                value={row.risk_name || ''}
                                                onChange={e => handleChange(null, row.id, 'risk_name', e.target.value)}
                                                disabled={isExcluded}
                                            />
                                        </td>
                                        <td style={{ width: '60px' }}>
                                            <select value={row.changes_in_risk?.value || 'empty'} onChange={e => handleChange(null, row.id, 'changes_in_risk', e.target.value)}>
                                                <option value="empty"></option>
                                                <option value="new_risk">
                                                    ➕
                                                </option>
                                                <option value="excluded_risk">❌</option>
                                            </select>
                                        </td>

                                        {/* Если "Риск исключается", объединяем 5 колонок в одну */}
                                        {isExcluded ? (
                                            <td colSpan={5} style={{ textAlign: 'center' }}>
                                                Исключается по результатам проведенных мероприятий (риск не актуален)
                                            </td>
                                        ) : (
                                            <>
                                                <td style={{ width: '120px' }}>
                                                    <select
                                                        value={
                                                            impactStr2Num[row.impacts?.value ?? '']
                                                        }
                                                        onChange={e =>
                                                            handleChange(
                                                                null,
                                                                row.id,
                                                                'impacts',
                                                                impactNum2Str[Number(e.target.value)],  // ← 3 → «medium»
                                                            )
                                                        }
                                                    >
                                                        {[1, 2, 3, 4, 5].map(num => (
                                                            <option key={num} value={num}>{num}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td style={{ width: '120px' }}>
                                                    <select value={row.probability_percentage || ''} onChange={e => handleChange(null, row.id, 'probability_percentage', e.target.value)}>
                                                        {[...Array(101)].map((_, i) => <option key={i} value={i}>{i}%</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ width: '120px' }}>
                                                    <input value={row.npv || ''} onChange={e => handleChange(null, row.id, 'npv', e.target.value)} />
                                                </td>
                                                <td style={{ width: '120px' }}>
                                                    <input value={row.deadline_days || ''} onChange={e => handleChange(null, row.id, 'deadline_days', e.target.value)} />
                                                </td>
                                                <td onClick={() => handleChange(null, row.id, 'red_flag', !row.red_flag)} className="flag-cell">
                                                    {row.red_flag ? '🚩' : ''}
                                                </td>
                                            </>
                                        )}

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

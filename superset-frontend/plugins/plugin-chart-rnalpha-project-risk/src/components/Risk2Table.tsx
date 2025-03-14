import React from 'react';
import { ControlButtons } from './ControlButtons';
import { StyledTextArea } from '../styles';

interface Risk {
    id: string;
    groupId: number;
    risk_direction: string;
    risk_num?: string;
    risk_name?: string;
    probability?: { value: string };
    impacts?: { value: string };
    npv?: string;
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
    }));

    // 🔄 Группировка данных
    const groupedData = processedData.reduce<Record<number, Risk[]>>((acc, risk) => {
        if (!acc[risk.groupId]) acc[risk.groupId] = [];
        acc[risk.groupId].push(risk);
        return acc;
    }, {});

    // 🔢 Пересчет `risk_num` и `groupId`
    const recalculateRiskNumbers = (newData: Risk[]) => {
        // 🔄 Пересчитываем `groupId`, чтобы они шли подряд
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
            probability: { value: '' },
            impacts: { value: '' },
            npv: '',
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
            probability: { value: '' },
            impacts: { value: '' },
            npv: '',
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
            <ControlButtons isSaving={isSaving} onSave={onSave} onAddRow={handleAddGroup} addRowLabel="Добавить подраздел" />

            <table style={{ borderCollapse: 'collapse', width: '100%' }} border={1} cellPadding={4}>
                <thead style={{ backgroundColor: '#f0f0f0' }}>
                    <tr>
                        <th rowSpan={2}>№</th>
                        <th rowSpan={2}>Ключевые Риски 3 Уровня</th>
                        <th colSpan={4}>Текущая оценка и влияние риска</th>
                        <th rowSpan={2}>Флаг</th>
                        <th rowSpan={2}>Удалить</th>
                    </tr>
                    <tr>
                        <th>Воздействие</th>
                        <th>Вероятность</th>
                        <th>NPV</th>
                        <th>Срок</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(groupedData).map(([groupId, risks]) => (
                        <React.Fragment key={groupId}>
                            <tr style={{ backgroundColor: '#e0e0e0' }}>
                                <td colSpan={8}>
                                    <StyledTextArea
                                        value={risks[0].risk_direction}
                                        onChange={e => handleChange(Number(groupId), null, 'risk_direction', e.target.value)}
                                    />
                                    <button onClick={() => handleAddRowInGroup(Number(groupId))}>+ Риск</button>
                                    <button onClick={() => handleDeleteGroup(Number(groupId))} style={{ color: 'red' }}>Удалить подраздел</button>
                                </td>
                            </tr>

                            {risks.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.risk_num}</td>
                                    <td>
                                        <StyledTextArea
                                            value={row.risk_name || ''}
                                            onChange={e => handleChange(null, row.id, 'risk_name', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <select value={row.impacts?.value || ''} onChange={e => handleChange(null, row.id, 'impacts', e.target.value)}>
                                            {[1, 2, 3, 4, 5].map(num => <option key={num} value={num}>{num}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <select value={row.probability?.value || ''} onChange={e => handleChange(null, row.id, 'probability', e.target.value)}>
                                            {[...Array(101)].map((_, i) => <option key={i} value={i}>{i}%</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <input value={row.npv || ''} onChange={e => handleChange(null, row.id, 'npv', e.target.value)} />
                                    </td>
                                    <td>
                                        <input value={row.deadline || ''} onChange={e => handleChange(null, row.id, 'deadline', e.target.value)} />
                                    </td>
                                    <td onClick={() => handleChange(null, row.id, 'red_flag', !row.red_flag)} style={{ cursor: 'pointer' }}>
                                        {row.red_flag ? '🚩' : ''}
                                    </td>
                                    <td>
                                        <button onClick={() => handleDeleteRow(row.id)} style={{ color: 'red' }}>❌</button>
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

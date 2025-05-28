import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ControlButtons } from './ControlButtons';
import AutoResizeTextArea from './AutoResizeTextArea';
import RiskCell from './RiskCell';

const Risk5Table = ({ data, onChange, onSave, isSaving }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState([]);

    const generateEmptyAdditionalItem = () => ({
        id: uuidv4(),
        completed_events: '',
        rolling_events: '',
        new_events: '',
        changes_in_risk: { value: 'empty' },
        responsible_empl: '',
        deadline: '',
    });

    const normalizeAdditionalData = (data = []) => {
        const normalized = [...data];
        while (normalized.length < 3) {
            normalized.push(generateEmptyAdditionalItem());
        }
        return normalized;
    };


    useEffect(() => {
        // если и data, и editedData уже пустые — делать нечего
        if (data.length === 0 && editedData.length === 0) return;

        const initializedData = data.map((risk, index) => {
            const existingRiskId = risk.id || uuidv4();
            const existingGroupId = typeof risk.groupId !== 'undefined' ? risk.groupId : index + 1;

            return {
                ...risk,
                id: existingRiskId,
                groupId: existingGroupId,
                additional_data: normalizeAdditionalData(
                    (risk.additional_data || []).map(item => ({
                        ...item,
                        id: item.id || uuidv4(),
                    }))
                ),
            };
        });

        setEditedData(initializedData);
    }, [data]);


    useEffect(() => {
        onChange(editedData);
    }, [editedData]);


    // Функция для обновления состояния при изменении ячеек
    const handleChange = (riskId, field, value) => {
        const updatedData = editedData.map(risk =>
            risk.id === riskId ? { ...risk, [field]: value } : risk
        );
        setEditedData(updatedData);
    };

    // Функция для обновления additional_data
    const handleAdditionalDataChange = (riskId, additionalId, field, value) => {
        const updatedData = editedData.map(risk =>
            risk.id === riskId
                ? {
                    ...risk,
                    additional_data: risk.additional_data.map(item =>
                        item.id === additionalId ? { ...item, [field]: value } : item
                    ),
                }
                : risk
        );
        setEditedData(updatedData);
    };

    // Функция для добавления нового раздела
    const handleAddGroup = () => {
        const existingGroupIds = editedData.map(r => r.groupId ?? 0);
        const newGroupId = Math.max(0, ...existingGroupIds) + 1;
        const newGroup = {
            id: uuidv4(),
            groupId: newGroupId,
            risk_direction: `Новый раздел ${newGroupId}`,
            risk_num: `${newGroupId}.1`,
            risk_name: '',
            risk_score: { value: '' },
            reduction_factors: '',
            additional_data: [
                {
                    id: uuidv4(),
                    completed_events: '',
                    rolling_events: '',
                    new_events: '',
                    changes_in_risk: { value: 'empty' },
                    responsible_empl: '',
                    deadline: '',
                },
                {
                    id: uuidv4(),
                    completed_events: '',
                    rolling_events: '',
                    new_events: '',
                    changes_in_risk: { value: 'empty' },
                    responsible_empl: '',
                    deadline: '',
                },
                {
                    id: uuidv4(),
                    completed_events: '',
                    rolling_events: '',
                    new_events: '',
                    changes_in_risk: { value: 'empty' },
                    responsible_empl: '',
                    deadline: '',
                },
            ],
            red_flag: false,
        };
        const updatedData = [...editedData, newGroup];
        setEditedData(updatedData);
        onChange(updatedData);
    };

    // Функция для добавления риска в существующий раздел
    const handleAddRowInGroup = (groupId) => {
        const groupRisks = editedData.filter(risk => risk.groupId === groupId);
        const newRiskNum = `${groupId}.${groupRisks.length + 1}`;
        const newRisk = {
            id: uuidv4(),
            groupId,
            risk_direction: groupRisks[0]?.risk_direction || `Раздел ${groupId}`,
            risk_num: newRiskNum,
            risk_name: '',
            risk_score: { value: '' },
            reduction_factors: '',
            additional_data: [
                {
                    id: uuidv4(),
                    completed_events: '',
                    rolling_events: '',
                    new_events: '',
                    changes_in_risk: { value: 'empty' },
                    responsible_empl: '',
                    deadline: '',
                },
                {
                    id: uuidv4(),
                    completed_events: '',
                    rolling_events: '',
                    new_events: '',
                    changes_in_risk: { value: 'empty' },
                    responsible_empl: '',
                    deadline: '',
                },
                {
                    id: uuidv4(),
                    completed_events: '',
                    rolling_events: '',
                    new_events: '',
                    changes_in_risk: { value: 'empty' },
                    responsible_empl: '',
                    deadline: '',
                },
            ],
            red_flag: false,
        };
        const updatedData = [...editedData, newRisk];
        setEditedData(updatedData);
        onChange(updatedData);
    };

    // Функция для удаления раздела
    const handleDeleteGroup = (groupId) => {
        const updatedData = editedData.filter(risk => risk.groupId !== groupId);
        setEditedData(updatedData);
        onChange(updatedData);
    };

    // Функция для удаления строки риска
    const handleDeleteRow = (riskId) => {
        const updatedData = editedData.filter(risk => risk.id !== riskId);
        setEditedData(updatedData);
        onChange(updatedData);
    };

    // Группировка данных по groupId
    const groupedData = editedData.reduce((acc, risk) => {
        if (!acc[risk.groupId]) {
            acc[risk.groupId] = [];
        }
        acc[risk.groupId].push(risk);
        console.log("groupedData", acc)
        return acc;
    }, {});

    const handleSave = () => {
        const formatted = editedData.map(risk => ({
            ...risk,
            additional_data: risk.additional_data.map(({ id, ...rest }) => ({
                ...rest,
                changes_in_risk: rest.changes_in_risk.value, // Если сервер ожидает string, а не { value }
            })),
            risk_score: risk.risk_score?.value, // Если сервер ожидает string
        }));

        onSave(formatted); // Или отправка через fetch
    };

    return (
        <div style={{ marginTop: '16px' }}>
            <button className="icon-button edit" onClick={() => setIsEditing(!isEditing)}>
                ✏️ {isEditing ? "Выход из редактирования" : "Редактировать"}
            </button>

            {isEditing && (
                <ControlButtons isSaving={isSaving} onSave={handleSave} onAddRow={handleAddGroup} addRowLabel="Добавить подраздел" />
            )}

            <table
                style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    border: '1px solid #ccc', // Общая рамка
                }}
                cellPadding={4}
            >
                <thead style={{ backgroundColor: '#f0f0f0' }}>
                    <tr>
                        <th>№</th>
                        <th>Ключевые Риски 3 Уровня</th>
                        <th>Оценка¹ риска</th>
                        <th>Детальное описание Риска (риск-факторы)</th>
                        <th>События</th>
                        <th></th>
                        <th>Отв. в ОГ</th>
                        <th>Срок</th>
                        <th>Флаг</th>
                        {isEditing && <th>Удалить</th>}
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(groupedData).map(([groupId, risks]) => (
                        <React.Fragment key={groupId}>
                            <tr style={{ backgroundColor: '#d4d2d2' }}>
                                <td colSpan={isEditing ? 10 : 9}>
                                    <AutoResizeTextArea
                                        style={{ fontWeight: 'bold' }}
                                        value={risks[0].risk_direction}
                                        onChange={e => handleChange(risks[0].id, 'risk_direction', e.target.value)}
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
                                    <tr key={row.id} style={{ width: '50px', height: '100%' }}>
                                        <td style={{ width: '30px', borderRight: '1px solid #ccc' }}>{row.risk_num}</td>
                                        <td style={{ width: '250px', borderRight: '1px solid #ccc' }}>
                                            <AutoResizeTextArea
                                                value={row.risk_name}
                                                onChange={(e) => handleChange(row.id, 'risk_name', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ width: '60px', borderRight: '1px solid #ccc' }}>
                                            {/* Если "Риск исключается" */}
                                            {!isExcluded ? (
                                                <RiskCell
                                                    value={row.risk_score?.value}
                                                    onChange={(val) => handleChange(row.id, 'risk_score', { value: val })}
                                                />
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: '18px' }}>❌</span>
                                                </>
                                            )}
                                        </td>
                                        <td style={{ width: '300px', borderRight: '1px solid #ccc' }}>
                                            <AutoResizeTextArea
                                                value={row.reduction_factors}
                                                onChange={(e) => handleChange(row.id, 'reduction_factors', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ borderRight: '1px solid #ccc' }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between',
                                                    height: '100%',
                                                }}
                                            >
                                                <div style={{ textAlign: 'left' }}>
                                                    <b>Выполненные:</b>
                                                    <AutoResizeTextArea
                                                        value={row.additional_data[0]?.completed_events || ""}
                                                        onChange={(e) =>
                                                            handleAdditionalDataChange(row.id, row.additional_data[0]?.id, "completed_events", e.target.value)
                                                        }
                                                    />
                                                </div>
                                                <div style={{ textAlign: 'left' }}>
                                                    <b>Переходящие:</b>
                                                    <AutoResizeTextArea
                                                        value={row.additional_data[1]?.rolling_events || ""}
                                                        onChange={(e) =>
                                                            handleAdditionalDataChange(row.id, row.additional_data[1]?.id, "rolling_events", e.target.value)
                                                        }
                                                    />
                                                </div>
                                                <div style={{ textAlign: 'left' }}>
                                                    <b>Новые:</b>
                                                    <AutoResizeTextArea
                                                        value={row.additional_data[2]?.new_events || ""}
                                                        onChange={(e) =>
                                                            handleAdditionalDataChange(row.id, row.additional_data[2]?.id, "new_events", e.target.value)
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ width: '60px', borderRight: '1px solid #ccc' }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between',
                                                    height: '100%',
                                                }}
                                            >
                                                {row.additional_data.map((item, idx) => (
                                                    <div
                                                        key={item.id}
                                                    >
                                                        <select
                                                            value={item.changes_in_risk.value}
                                                            onChange={(e) =>
                                                                handleAdditionalDataChange(row.id, item.id, 'changes_in_risk', {
                                                                    value: e.target.value,
                                                                })
                                                            }
                                                        >
                                                            <option value="empty"></option>
                                                            <option value="new_risk">➕</option>
                                                            <option value="excluded_risk">❌</option>
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>

                                        <td style={{ maxWidth: '150px', borderRight: '1px solid #ccc' }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between',
                                                    height: '100%',
                                                }}
                                            >
                                                {row.additional_data.map(item => (
                                                    <AutoResizeTextArea
                                                        key={item.id}
                                                        value={item.responsible_empl}
                                                        onChange={(e) => handleAdditionalDataChange(row.id, item.id, 'responsible_empl', e.target.value)}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ maxWidth: '160px', borderRight: '1px solid #ccc' }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between',
                                                    height: '100%',
                                                }}
                                            >
                                                {row.additional_data.map(item => (
                                                    <input
                                                        key={item.id}
                                                        type="text"
                                                        value={item.deadline}
                                                        onChange={(e) => handleAdditionalDataChange(row.id, item.id, 'deadline', e.target.value)}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                        <td
                                            onClick={() => handleChange(row.id, 'red_flag', !row.red_flag)}
                                            className="flag-cell"
                                        >
                                            {row.red_flag ? '🚩' : ''}
                                        </td>
                                        {isEditing && (
                                            <td>
                                                <button className="icon-button delete-risk" onClick={() => handleDeleteRow(row.id)}>❌</button>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div >
    );
};

export default Risk5Table;


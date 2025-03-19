import React, { useState } from 'react';
import { ControlButtons } from './ControlButtons';
import { StyledTextArea } from '../styles';
import RiskCell from './RiskCell';

interface Risk1TableProps {
    data: any[];
    onChange: (newData: any[]) => void;
    onSave: () => void;
    isSaving: boolean;
}

const Risk1Table: React.FC<Risk1TableProps> = ({ data, onChange, onSave, isSaving }) => {

    // ========== Добавление новой строки ==========
    const handleAddRow = () => {
        const emptyObj = {
            risk_description: '',
            reduction_factors: '',
            probability: { value: '' },
            impacts: { value: '' },
            manageability: { value: '' },
            risk_num: '',
            risk_direction: '',
            changes_in_risk: { value: '' },
            risk_score: { value: '' },
            responsible_empl: '',
            deadline: '',
            additional_data: []
        }
        onChange([...data, emptyObj]);
    };
    // ========== Обновление данных при редактировании ==========
    const handleChange = (rowIndex: number, field: string, value: string) => {
        onChange((prevData: any) =>
            prevData.map((row, index) =>
                index === rowIndex
                    ? { ...row, [field]: typeof row[field] === 'object' ? { value } : value }
                    : row
            )
        );
    };


    // Подстройка высоты textarea
    const autoResize = (textarea) => {
        textarea.style.height = 'auto'; // Сбрасываем высоту, чтобы правильно пересчитать
        textarea.style.height = `${textarea.scrollHeight}px`; // Устанавливаем высоту на основе содержимого
    };

    return (
        <div>
            <ControlButtons isSaving={isSaving} onSave={onSave} onAddRow={handleAddRow} />
            <div style={{ position: 'relative' }}>
                <table style={{ paddingBottom: '50px' }}>
                    <thead>
                        <tr>
                            <th>Риски</th>
                            <th>Описание</th>
                            <th>Факторы снижения риска</th>
                            <th>Вероятность</th>
                            <th>Масштаб действия</th>
                            <th>Управляемость</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                <td>Риск {rowIndex + 1}</td>
                                <td>
                                    <StyledTextArea
                                        value={(row as any).risk_description || ''}
                                        onChange={e => {
                                            handleChange(rowIndex, 'risk_description', e.target.value);
                                            autoResize(e.target as HTMLTextAreaElement);
                                        }}
                                        ref={textarea => textarea && autoResize(textarea)}
                                    />
                                </td>
                                <td>
                                    <StyledTextArea
                                        value={(row as any).reduction_factors || ''}
                                        onChange={e => {
                                            handleChange(rowIndex, 'reduction_factors', e.target.value);
                                            autoResize(e.target as HTMLTextAreaElement);
                                        }}
                                        ref={textarea => textarea && autoResize(textarea)}
                                    />
                                </td>
                                <RiskCell
                                    value={(row as any).probability?.value}
                                    onChange={(val) => handleChange(rowIndex, "probability", val)}
                                />
                                <RiskCell
                                    value={(row as any).impacts?.value}
                                    onChange={(val) => handleChange(rowIndex, "impacts", val)}
                                />
                                <RiskCell
                                    value={(row as any).manageability?.value}
                                    onChange={(val) => handleChange(rowIndex, "manageability", val)}
                                />
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div
                    style={{
                        position: 'relative',
                        bottom: '0',
                        width: '100%',
                        backgroundColor: '#ffffff',
                        padding: '10px',
                        textAlign: 'left',
                        borderTop: '1px solid #ccc',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <span
                            style={{
                                display: 'inline-block',
                                width: '25px',
                                height: '25px',
                                borderRadius: '50%',
                                backgroundColor: 'green',
                                boxShadow: '0px 4px 6px rgba(0,0,0,0.2)',
                                marginRight: '15px',
                            }}
                        />
                        <span>Низкая вероятность/незначительные последствия/хорошо управляемый</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <span
                            style={{
                                display: 'inline-block',
                                width: '25px',
                                height: '25px',
                                borderRadius: '50%',
                                backgroundColor: 'yellow',
                                boxShadow: '0px 4px 6px rgba(0,0,0,0.2)',
                                marginRight: '15px',
                            }}
                        />
                        <span>Средняя вероятность/средние последствия/средне управляемый</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <span
                            style={{
                                display: 'inline-block',
                                width: '25px',
                                height: '25px',
                                borderRadius: '50%',
                                backgroundColor: 'red',
                                boxShadow: '0px 4px 6px rgba(0,0,0,0.2)',
                                marginRight: '15px',
                            }}
                        />
                        <span>Высокая вероятность/значительные последствия/слабо управляемый</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Risk1Table;

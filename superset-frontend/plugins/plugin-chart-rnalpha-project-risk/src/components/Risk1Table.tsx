import React, { useState } from 'react';
import { ControlButtons } from './ControlButtons';
import { StyledTextArea } from '../styles';

interface Risk1TableProps {
    data: any[];
    onChange: (newData: any[]) => void;
    onSave: () => void;
    isSaving: boolean;
}

const colorMap = {
    extremely_low: 'green',
    low: 'green',
    medium: 'yellow',
    hight: 'red',
    extremely_hight: 'red',
};

const riskLabels = {
    extremely_low: 'Супер низкая',
    low: 'Низкая',
    medium: 'Средняя',
    hight: 'Высокая',
    extremely_hight: 'Очень высокая',
};


const RiskCell = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <td onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer', position: 'relative', textAlign: 'center', width: '100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span
                    style={{
                        display: 'inline-block',
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        backgroundColor: colorMap[value] || 'gray',
                        boxShadow: '0px 4px 6px rgba(0,0,0,0.2)'
                    }}
                ></span>
            </div>
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        background: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0px 2px 5px rgba(0,0,0,0.2)',
                        padding: '4px',
                        zIndex: 10,
                        width: '120px',
                        textAlign: 'center'
                    }}
                >
                    {Object.keys(colorMap).map((key) => (
                        <div
                            key={key}
                            onClick={() => {
                                onChange(key);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '6px',
                                cursor: 'pointer',
                                backgroundColor: key === value ? '#ddd' : 'white',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
                            onMouseLeave={(e) => (e.target.style.backgroundColor = key === value ? '#ddd' : 'white')}
                        >
                            {riskLabels[key]}
                        </div>
                    ))}
                </div>
            )}
        </td>
    );
};


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
                                    onChange={val => handleChange(rowIndex, 'probability', val)}
                                />
                                <RiskCell
                                    value={(row as any).impacts?.value}
                                    onChange={val => handleChange(rowIndex, 'impacts', val)}
                                />
                                <RiskCell
                                    value={(row as any).manageability?.value}
                                    onChange={val => handleChange(rowIndex, 'manageability', val)}
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

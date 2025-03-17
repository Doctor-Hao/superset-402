// components/ControlButtons.tsx
import React from 'react';

interface ControlButtonsProps {
    isSaving: boolean;
    addRowLabel?: string;
    onSave: () => void;
    onAddRow?: () => void; // Может быть опциональным
}

export const ControlButtons: React.FC<ControlButtonsProps> = ({
    isSaving,
    addRowLabel = 'Добавить строку',
    onSave,
    onAddRow,
}) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button
                onClick={onSave}
                disabled={isSaving}
                style={{
                    padding: '4px 8px',
                    backgroundColor: isSaving ? '#aaa' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
            >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
            {onAddRow && (
                <button
                    onClick={onAddRow}
                    disabled={isSaving}
                    style={{
                        padding: '4px 8px',
                        backgroundColor: isSaving ? '#aaa' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        marginLeft: '8px',
                    }}
                >
                    {addRowLabel}
                </button>
            )}
        </div>
    );
};

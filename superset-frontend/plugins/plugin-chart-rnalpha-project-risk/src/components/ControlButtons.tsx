import React, { useState } from 'react';
import Toast from './Toast';

interface ControlButtonsProps {
    isSaving: boolean;
    addRowLabel?: string;
    onSave: () => void;
    onAddRow?: () => void;
}

export const ControlButtons: React.FC<ControlButtonsProps> = ({
    isSaving,
    addRowLabel = 'Добавить строку',
    onSave,
    onAddRow,
}) => {
    const [toast, setToast] = useState<string | null>(null);

    const handleSave = () => {
        onSave();
    };

    const handleAdd = () => {
        onAddRow?.();
        setToast('➕ Добавлена новая строка');
    };

    return (
        <>
            {toast && <Toast message={toast} onClose={() => setToast(null)} />}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button
                    onClick={handleSave}
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
                        onClick={handleAdd}
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
        </>
    );
};

// components/ColorCircle.tsx
import React, { useState } from 'react';

// Опорное отображение «название цвета» -> «CSS-цвет»
const colorMap: Record<string, string> = {
    green: 'green',
    yellow: 'yellow',
    red: 'red',
};

// Набор доступных цветов для выбора в выпадающем списке
const colorOptions = ['green', 'yellow', 'red'];

interface ColorCircleProps {
    /** Текущее значение цвета (например, "green") */
    color: string;
    /** Коллбэк, который вызывается при выборе нового цвета */
    onChange: (newColor: string) => void;
    /** Размер круга в пикселях (по желанию) */
    size?: number;
}

export const ColorCircle: React.FC<ColorCircleProps> = ({
    color,
    onChange,
    size = 30, // по умолчанию 30px
}) => {
    const [isOpen, setIsOpen] = useState(false);

    // Проверяем, есть ли наш цвет в словаре; если нет — используем "gray"
    const realColor = colorMap[color.toLowerCase()] || 'gray';

    // Клик по самому шару (переключаем выпадашку)
    const handleCircleClick = () => {
        setIsOpen(!isOpen);
    };

    // Клик по варианту цвета в выпадашке
    const handleColorSelect = (selectedColor: string) => {
        onChange(selectedColor); // сообщаем «родителю» о выборе нового цвета
        setIsOpen(false);        // закрываем меню
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Сам круг */}
            <div
                onClick={handleCircleClick}
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    background: realColor,
                    cursor: 'pointer',
                    boxShadow: `
            inset 0 0 8px rgba(255,255,255,0.4),
            0 3px 6px rgba(0,0,0,0.5)
          `,
                }}
            />

            {/* Если isOpen = true, показываем меню */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: size + 5, // чуть ниже круга
                        left: 0,
                        background: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        zIndex: 999,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                        minWidth: '80px',
                        padding: '4px 0',
                    }}
                >
                    {colorOptions.map(option => (
                        <div
                            key={option}
                            onClick={() => handleColorSelect(option)}
                            style={{
                                padding: '4px 8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                // Небольшая подсветка при hover
                                // (В inline-стилях через :hover нельзя, так что укажем conditional)
                            }}
                            onMouseOver={e => (e.currentTarget.style.background = '#f0f0f0')}
                            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            {/* Мини-обозначение цвета в меню */}
                            <div
                                style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    background: colorMap[option],
                                }}
                            />
                            <span>{option}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

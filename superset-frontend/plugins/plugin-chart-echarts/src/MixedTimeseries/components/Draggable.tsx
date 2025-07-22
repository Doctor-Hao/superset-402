import React, { useEffect, useRef, useState } from 'react';

export interface DraggableProps {
    defaultPosition?: { x: number; y: number };
    onStop?: (e: PointerEvent, data: { x: number; y: number }) => void;
    children: React.ReactNode;
}

const Draggable: React.FC<DraggableProps> = ({
    defaultPosition = { x: 0, y: 0 },
    onStop,
    children,
}) => {
    const nodeRef = useRef<HTMLDivElement>(null);

    /** источник истины для координат (актуален даже внутри старых колбеков) */
    const posRef = useRef<{ x: number; y: number }>(defaultPosition);
    const [, forceRerender] = useState({}); // для обновления inline-стилей
    const offset = useRef({ dx: 0, dy: 0 });

    /* ---------- pointer handlers ---------- */
    const handlePointerDown = (e: React.PointerEvent) => {
        offset.current = {
            dx: e.clientX - posRef.current.x,
            dy: e.clientY - posRef.current.y,
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        document.body.style.userSelect = 'none';
    };

    const handlePointerMove = (e: PointerEvent) => {
        posRef.current = {
            x: e.clientX - offset.current.dx,
            y: e.clientY - offset.current.dy,
        };
        forceRerender({}); // заставляем React перерисовать координаты
    };

    const handlePointerUp = (e: PointerEvent) => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        document.body.style.userSelect = '';
        onStop?.(e, { ...posRef.current });       // ← всегда актуальные x/y
    };

    /* ---------- cleanup ---------- */
    useEffect(
        () => () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            document.body.style.userSelect = '';
        },
        [],
    );

    return (
        <div
            ref={nodeRef}
            style={{
                position: 'absolute',
                left: posRef.current.x,
                top: posRef.current.y,
                touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
        >
            {children}
        </div>
    );
};

export default Draggable;
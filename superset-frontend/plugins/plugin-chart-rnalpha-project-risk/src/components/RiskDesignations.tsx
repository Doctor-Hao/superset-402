import React from 'react';

const RiskLegend: React.FC = () => {
    return (
        <div style={{ display: 'flex', gap: '5%', marginTop: '20px' }}>
            {/* Левая часть: Оценка риска */}
            <div style={{ maxWidth: '500px', display: 'flex', alignItems: 'center' }}>
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                    (1) Консолидированная оценка риска (воздействие и вероятность) в зависимости от расположения рисков на карте ЭП РиД
                </p>
                <p style={{ fontSize: '14px', margin: '0 10px 0 10px' }}>
                    ={'>'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid black', width: '500px' }}>
                    <div style={{ backgroundColor: '#fb0200', padding: '4px', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>Крайне высокий</div>
                    <div style={{ backgroundColor: '#e26b03', padding: '4px', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>Высокий</div>
                    <div style={{ backgroundColor: '#febf00', padding: '4px', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>Средний</div>
                    <div style={{ backgroundColor: '#00b34f', padding: '4px', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>Низкий</div>
                    <div style={{ backgroundColor: '#92cf4e', padding: '4px', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>Крайне низкий</div>
                </div>
            </div>

            {/* Центральная часть: Флаг */}
            <div style={{ maxWidth: '400px', textAlign: 'center', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '30px', marginRight: '10px' }}>🚩</span>
                <p style={{ marginBottom: '4px' }}>
                    Необходимо оперативное принятие мер <br />
                    (высокая вероятность / влияние на стоимость и сроки / сжатые сроки реагирования)
                </p>
            </div>

            {/* Правая часть: Значки */}
            <div style={{ maxWidth: '300px', textAlign: 'left', display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
                <p style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '20px', color: 'yellow', marginRight: '10px' }}>➕</span> Выявлен новый риск / <br /> новое мероприятие
                </p>
                <p style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '30px', color: 'gray', marginRight: '10px' }}>✖</span> Риск / мероприятие исключается
                </p>
            </div>
        </div>
    );
};

export default RiskLegend;

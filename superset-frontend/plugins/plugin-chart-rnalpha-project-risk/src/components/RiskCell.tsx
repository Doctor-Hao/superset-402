import React, { useState } from "react";

const colorMap = {
    extremely_low: "#92cf4e",
    low: "#00b34f",
    medium: "#febf00",
    hight: "#e26b03",
    extremely_high: "#fb0200",
};

const riskLabels = {
    extremely_low: "Крайне низкие",
    low: "Низкая",
    medium: "Средняя",
    hight: "Высокая",
    extremely_high: "Крайне высокий",
};

interface RiskCellProps {
    value: string
    onChange: (newValue: string) => void;
}

const RiskCell: React.FC<RiskCellProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: "pointer", position: "relative", textAlign: "center", width: "100px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <span
                    style={{
                        display: "inline-block",
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: colorMap[value] || "gray",
                        boxShadow: "0px 4px 6px rgba(0,0,0,0.2)",
                    }}
                ></span>
            </div>
            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        background: "white",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        boxShadow: "0px 2px 5px rgba(0,0,0,0.2)",
                        padding: "4px",
                        zIndex: 10,
                        width: "120px",
                        textAlign: "center",
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
                                padding: "6px",
                                cursor: "pointer",
                                backgroundColor: key === value ? "#ddd" : "white",
                                transition: "background-color 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = key === value ? "#ddd" : "white")}
                        >
                            {riskLabels[key]}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RiskCell;

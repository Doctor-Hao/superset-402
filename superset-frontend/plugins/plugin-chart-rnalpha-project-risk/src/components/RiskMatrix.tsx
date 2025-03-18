import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Risk {
    risk_num: string;
    probability_percentage: number;
    impacts: { value: string };
    changes_in_risk?: { value: string };
}

interface RiskMatrixProps {
    data: Risk[];
    width?: number;
    height?: number;
}

const impactLevels = [
    "Крайне\nнизкое\nот 1 до 2",
    "Низкое\nот 3 до 6",
    "Среднее\nот 7 до 10",
    "Высокое\nот 11 до 19",
    "Крайне\nвысокое\nот 20 до 25"
];
const probabilityLevels = ["Крайне низкая <10%", "Низкая >10%", "Средняя >25%", "Высокая >50%", "Крайне высокая >75%"];
const probabilityThresholds = [10, 25, 50, 75, 101];

const impactMap: Record<string, number> = {
    "extremely_low": 1,
    "low": 2,
    "medium": 3,
    "high": 4,
    "extremely_high": 5
};

const colors = [
    ["#c6e6a2", "#c6e6a2", "#00b050", "#00b050", "#00b050"], // Крайне низкое
    ["#c6e6a2", "#00b050", "#00b050", "#fed208", "#fed208"], // Низкое
    ["#00b050", "#00b050", "#fed208", "#f6882e", "#f6882e"], // Среднее
    ["#00b050", "#fed208", "#f6882e", "#f6882e", "#f00"], // Высокое
    ["#00b050", "#fed208", "#f6882e", "#f00", "#f00"]  // Крайне высокое
];
// #c6e6a2
// #00b050
// #fed208
// #f6882e
// #f00

const RiskMatrix: React.FC<RiskMatrixProps> = ({ data, width = 600, height = 400 }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!data || !svgRef.current) return;

        const margin = { top: 35, right: 40, bottom: 0, left: 120 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height * 0.8 - margin.top - margin.bottom;

        const cellWidth = (innerWidth / probabilityLevels.length); //  ширина
        const cellHeight = (innerHeight / impactLevels.length);   //  высота 

        const svg = d3.select(svgRef.current).html("")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);


        // Рисуем ячейки
        probabilityLevels.forEach((_, x) => {
            impactLevels.forEach((_, y) => {
                svg.append("rect")
                    .attr("x", x * cellWidth)
                    .attr("y", (impactLevels.length - y - 1) * cellHeight)
                    .attr("width", cellWidth)
                    .attr("height", cellHeight)
                    .attr("fill", colors[y][x]) // Цвет из нового массива
                    .attr("stroke", "#000");
            });
        });


        // Фильтруем риски с `changes_in_risk === "excluded_risk"`
        const filteredData = data.filter(risk => risk.changes_in_risk?.value !== "excluded_risk");

        // Группируем риски по ячейкам (ключ = "x_y")
        const groupedRisks: Record<string, string[]> = {};

        filteredData.forEach(risk => {
            const y = 5 - (impactMap[risk.impacts.value] || 3);
            const x = probabilityThresholds.findIndex(threshold => risk.probability_percentage < threshold);
            const key = `${x}_${y}`;

            if (!groupedRisks[key]) {
                groupedRisks[key] = [];
            }
            groupedRisks[key].push(risk.risk_num);
        });

        // Отображаем сгруппированные риски
        Object.entries(groupedRisks).forEach(([key, riskNums]) => {
            const [x, y] = key.split("_").map(Number);
            const cellX = x * cellWidth;
            const cellY = y * cellHeight;

            let radius;

            if (riskNums.length === 1) {
                // Один риск — круг занимает почти всю ячейку
                radius = Math.min(cellWidth, cellHeight) * 0.3;
            } else if (riskNums.length === 2) {
                // Два риска — два больших круга, не перекрывая друг друга
                radius = Math.min(cellWidth / 2.5, cellHeight / 1.5) * 0.45;
            } else {
                // Несколько рисков — рассчитываем размер в `grid layout`
                const maxColumns = Math.min(3, riskNums.length);
                const rows = Math.ceil(riskNums.length / maxColumns);
                radius = Math.min(cellWidth / (maxColumns + 1), cellHeight / (rows + 1)) * 0.4;
            }

            // Определяем количество колонок и строк для равномерного распределения
            const maxColumns = Math.min(3, riskNums.length);
            const rows = Math.ceil(riskNums.length / maxColumns);

            riskNums.forEach((risk, index) => {
                const col = index % maxColumns;
                const row = Math.floor(index / maxColumns);

                const posX = riskNums.length === 1
                    ? cellX + cellWidth / 2
                    : cellX + (col + 1) * (cellWidth / (maxColumns + 1));

                const posY = riskNums.length === 1
                    ? cellY + cellHeight / 2
                    : cellY + (row + 1) * (cellHeight / (rows + 1));

                // Рисуем круг
                svg.append("circle")
                    .attr("cx", posX)
                    .attr("cy", posY)
                    .attr("r", radius)
                    .attr("fill", "white")
                    .attr("stroke", "gray")
                    .attr("stroke-width", 2);

                // Добавляем текст в круг (увеличенный шрифт)
                svg.append("text")
                    .attr("x", posX)
                    .attr("y", posY)
                    .attr("text-anchor", "middle")
                    .attr("dy", "0.3em")
                    .attr("font-size", radius / 1.2)  // Увеличиваем шрифт
                    .attr("font-weight", "bold")
                    .attr("fill", "black")
                    .text(risk);
            });
        });

        // Подписи оси Y 
        impactLevels.forEach((label, i) => {
            const text = svg.append("text")
                .attr("x", -20) // Отступ от оси Y
                .attr("y", (impactLevels.length - i - 1.2) * cellHeight + cellHeight / 2) // Исправленный порядок
                .attr("text-anchor", "end")
                .attr("alignment-baseline", "middle")
                .attr("font-size", "12px");

            // Разбиваем текст по `\n`
            const words = label.split("\n");
            words.forEach((word, j) => {
                text.append("tspan")
                    .attr("x", -20)
                    .attr("dy", j === 0 ? 0 : "1.2em") // Смещение вниз
                    .text(word);
            });
        });



        // Подписи оси X
        probabilityLevels.forEach((label, i) => {
            const text = svg.append("text")
                .attr("x", i * cellWidth + cellWidth / 2)
                .attr("y", innerHeight + 20)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px");

            label.split(" ").forEach((word, j) => {
                text.append("tspan")
                    .attr("x", i * cellWidth + cellWidth / 2)
                    .attr("dy", j === 0 ? 0 : "1.2em")
                    .text(word);
            });
        });

        // Ось Y (стрелка вверх)
        svg.append("line")
            .attr("x1", 0)
            .attr("y1", innerHeight + 30)  // Переместили ближе к ячейкам
            .attr("x2", 0)
            .attr("y2", -25)  // Теперь заканчивается у верхней ячейки
            .attr("stroke", "black")
            .attr("stroke-width", 3)
            .attr("marker-end", "url(#arrow)");

        // Ось X (стрелка вправо)
        svg.append("line")
            .attr("x1", -30)
            .attr("y1", innerHeight + 0)  // Переместили ближе к ячейкам
            .attr("x2", innerWidth + 25)  // Теперь заканчивается у правой границы
            .attr("y2", innerHeight + 0)
            .attr("stroke", "black")
            .attr("stroke-width", 3)
            .attr("marker-end", "url(#arrow)");;


        // Определение стрелки
        svg.append("defs").append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 5)
            .attr("refY", 5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto-start-reverse")
            .append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 z")
            .attr("fill", "black");


        // Подпись "Воздействие, млн. руб"
        svg.append("text")
            .attr("x", ((-margin.left / 1.5)))
            .attr("y", (innerHeight / 2) - 60)
            .attr("text-anchor", "middle")
            .attr("font-size", "20px")
            .attr("font-weight", "bold")
            .attr("transform", `rotate(-90, -40, ${innerHeight / 2})`)
            .text("Воздействие, млн. руб");

        // Подпись "Вероятность, %"
        svg.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 70)
            .attr("text-anchor", "middle")
            .attr("font-size", "20px")
            .attr("font-weight", "bold")
            .text("Вероятность, %");

    }, [data, width, height]);

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default RiskMatrix;

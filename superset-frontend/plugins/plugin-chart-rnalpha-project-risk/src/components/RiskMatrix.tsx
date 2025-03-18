import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Risk {
    risk_num: string;
    probability_percentage: number;
    impacts: { value: string };
}

interface RiskMatrixProps {
    data: Risk[];
}

const impactMap: Record<string, number> = {
    "extremely_low": 1,
    "low": 2,
    "medium": 3,
    "high": 4,
    "extremely_high": 5
};


const impactLevels = ["Крайне низкое", "Низкое", "Среднее", "Высокое", "Крайне высокое"];
const probabilityLevels = ["Крайне низкая", "Низкая", "Средняя", "Высокая", "Крайне высокая"];
const probabilityThresholds = [10, 25, 50, 75, 101]; // Не включительно
const colors = ["#b2df8a", "#33a02c", "#ffff99", "#ff7f00", "#e31a1c"]; // Зеленый → Красный

const RiskMatrix: React.FC<RiskMatrixProps> = ({ data }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!data || !svgRef.current) return;

        const width = 500, height = 500;
        const margin = { top: 50, right: 50, bottom: 50, left: 100 };
        const cellSize = 80;

        const svg = d3.select(svgRef.current).html("")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Рисуем ячейки
        probabilityLevels.forEach((prob, x) => {
            impactLevels.forEach((imp, y) => {
                svg.append("rect")
                    .attr("x", x * cellSize)
                    .attr("y", (impactLevels.length - y - 1) * cellSize)
                    .attr("width", cellSize)
                    .attr("height", cellSize)
                    .attr("fill", colors[y])
                    .attr("stroke", "#000");
            });
        });

        const filteredData = data.filter(risk => risk.changes_in_risk?.value !== "excluded_risk");

        // Наносим риски
        filteredData.forEach(risk => {
            // Определяем строку (Y) по `impacts`
            const y = 5 - (impactMap[risk.impacts.value] || 3);

            // Определяем столбец (X) по `probability_percentage` (НЕ включительно)
            const x = probabilityThresholds.findIndex(threshold => risk.probability_percentage < threshold);

            svg.append("circle")
                .attr("cx", x * cellSize + cellSize / 2)
                .attr("cy", y * cellSize + cellSize / 2)
                .attr("r", 15)
                .attr("fill", "white")
                .attr("stroke", "blue")
                .attr("stroke-width", 2);

            svg.append("text")
                .attr("x", x * cellSize + cellSize / 2)
                .attr("y", y * cellSize + cellSize / 2)
                .attr("text-anchor", "middle")
                .attr("dy", "0.3em")
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .attr("fill", "black")
                .text(risk.risk_num);
        });


        // Оси
        svg.selectAll(".impact-label")
            .data(impactLevels)
            .enter()
            .append("text")
            .attr("x", -10)
            .attr("y", (_, i) => (4 - i) * cellSize + cellSize / 2)
            .attr("text-anchor", "end")
            .attr("alignment-baseline", "middle")
            .attr("font-size", "12px")
            .text(d => d);

        svg.selectAll(".probability-label")
            .data(probabilityLevels)
            .enter()
            .append("text")
            .attr("x", (_, i) => i * cellSize + cellSize / 2)
            .attr("y", height + 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text(d => d);

    }, [data]);

    return <svg ref={svgRef}></svg>;
};

export default RiskMatrix;

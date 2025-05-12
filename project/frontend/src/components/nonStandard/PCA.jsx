import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function PCA({
    data,
    width,
    height,
    margin = { top: 20, right: 30, bottom: 40, left: 40 },
    dotColor = "#4F46E5",
    dotHoverColor = "#818CF8",
    dotRadius = 5,
    dotOpacity = 0.7,
    transitionDuration = 800,
    title = "",
    xAxisLabel = "PC1",
    yAxisLabel = "PC2",
    showLabels = true,
    labelKey = "label",
    showArrows = true,
    featureData = []
}) {
    const svgRef = useRef();
    const containerRef = useRef();
    const [dimensions, setDimensions] = useState({ width: width || 400, height: height || 300 });

    // Update dimensions when container size changes
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || !entries[0]) return;

            const { width, height } = entries[0].contentRect;
            setDimensions({
                width: width,
                height: height
            });
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (!data || data.length === 0 || !dimensions.width || !dimensions.height) return;

        // Clear any existing SVG
        d3.select(svgRef.current).selectAll("*").remove();

        // Calculate dimensions
        const innerWidth = dimensions.width - margin.left - margin.right;
        const innerHeight = dimensions.height - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(svgRef.current)
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Calculate domains with padding
        const xMin = d3.min(data, d => d.pc1);
        const xMax = d3.max(data, d => d.pc1);
        const yMin = d3.min(data, d => d.pc2);
        const yMax = d3.max(data, d => d.pc2);

        // Add 10% padding to each side
        const xPadding = (xMax - xMin) * 0.1;
        const yPadding = (yMax - yMin) * 0.1;

        // X scale
        const x = d3.scaleLinear()
            .domain([xMin - xPadding, xMax + xPadding])
            .range([0, innerWidth]);

        // Y scale
        const y = d3.scaleLinear()
            .domain([yMin - yPadding, yMax + yPadding])
            .range([innerHeight, 0]);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).ticks(5))
            .call(g => g.select(".domain").attr("stroke-opacity", 0.5));

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y).ticks(5))
            .call(g => g.select(".domain").attr("stroke-opacity", 0.5));

        // Add subtle grid lines
        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisBottom(x)
                .tickSize(-innerHeight)
                .tickFormat("")
                .ticks(5)
            )
            .attr("transform", `translate(0,${innerHeight})`)
            .call(g => g.selectAll("line")
                .style("stroke", "#e0e0e0")
                .style("stroke-opacity", 0.3));

        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y)
                .tickSize(-innerWidth)
                .tickFormat("")
                .ticks(5)
            )
            .call(g => g.selectAll("line")
                .style("stroke", "#e0e0e0")
                .style("stroke-opacity", 0.3));

        // Add origin crosshair
        if (x(0) >= 0 && x(0) <= innerWidth && y(0) >= 0 && y(0) <= innerHeight) {
            // Vertical line through origin
            svg.append("line")
                .attr("x1", x(0))
                .attr("y1", 0)
                .attr("x2", x(0))
                .attr("y2", innerHeight)
                .style("stroke", "#aaa")
                .style("stroke-width", 1)
                .style("stroke-dasharray", "3,3");

            // Horizontal line through origin
            svg.append("line")
                .attr("x1", 0)
                .attr("y1", y(0))
                .attr("x2", innerWidth)
                .attr("y2", y(0))
                .style("stroke", "#aaa")
                .style("stroke-width", 1)
                .style("stroke-dasharray", "3,3");
        }

        // Add the title if provided
        if (title) {
            titleGroup.append("text")
                .attr("x", innerWidth / 2)
                .attr("y", -margin.top / 2)
                .attr("text-anchor", "middle")
                .attr("class", "visualization-title")
                .text(title);
        }

        // Add axis labels with new font classes
        if (xAxisLabel) {
            svg.append("text")
                .attr("transform", `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 5})`)
                .attr("text-anchor", "middle")
                .attr("class", "visualization-text")
                .text(xAxisLabel);
        }

        if (yAxisLabel) {
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -margin.left + 15)
                .attr("x", -(innerHeight / 2))
                .attr("dy", "1em")
                .attr("text-anchor", "middle")
                .attr("class", "visualization-text")
                .text(yAxisLabel);
        }

        // Create a color scale based on categories if they exist
        const categories = [...new Set(data.map(d => d.category).filter(Boolean))];

        const colorScale = d3.scaleOrdinal()
            .domain(categories)
            .range(d3.schemeCategory10);

        // Create a title group for title and/or legend
        const titleGroup = svg.append("g")
            .attr("class", "title-group");

        // Add legend if categories exist
        if (categories.length > 0) {
            const maxLegendItemWidth = 120;
            const totalLegendWidth = categories.length * maxLegendItemWidth;

            // Choose positioning strategy based on available space
            let legendX, legendY;

            if (totalLegendWidth > innerWidth * 0.6) {
                legendX = 10;
                legendY = -margin.top / 2 + (title ? 20 : 0);
            } else {
                if (title) {
                    const titleWidth = title.length * 10;
                    legendX = (innerWidth / 2) + (titleWidth / 2) + 20;
                } else {
                    legendX = innerWidth / 2 - (totalLegendWidth / 3);
                }
                legendY = -margin.top / 2;
            }

            const legendItemWidth = Math.min(maxLegendItemWidth,
                totalLegendWidth > innerWidth ? (innerWidth * 0.9) / categories.length : maxLegendItemWidth);

            // Create legend background
            titleGroup.append("rect")
                .attr("x", legendX - 10)
                .attr("y", legendY - 15)
                .attr("width", categories.length * legendItemWidth)
                .attr("height", 30)
                .attr("fill", "white")
                .attr("stroke", "#ccc")
                .attr("stroke-width", 1)
                .attr("rx", 4)
                .attr("opacity", 0.95);

            const legend = titleGroup.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${legendX}, ${legendY - 8})`);

            // Place legend items horizontally
            categories.forEach((category, i) => {
                const legendItem = legend.append("g")
                    .attr("transform", `translate(${i * legendItemWidth}, 0)`);

                legendItem.append("circle")
                    .attr("cx", 8)
                    .attr("cy", 10)
                    .attr("r", 6)
                    .attr("fill", colorScale(category))
                    .attr("stroke", "#000")
                    .attr("stroke-width", 0.5)
                    .attr("stroke-opacity", 0.3);

                legendItem.append("text")
                    .attr("x", 20)
                    .attr("y", 14)
                    .style("font-size", "12px")
                    .style("font-weight", "500")
                    .text(category);
            });
        }

        // Create tooltip
        const tooltip = d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "1px solid #ddd")
            .style("border-radius", "4px")
            .style("padding", "8px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("z-index", "1000")
            .style("transition", "opacity 0.2s");

        // Add data points with animation
        const points = svg.selectAll(".dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.pc1))
            .attr("cy", d => y(d.pc2))
            .attr("r", 0)
            .attr("fill", d => d.category ? colorScale(d.category) : dotColor)
            .style("opacity", dotOpacity)
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", dotRadius * 1.5)
                    .attr("fill", d.category ? d3.color(colorScale(d.category)).brighter(0.5) : dotHoverColor)
                    .style("opacity", 1);

                tooltip
                    .style("opacity", 0.9)
                    .html(`<strong>${d[labelKey] || ''}</strong><br/>
                           ${d.category ? `Category: ${d.category}<br/>` : ''}
                           PC1: ${d.pc1.toFixed(2)}<br/>
                           PC2: ${d.pc2.toFixed(2)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", dotRadius)
                    .attr("fill", d.category ? colorScale(d.category) : dotColor)
                    .style("opacity", dotOpacity);

                tooltip.style("opacity", 0);
            });

        // Animate points appearing
        points.transition()
            .delay((d, i) => i * (transitionDuration / data.length))
            .duration(300)
            .attr("r", dotRadius);

        // Update data labels with body font
        if (showLabels) {
            svg.selectAll(".label")
                .data(data)
                .enter()
                .append("text")
                .attr("class", "visualization-text label")
                .attr("x", d => x(d.pc1))
                .attr("y", d => y(d.pc2) - dotRadius - 5)
                .attr("text-anchor", "middle")
                .style("fill", "#555")
                .style("opacity", 0)
                .text(d => d[labelKey])
                .transition()
                .delay((d, i) => i * (transitionDuration / data.length) + 300)
                .duration(300)
                .style("opacity", 0.7);
        }

        // Draw feature vectors/arrows if enabled and data provided
        if (showArrows && featureData && featureData.length > 0) {
            // Find the maximum length of a feature vector to scale arrows properly
            const maxMagnitude = d3.max(featureData, d =>
                Math.sqrt(d.pc1 * d.pc1 + d.pc2 * d.pc2)
            );

            // Scale for arrow length - make them extend to about 40% of the plot area
            const arrowScale = Math.min(innerWidth, innerHeight) * 0.4 / maxMagnitude;

            // Draw arrows for features
            const arrows = svg.selectAll(".arrow")
                .data(featureData)
                .enter()
                .append("g")
                .attr("class", "arrow")
                .attr("transform", d => `translate(${x(0)}, ${y(0)})`);

            // Draw arrow line
            arrows.append("line")
                .attr("x2", d => d.pc1 * arrowScale)
                .attr("y2", d => -d.pc2 * arrowScale) // Negate because SVG y-axis is flipped
                .attr("stroke", "#FF5722")
                .attr("stroke-width", 1.5)
                .attr("opacity", 0)
                .transition()
                .delay(transitionDuration)
                .duration(300)
                .attr("opacity", 0.7);

            // Draw arrow head
            arrows.append("polygon")
                .attr("points", d => {
                    const endX = d.pc1 * arrowScale;
                    const endY = -d.pc2 * arrowScale;
                    const angle = Math.atan2(endY, endX);
                    const headSize = 6;

                    return [
                        [endX, endY],
                        [endX - headSize * Math.cos(angle - Math.PI / 6), endY - headSize * Math.sin(angle - Math.PI / 6)],
                        [endX - headSize * Math.cos(angle + Math.PI / 6), endY - headSize * Math.sin(angle + Math.PI / 6)]
                    ].map(p => p.join(",")).join(" ");
                })
                .attr("fill", "#FF5722")
                .attr("opacity", 0)
                .transition()
                .delay(transitionDuration)
                .duration(300)
                .attr("opacity", 0.7);

            // Add feature labels
            arrows.append("text")
                .attr("x", d => d.pc1 * arrowScale * 1.1)
                .attr("y", d => -d.pc2 * arrowScale * 1.1)
                .text(d => d.feature)
                .attr("text-anchor", d => d.pc1 >= 0 ? "start" : "end")
                .attr("dominant-baseline", d => d.pc2 >= 0 ? "text-after-edge" : "text-before-edge")
                .style("fill", "#FF5722")
                .style("font-size", "10px")
                .style("font-weight", "bold")
                .attr("opacity", 0)
                .transition()
                .delay(transitionDuration)
                .duration(300)
                .attr("opacity", 0.9);
        }

        // Cleanup on unmount
        return () => {
            tooltip.remove();
        };
    }, [data, dimensions, margin, dotColor, dotHoverColor, dotRadius, dotOpacity, transitionDuration, title, xAxisLabel, yAxisLabel, showLabels, labelKey, showArrows, featureData]);

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center">
            <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"></svg>
        </div>
    );
}
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';


// NEEDS FIXING
export default function MCA({
    data,
    width,
    height,
    margin = { top: 20, right: 30, bottom: 40, left: 40 },
    dotColor = "#4F46E5",
    dotHoverColor = "#818CF8",
    dotRadius = 5,
    dotOpacity = 0.7,
    variableOpacity = 0.8,
    transitionDuration = 800,
    title = "",
    xAxisLabel = "Dimension 1",
    yAxisLabel = "Dimension 2",
    showLabels = true,
    labelKey = "label",
    showVariables = true,
    variableData = []
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
        const xMin = d3.min([...data.map(d => d.dim1), ...variableData.map(d => d.dim1 || 0)]);
        const xMax = d3.max([...data.map(d => d.dim1), ...variableData.map(d => d.dim1 || 0)]);
        const yMin = d3.min([...data.map(d => d.dim2), ...variableData.map(d => d.dim2 || 0)]);
        const yMax = d3.max([...data.map(d => d.dim2), ...variableData.map(d => d.dim2 || 0)]);

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

        // X axis label
        if (xAxisLabel) {
            svg.append("text")
                .attr("transform", `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 12})`)
                .style("text-anchor", "middle")
                .style("font-size", "12px")
                .style("fill", "#a9b1d6")
                .text(xAxisLabel);
        }

        // Y axis label
        if (yAxisLabel) {
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -margin.left)
                .attr("x", -(innerHeight / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("font-size", "12px")
                .style("fill", "#a9b1d6")
                .text(yAxisLabel);
        }

        // Update axis text colors
        svg.selectAll(".tick text")
            .style("fill", "#787c99");

        // Create a color scale based on categories if they exist
        const categories = [...new Set(data.map(d => d.category).filter(Boolean))];

        // Borough color mapping for consistent visualization with softer colors on dark background
        const BOROUGH_COLORS = {
            'MANHATTAN': '#7AA2F7', // Soft blue from reference
            'BROOKLYN': '#E0AF68', // Warm yellow
            'QUEENS': '#BB9AF7', // Soft purple from reference
            'BRONX': '#F7768E', // Soft pink from reference
            'STATEN ISLAND': '#73DACA' // Cyan from reference
        };

        const colorScale = (category) => {
            if (category && BOROUGH_COLORS[category.toUpperCase()]) {
                return BOROUGH_COLORS[category.toUpperCase()];
            }
            return '#FF7B5C'; // Warm orange for non-borough categories
        };

        // Create a title group for title and/or legend
        const titleGroup = svg.append("g")
            .attr("class", "title-group");

        // Add the title if provided
        if (title) {
            titleGroup.append("text")
                .attr("x", innerWidth / 2)
                .attr("y", -margin.top / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .style("fill", "#a9b1d6")
                .text(title);
        }

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
                    .style("fill", "#a9b1d6")
                    .text(category);
            });
        }

        // Create tooltip
        const tooltip = d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("background-color", "#24283b")
            .style("border", "1px solid #2f334d")
            .style("border-radius", "4px")
            .style("padding", "8px")
            .style("font-size", "12px")
            .style("color", "#a9b1d6")
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
            .attr("cx", d => x(d.dim1))
            .attr("cy", d => y(d.dim2))
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
                           ${d.attributes ? 'Attributes: ' + d.attributes.join(', ') : ''}`)
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

        // Add labels if enabled
        if (showLabels) {
            svg.selectAll(".label")
                .data(data)
                .enter()
                .append("text")
                .attr("class", "label")
                .attr("x", d => x(d.dim1))
                .attr("y", d => y(d.dim2) - dotRadius - 5)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .style("fill", "#787c99")
                .style("opacity", 0)
                .text(d => d[labelKey])
                .transition()
                .delay((d, i) => i * (transitionDuration / data.length) + 300)
                .duration(300)
                .style("opacity", 0.7);
        }

        // Draw variable points if enabled
        if (showVariables && variableData && variableData.length > 0) {
            // Group categories by variable
            const variableGroups = variableData.reduce((acc, item) => {
                if (!acc[item.variable]) {
                    acc[item.variable] = [];
                }
                acc[item.variable].push(item);
                return acc;
            }, {});

            // Create a color scale for variables
            const variableColors = d3.scaleOrdinal()
                .domain(Object.keys(variableGroups))
                .range(d3.schemeSet2);

            // Draw variables with unique colors by group
            Object.entries(variableGroups).forEach(([variable, items]) => {
                // Add variable points
                const variablePoints = svg.selectAll(`.var-${variable.replace(/\s+/g, '-')}`)
                    .data(items)
                    .enter()
                    .append("circle")
                    .attr("class", d => `variable var-${variable.replace(/\s+/g, '-')}`)
                    .attr("cx", d => x(d.dim1))
                    .attr("cy", d => y(d.dim2))
                    .attr("r", 0)
                    .attr("fill", variableColors(variable))
                    .attr("stroke", "#000")
                    .attr("stroke-width", 1)
                    .attr("stroke-opacity", 0.5)
                    .style("opacity", variableOpacity)
                    .on("mouseover", function (event, d) {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr("r", dotRadius * 1.8)
                            .style("opacity", 1);

                        tooltip
                            .style("opacity", 0.9)
                            .html(`<strong>Variable:</strong> ${d.variable}<br/>
                                   <strong>Category:</strong> ${d.category}<br/>
                                   <strong>Coordinates:</strong> (${d.dim1.toFixed(2)}, ${d.dim2.toFixed(2)})`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr("r", dotRadius * 1.2)
                            .style("opacity", variableOpacity);

                        tooltip.style("opacity", 0);
                    });

                // Animate variable points
                variablePoints.transition()
                    .delay(transitionDuration + 200)
                    .duration(300)
                    .attr("r", dotRadius * 1.2);

                // Add variable labels
                svg.selectAll(`.varlabel-${variable.replace(/\s+/g, '-')}`)
                    .data(items)
                    .enter()
                    .append("text")
                    .attr("class", "variable-label")
                    .attr("x", d => x(d.dim1))
                    .attr("y", d => y(d.dim2) - dotRadius * 2 - 2)
                    .attr("text-anchor", "middle")
                    .style("font-size", "10px")
                    .style("font-weight", "bold")
                    .style("fill", d3.color(variableColors(variable)).darker(0.8))
                    .style("opacity", 0)
                    .style("fill", "#787c99")
                    .text(d => d.category)
                    .transition()
                    .delay(transitionDuration + 500)
                    .duration(300)
                    .style("opacity", 0.9);
            });

            // Add variable legend
            const variableNames = Object.keys(variableGroups);
            if (variableNames.length > 0) {
                const varLegendX = 10;
                const varLegendY = innerHeight + margin.bottom * 0.8; // Increased from 0.5 to 0.8 to move down

                // Calculate spacing based on available width
                const legendItemWidth = Math.min(100, (innerWidth - 20) / variableNames.length);

                const varLegend = svg.append("g")
                    .attr("class", "variable-legend")
                    .attr("transform", `translate(${varLegendX}, ${varLegendY})`);

                // Add background for better visibility
                varLegend.append("rect")
                    .attr("x", -5)
                    .attr("y", -15) // Shift up relative to the text
                    .attr("width", (variableNames.length * legendItemWidth) + 60)
                    .attr("height", 30)
                    .attr("fill", "white")
                    .attr("stroke", "#ddd")
                    .attr("stroke-width", 1)
                    .attr("rx", 3)
                    .attr("opacity", 0.9);

                varLegend.append("text")
                    .attr("x", 0)
                    .attr("y", 5)
                    .style("font-size", "10px")
                    .style("font-weight", "bold")
                    .style("fill", "#a9b1d6")
                    .text("Variables:");

                variableNames.forEach((variable, i) => {
                    // Position all items on same line with calculated spacing
                    const legendItem = varLegend.append("g")
                        .attr("transform", `translate(${i * legendItemWidth + 60}, 0)`);

                    legendItem.append("circle")
                        .attr("cx", 5)
                        .attr("cy", 0)
                        .attr("r", 5)
                        .attr("fill", variableColors(variable));

                    legendItem.append("text")
                        .attr("x", 15)
                        .attr("y", 4)
                        .style("font-size", "9px")
                        .style("fill", "#a9b1d6")
                        .text(variable);
                });
            }
        }

        // Cleanup on unmount
        return () => {
            tooltip.remove();
        };
    }, [data, dimensions, margin, dotColor, dotHoverColor, dotRadius, dotOpacity, variableOpacity, transitionDuration, title, xAxisLabel, yAxisLabel, showLabels, labelKey, showVariables, variableData]);

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center">
            <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"></svg>
        </div>
    );
}
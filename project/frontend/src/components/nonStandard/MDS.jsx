import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function MDS({
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
    xAxisLabel = "Dimension 1",
    yAxisLabel = "Dimension 2",
    showLabels = true,
    labelKey = "label"
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

        console.log("Rendering chart with data:", data.slice(0, 2));
        console.log("Dimensions:", dimensions);
        console.log("Margin:", margin);

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
        const xMin = d3.min(data, d => d.x);
        const xMax = d3.max(data, d => d.x);
        const yMin = d3.min(data, d => d.y);
        const yMax = d3.max(data, d => d.y);

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

        // Add X axis at the bottom (standard position)
        svg.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).ticks(5))
            .call(g => g.select(".domain").attr("stroke-opacity", 0.5));

        // Add Y axis on the left (standard position)
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

        // Add origin crosshair if it's within the plot bounds
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
                .attr("transform", `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 5})`)
                .style("text-anchor", "middle")
                .style("font-size", "12px")
                .style("fill", "#a9b1d6")
                .text(xAxisLabel);
        }

        // Y axis label
        if (yAxisLabel) {
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -margin.left + 15)
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
        console.log("Categories found:", categories); // Add this for debugging

        // Borough color mapping for consistent visualization with softer colors on dark background
        const boroughColors = {
            'MANHATTAN': '#7AA2F7', // Soft blue from reference
            'BROOKLYN': '#A3BE8C', // Keep our existing soft green
            'QUEENS': '#BB9AF7', // Soft purple from reference
            'BRONX': '#F7768E', // Soft pink from reference
            'STATEN ISLAND': '#73DACA' // Cyan from reference
        };

        const colorScale = (category) => {
            if (category && boroughColors[category.toUpperCase()]) {
                return boroughColors[category.toUpperCase()];
            }
            return '#EBCB8B'; // Neutral yellow for non-borough categories
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

        // Add legend if categories exist - regardless of whether there's a title
        if (categories.length > 0) {
            console.log("Drawing legend for categories:", categories);

            // Make sure there's enough horizontal space
            const maxLegendItemWidth = 120; // Increased for better spacing
            const totalLegendWidth = categories.length * maxLegendItemWidth;

            // Choose positioning strategy based on available space
            let legendX, legendY;

            // If legend is too wide, position it below the title
            if (totalLegendWidth > innerWidth * 0.6) {
                legendX = 10; // Start from left side with padding
                legendY = -margin.top / 2 + (title ? 20 : 0); // Below the title if it exists
            } else {
                // Position legend centered at top if no title, otherwise after title
                if (title) {
                    // Position after title
                    const titleWidth = title.length * 10;
                    legendX = (innerWidth / 2) + (titleWidth / 2) + 20;
                } else {
                    // Center if no title
                    legendX = innerWidth / 2 - (totalLegendWidth / 3);
                }
                legendY = -margin.top / 2; // Same y-coordinate as title
            }

            // Adjust legend item width based on available space
            const legendItemWidth = Math.min(maxLegendItemWidth,
                totalLegendWidth > innerWidth ? (innerWidth * 0.9) / categories.length : maxLegendItemWidth);

            // Create more visible legend background
            titleGroup.append("rect")
                .attr("x", legendX - 10)
                .attr("y", legendY - 15)
                .attr("width", categories.length * legendItemWidth)
                .attr("height", 30) // Increased height
                .attr("fill", "white")
                .attr("stroke", "#ccc") // Darker border
                .attr("stroke-width", 1)
                .attr("rx", 4)
                .attr("opacity", 0.95);

            const legend = titleGroup.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${legendX}, ${legendY - 8})`);

            // Place legend items horizontally with more spacing
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
            .style("transition", "opacity 0.2s");

        // Add data points with animation
        const points = svg.selectAll(".dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.x))
            .attr("cy", d => y(d.y))
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
                    .html(`<strong>${d[labelKey] || ''}</strong><br/>${d.category ? `Category: ${d.category}` : ''}`)
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
                .attr("x", d => x(d.x))
                .attr("y", d => y(d.y) - dotRadius - 5)
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

        // Cleanup on unmount
        return () => {
            tooltip.remove();
        };
    }, [data, dimensions, margin, dotColor, dotHoverColor, dotRadius, dotOpacity, transitionDuration, title, xAxisLabel, yAxisLabel, showLabels, labelKey]);

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center">
            <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"></svg>
        </div>
    );
}
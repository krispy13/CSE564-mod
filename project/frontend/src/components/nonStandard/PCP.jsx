import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function PCP({
    data,
    dimensions = [],
    width,
    height,
    margin = { top: 40, right: 50, bottom: 50, left: 50 },
    lineColor = "#4F46E5",
    lineHoverColor = "#818CF8",
    lineOpacity = 0.2, // Changed from 0.5
    lineHoverOpacity = 0.9,
    lineWidth = 1.5,
    transitionDuration = 800,
    title = "",
    showLabels = true,
    labelKey = "label",
    colorByCategory = true,
    categoryAttribute = "category",
    showCentroids = true,
    centroidLineWidthMultiplier = 5,
    centroidLineOpacity = 0.8,
    centroidLineDashArray = "6,2",
    normalizeAxes = false, // New prop for axis normalization
    onCategorySelect = () => {},
    colorScale = null
}) {
    const svgRef = useRef();
    const containerRef = useRef();
    const [containerDimensions, setContainerDimensions] = useState({ width: width || 800, height: height || 400 });
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || !entries[0]) return;
            const { width, height } = entries[0].contentRect;
            setContainerDimensions({ width, height });
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (!data || data.length === 0 || !dimensions || dimensions.length === 0 ||
            !containerDimensions.width || !containerDimensions.height) return;

        d3.select(svgRef.current).selectAll("*").remove();

        const innerWidth = containerDimensions.width - margin.left - margin.right;
        const innerHeight = containerDimensions.height - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current)
            .attr("width", containerDimensions.width)
            .attr("height", containerDimensions.height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scalePoint()
            .domain(dimensions.map(d => d.name))
            .range([0, innerWidth])
            .padding(0.1);

        const y = {};
        const dimensionStats = {}; // To store actual min/max for normalization

        dimensions.forEach(dimension => {
            const numericValues = data.map(d => d[dimension.name]).filter(v => typeof v === 'number' && !isNaN(v));
            let calculatedMin, calculatedMax;

            if (numericValues.length > 0) {
                calculatedMin = d3.min(numericValues);
                calculatedMax = d3.max(numericValues);
            } else {
                calculatedMin = 0; // Default if no numeric data
                calculatedMax = 1;
            }
            dimensionStats[dimension.name] = { min: calculatedMin, max: calculatedMax };

            let domainToUse;
            if (normalizeAxes) {
                domainToUse = [0, 1];
            } else {
                if (dimension.domain && dimension.domain.length === 2 && dimension.domain[0] !== undefined && dimension.domain[1] !== undefined) {
                    domainToUse = dimension.domain;
                } else if (calculatedMin !== undefined && calculatedMax !== undefined) {
                    if (calculatedMin === calculatedMax) {
                        const val = calculatedMin;
                        const delta = val === 0 ? 0.5 : Math.abs(val * 0.1) || 0.5;
                        domainToUse = [val - delta, val + delta];
                    } else {
                        domainToUse = [calculatedMin, calculatedMax];
                    }
                } else {
                    domainToUse = [0, 1]; // Fallback
                }
            }

            y[dimension.name] = d3.scaleLinear()
                .domain(domainToUse)
                .range([innerHeight, 0]);

            if (!normalizeAxes && domainToUse[0] !== domainToUse[1]) {
                y[dimension.name].nice();
            }
        });

        const getYValue = (rawValue, dimName) => {
            if (rawValue === undefined || rawValue === null || typeof rawValue !== 'number' || isNaN(rawValue)) return undefined;
            if (normalizeAxes) {
                const stats = dimensionStats[dimName];
                if (!stats || stats.min === undefined || stats.max === undefined) return undefined;
                if (stats.max === stats.min) return 0.5; // Map to middle if data range is zero
                return (rawValue - stats.min) / (stats.max - stats.min);
            }
            return rawValue;
        };

        // Borough color mapping for consistent visualization with softer colors on dark background
        const BOROUGH_COLORS = {
            'MANHATTAN': '#7AA2F7', // Soft blue from reference
            'BROOKLYN': '#E0AF68', // Warm yellow
            'QUEENS': '#BB9AF7', // Soft purple from reference
            'BRONX': '#F7768E', // Soft pink from reference
            'STATEN ISLAND': '#73DACA' // Cyan from reference
        };

        const categories = [...new Set(data.map(d => d[categoryAttribute]).filter(cat => cat !== undefined && cat !== null))].sort((a,b) => d3.ascending(a,b));

        const getColor = colorScale || ((category) => {
            // Use our borough colors if the category is a borough
            if (category && BOROUGH_COLORS[category.toUpperCase()]) {
                return BOROUGH_COLORS[category.toUpperCase()];
            }
            // Default to warm orange if not a borough
            return '#FF7B5C';
        });

        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
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

        dimensions.forEach(dimension => {
            svg.append("g")
                .attr("transform", `translate(${x(dimension.name)},0)`)
                .call(d3.axisLeft(y[dimension.name])
                    .tickValues(y[dimension.name].domain()[0] !== undefined && y[dimension.name].domain()[1] !== undefined ?
                        [y[dimension.name].domain()[0], y[dimension.name].domain()[1]] : [])
                    .tickFormat(d => typeof d === 'number' ? d.toFixed(1) : ""))
                .call(g => {
                    g.select(".domain").attr("stroke-opacity", 0.5);
                    g.selectAll(".tick line").attr("stroke-opacity", 0.5);
                });

            // Update axis text colors
            svg.selectAll(".tick text")
                .style("fill", "#787c99");

            // Add axis label at the bottom with updated color
            svg.append("text")
                .attr("x", x(dimension.name))
                .attr("y", innerHeight + 30)
                .attr("text-anchor", "middle")
                .style("fill", "#a9b1d6")
                .style("font-size", "11px")
                .text(dimension.label || dimension.name);
        });

        if (title && title !== "Product Metrics") {
            svg.append("text")
                .attr("x", innerWidth / 2)
                .attr("y", -margin.top / 2 + 10)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .style("fill", "#a9b1d6")
                .text(title);
        }

        if (colorByCategory) {
            const legendItemWidth = Math.floor(innerWidth / categories.length);
            const legendY = -margin.top + 15;

            svg.append("rect")
                .attr("x", 0)
                .attr("y", legendY - 12)
                .attr("width", innerWidth)
                .attr("height", 24)
                .attr("fill", "white")
                .attr("stroke", "#ccc")
                .attr("stroke-width", 1)
                .attr("rx", 4)
                .attr("opacity", 0.95);

            const legend = svg.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(5, ${legendY})`);

            categories.forEach((category, i) => {
                const legendItem = legend.append("g")
                    .attr("transform", `translate(${i * legendItemWidth}, 0)`)
                    .style("cursor", "pointer")
                    .on("click", () => {
                        const currentCategory = category === selectedCategory ? null : category;
                        setSelectedCategory(currentCategory);
                        onCategorySelect(currentCategory);
                    });

                legendItem.append("line")
                    .attr("x1", 0)
                    .attr("y1", 0)
                    .attr("x2", 12)
                    .attr("y2", 0)
                    .attr("stroke", getColor(category))
                    .attr("stroke-width", 2);

                legendItem.append("text")
                    .attr("x", 16)
                    .attr("y", 4)
                    .style("font-size", "10px")
                    .style("font-weight", "500")
                    .style("fill", "#a9b1d6")
                    .text(category);
            });

            // Update legend text colors
            legend.selectAll("text")
                .style("fill", "#a9b1d6");
        }

        const lineGenerator = d3.line()
            .defined(d_point => d_point !== null && d_point.y !== undefined && !isNaN(d_point.y))
            .x(d_point => d_point.x)
            .y(d_point => d_point.y)
            .curve(d3.curveBasis); // Changed from d3.curveLinear to d3.curveBasis

        const paths = svg.selectAll(".data-path")
            .data(data)
            .enter()
            .append("path")
            .attr("class", "data-path")
            .attr("d", d_row => {
                const points = dimensions.map(dimension => {
                    const rawValue = d_row[dimension.name];
                    const valueForScale = getYValue(rawValue, dimension.name);
                    if (valueForScale === undefined || y[dimension.name] === undefined) return null;
                    return {
                        x: x(dimension.name),
                        y: y[dimension.name](valueForScale)
                    };
                });
                return lineGenerator(points.filter(p => p !== null && p.y !== undefined && !isNaN(p.y)));
            })
            .attr("fill", "none")
            .attr("stroke", d_row => {
                if (colorByCategory && d_row[categoryAttribute]) {
                    return getColor(d_row[categoryAttribute]);
                }
                return lineColor;
            })
            .attr("stroke-width", lineWidth)
            .attr("opacity", d_row => {
                if (selectedCategory === null) return lineOpacity;
                return d_row[categoryAttribute] === selectedCategory ? lineHoverOpacity : 0.1;
            })
            .style("cursor", "pointer")
            .on("click", (event, d_row) => {
                const category = d_row[categoryAttribute];
                const newCategory = category === selectedCategory ? null : category;
                setSelectedCategory(newCategory);
                onCategorySelect(newCategory);
            })
            .on("mouseover", function(event, d_row) {
                d3.select(this)
                    .attr("stroke-width", lineWidth * 2)
                    .attr("opacity", lineHoverOpacity)
                    .raise();

                let tooltipContent = `<strong>${d_row[labelKey] || ''}</strong>`;
                if (colorByCategory && d_row[categoryAttribute]) {
                    tooltipContent += `<br/>Borough: ${d_row[categoryAttribute]}`;
                }
                dimensions.forEach(dimension => {
                    const value = d_row[dimension.name];
                    if (value !== undefined && value !== null) {
                        tooltipContent += `<br/>${dimension.label || dimension.name}: ${typeof value === 'number' ? value.toFixed(2) : value}`;
                    }
                });
                tooltip.style("opacity", 0.9)
                    .html(tooltipContent)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(event, d_row) {
                d3.select(this)
                    .attr("stroke-width", lineWidth)
                    .attr("opacity", () => {
                        if (selectedCategory === null) return lineOpacity;
                        return d_row[categoryAttribute] === selectedCategory ? lineHoverOpacity : 0.1;
                    });
                tooltip.style("opacity", 0);
            });

        paths.transition()
            .duration(transitionDuration)
            .delay((d, i) => i * (transitionDuration / data.length / 2))
            .attr("opacity", lineOpacity);

        if (showCentroids && colorByCategory && categories.length > 0) {
            const centroidsData = categories.map(category => {
                const categoryData = data.filter(d => d[categoryAttribute] === category);
                const centroid = { [categoryAttribute]: category };
                dimensions.forEach(dimension => {
                    const values = categoryData
                        .map(d => d[dimension.name])
                        .filter(v => typeof v === 'number' && !isNaN(v));
                    if (values.length > 0) {
                        centroid[dimension.name] = d3.mean(values); // Calculate mean of raw values
                    } else {
                        centroid[dimension.name] = null;
                    }
                });
                return centroid;
            }).filter(c => c !== null);

            svg.selectAll(".centroid-path")
                .data(centroidsData)
                .enter()
                .append("path")
                .attr("class", d_centroid => `centroid-path centroid-${String(d_centroid[categoryAttribute]).replace(/\s+/g, '-').toLowerCase()}`)
                .attr("d", d_centroid => {
                    const points = dimensions.map(dim => {
                        const rawValue = d_centroid[dim.name];
                        const valueForScale = getYValue(rawValue, dim.name);
                        if (valueForScale === null || valueForScale === undefined || !y[dim.name]) return null;
                        return {
                            x: x(dim.name),
                            y: y[dim.name](valueForScale)
                        };
                    });
                    return lineGenerator(points.filter(p => p !== null && p.y !== undefined && !isNaN(p.y)));
                })
                .attr("fill", "none")
                .attr("stroke", d_centroid => getColor(d_centroid[categoryAttribute]))
                .attr("stroke-width", lineWidth * centroidLineWidthMultiplier)
                .attr("stroke-dasharray", centroidLineDashArray || "none")
                .attr("opacity", 0)
                .transition()
                .duration(transitionDuration)
                .delay((d, i) => i * 50 + transitionDuration * 0.75)
                .attr("opacity", centroidLineOpacity);
        }

        if (showLabels) {
            const labelDimensionName = dimensions[dimensions.length - 1].name;
            svg.selectAll(".data-label")
                .data(data)
                .enter()
                .append("text")
                .attr("class", "data-label")
                .attr("x", d_row => {
                    const rawValue = d_row[labelDimensionName];
                    const valueForScale = getYValue(rawValue, labelDimensionName);
                    return (valueForScale !== undefined && y[labelDimensionName] && y[labelDimensionName](valueForScale) !== undefined) ? x(labelDimensionName) + 10 : -9999;
                })
                .attr("y", d_row => {
                    const rawValue = d_row[labelDimensionName];
                    const valueForScale = getYValue(rawValue, labelDimensionName);
                    return (valueForScale !== undefined && y[labelDimensionName] && y[labelDimensionName](valueForScale) !== undefined) ? y[labelDimensionName](valueForScale) : -9999;
                })
                .attr("dy", "0.35em")
                .style("font-size", "10px")
                .style("fill", d_row => colorByCategory && d_row[categoryAttribute] !== undefined && d_row[categoryAttribute] !== null ?
                    getColor(d_row[categoryAttribute]) : "#555")
                .style("opacity", 0)
                .text(d_row => d_row[labelKey] || "")
                .transition()
                .delay((d, i) => i * (transitionDuration / data.length / 2) + transitionDuration)
                .duration(300)
                .style("opacity", d_row => {
                    const rawValue = d_row[labelDimensionName];
                    const valueForScale = getYValue(rawValue, labelDimensionName);
                    return (valueForScale !== undefined && y[labelDimensionName] && y[labelDimensionName](valueForScale) !== undefined) ? 0.7 : 0;
                });
        }

        dimensions.forEach(dimension => {
            const dimensionG = svg.append("g")
                .attr("class", "brush")
                .attr("transform", `translate(${x(dimension.name)},0)`);

            const brush = d3.brushY()
                .extent([[-10, 0], [10, innerHeight]])
                .on("start brush end", brushed);

            dimensionG.call(brush);

            function brushed() {
                const activeBrushes = [];
                svg.selectAll(".brush").each(function(_, i) {
                    const selection = d3.brushSelection(this);
                    if (selection) {
                        const currentDimensionName = dimensions[i].name;
                        activeBrushes.push({
                            dimension: currentDimensionName,
                            extent: selection.map(pixelVal => y[currentDimensionName].invert(pixelVal))
                        });
                    }
                });

                paths.attr("opacity", d_row => {
                    let visible = true;
                    if (activeBrushes.length === 0) {
                        return lineOpacity;
                    }

                    for (const brush of activeBrushes) {
                        const rawValue = d_row[brush.dimension];
                        let valueToCompare;

                        if (normalizeAxes) {
                            valueToCompare = getYValue(rawValue, brush.dimension);
                        } else {
                            valueToCompare = rawValue;
                        }

                        if (valueToCompare === undefined || valueToCompare === null || typeof valueToCompare !== 'number' || isNaN(valueToCompare) ||
                            !(valueToCompare >= Math.min(...brush.extent) && valueToCompare <= Math.max(...brush.extent))) {
                            visible = false;
                            break;
                        }
                    }
                    return visible ? lineOpacity : 0.03;
                });
            }
        });

        return () => {
            tooltip.remove();
        };
    }, [data, dimensions, containerDimensions, margin, lineColor, lineHoverColor,
        lineOpacity, lineHoverOpacity, lineWidth, transitionDuration, title,
        showLabels, labelKey, colorByCategory, categoryAttribute,
        showCentroids, centroidLineWidthMultiplier, centroidLineOpacity, centroidLineDashArray,
        normalizeAxes, onCategorySelect, colorScale]); // Added normalizeAxes to dependency array

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center">
            <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"></svg>
        </div>
    );
}
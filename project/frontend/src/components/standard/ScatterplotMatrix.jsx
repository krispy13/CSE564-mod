import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Does not reder the x-axis needs fixing

export default function ScatterplotMatrix({
    data = [],
    dimensions = [],
    width = 600,
    height = 600,
    margin = { top: 20, right: 20, bottom: 40, left: 40 },
    padding = 28,
    dotColor = '#4682b4',
    dotHoverColor = '#6495ed',
    dotRadius = 3,
    title = '',
    transitionDuration = 500,
    showLabels = true,
}) {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

    // Add resize observer to update dimensions when container size changes
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                setContainerDimensions({ width, height });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (!data.length || !dimensions.length || containerDimensions.width === 0 || containerDimensions.height === 0) return;

        // Use container dimensions
        const chartWidth = containerDimensions.width;
        const chartHeight = containerDimensions.height;

        // Clear SVG before redrawing
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Calculate the effective area for plotting
        const totalWidth = chartWidth - margin.left - margin.right;
        const totalHeight = chartHeight - margin.top - margin.bottom;

        // Calculate the size of each cell in the matrix
        const size = Math.min(
            totalWidth / dimensions.length,
            totalHeight / dimensions.length
        );

        // Adjust left margin to center the matrix if needed
        const effectiveWidth = size * dimensions.length;
        const effectiveHeight = size * dimensions.length;
        const adjustedMarginLeft = margin.left + (totalWidth - effectiveWidth) / 2;
        const adjustedMarginTop = margin.top + (totalHeight - effectiveHeight) / 2;

        // Add title if provided
        if (title) {
            svg
                .append('text')
                .attr('x', chartWidth / 2)
                .attr('y', margin.top / 2)
                .attr('text-anchor', 'middle')
                .attr('class', 'visualization-title')
                .text(title);
        }

        // Create scales for each dimension
        const scales = {};
        dimensions.forEach(dim => {
            // Validate data has this dimension before creating scale
            if (data[0] && dim in data[0]) {
                const extent = d3.extent(data, d => d[dim]);
                // Ensure we have valid min/max values
                if (extent[0] !== undefined && extent[1] !== undefined && !isNaN(extent[0]) && !isNaN(extent[1])) {
                    scales[dim] = d3.scaleLinear()
                        .domain(extent)
                        .range([padding / 2, size - padding / 2])
                        .nice();
                }
            }
        });

        // Validate we have scales for all dimensions
        const validDimensions = dimensions.filter(dim => scales[dim]);
        if (validDimensions.length !== dimensions.length) {
            console.warn('Some dimensions are missing from the data or have invalid values');
        }

        // If no valid dimensions, return early
        if (validDimensions.length === 0) return;

        // Create the main group element with adjusted margins for centering
        const g = svg
            .append('g')
            .attr('transform', `translate(${adjustedMarginLeft},${adjustedMarginTop})`);

        // Create cell groups
        const cell = g.selectAll('.cell')
            .data(cross(validDimensions, validDimensions))
            .enter().append('g')
            .attr('class', 'cell')
            .attr('transform', d => `translate(${d.i * size},${d.j * size})`);

        // Add rectangles for cell backgrounds (for interaction area)
        cell.append('rect')
            .attr('class', 'frame')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', size)
            .attr('height', size)
            .style('fill', '#f9f9f9') // Light gray background for better contrast
            .style('stroke', '#aaa')
            .style('stroke-width', 1);

        // Add axis for the plots
        cell.each(function (d) {
            const cellGroup = d3.select(this);

            // X axis (bottom)
            if (d.j === validDimensions.length - 1) {
                // Create a background for the X axis to improve visibility
                cellGroup.append('rect')
                    .attr('x', 0)
                    .attr('y', size)
                    .attr('width', size)
                    .attr('height', 20)
                    .style('fill', '#f0f0f0')
                    .style('stroke', 'none');

                const xAxis = d3.axisBottom()
                    .scale(scales[d.x])
                    .ticks(Math.min(5, Math.floor(size / 30)))
                    .tickSize(6); // Increase tick size slightly

                cellGroup.append('g')
                    .attr('class', 'x axis')
                    .attr('transform', `translate(0,${size})`)
                    .call(xAxis)
                    .call(g => {
                        // Enhance domain line appearance
                        g.select(".domain")
                            .attr("stroke", "#000")
                            .attr("stroke-width", 2); // Increased thickness

                        // Enhance tick marks appearance
                        g.selectAll(".tick line")
                            .attr("stroke", "#000")
                            .attr("stroke-width", 1.5);

                        // Enhance text appearance
                        g.selectAll(".tick text")
                            .attr("fill", "#000")
                            .attr("font-weight", "bold");
                    })
                    .selectAll('text')
                    .attr('font-size', Math.max(9, Math.min(11, size / 25)) + 'px')
                    .attr('dy', '0.9em'); // Increase vertical offset

                // Add X-axis label
                if (showLabels) {
                    cellGroup.append('text')
                        .attr('class', 'visualization-text x-label')
                        .attr('text-anchor', 'middle')
                        .attr('x', size / 2)
                        .attr('y', size + padding + 10) // Increased vertical spacing
                        .attr('font-size', Math.max(10, Math.min(14, size / 18)) + 'px') // Larger font
                        .attr('font-weight', 'bold')
                        .attr('fill', '#333') // Darker text color
                        .style('background', '#fff')
                        .text(d.x);

                    // Add a background rectangle for better label visibility
                    const textNode = cellGroup.select('.x-label').node();
                    if (textNode) {
                        const bbox = textNode.getBBox();
                        cellGroup.insert('rect', '.x-label')
                            .attr('x', bbox.x - 2)
                            .attr('y', bbox.y - 2)
                            .attr('width', bbox.width + 4)
                            .attr('height', bbox.height + 4)
                            .attr('fill', 'white')
                            .attr('stroke', '#f0f0f0');
                    }
                }

                // Add a visual grid inside the cell
                cellGroup.append('g')
                    .attr('class', 'x grid')
                    .attr('transform', `translate(0,${size})`)
                    .call(d3.axisBottom()
                        .scale(scales[d.x])
                        .tickSize(-size)
                        .tickFormat('')
                    )
                    .call(g => g.selectAll(".tick line")
                        .attr("stroke", "#e0e0e0")
                        .attr("stroke-dasharray", "2,2"));
            }

            // Y axis (left)
            if (d.i === 0) {
                const yAxis = d3.axisLeft()
                    .scale(scales[d.y])
                    .ticks(Math.min(5, Math.floor(size / 30)))
                    .tickSize(5); // Use positive tickSize for left ticks only

                cellGroup.append('g')
                    .attr('class', 'y axis')
                    .call(yAxis)
                    .call(g => g.select(".domain").attr("stroke", "#000").attr("stroke-width", 1.5)) // Make axis line darker and thicker
                    .selectAll('text')
                    .attr('font-size', Math.max(8, Math.min(10, size / 25)) + 'px')
                    .attr('dx', '-0.3em'); // Move text left slightly for better visibility

                // Add Y-axis label
                if (showLabels) {
                    cellGroup.append('text')
                        .attr('class', 'visualization-text y-label')
                        .attr('transform', `rotate(-90) translate(${-size/2}, ${-padding})`)
                        .attr('text-anchor', 'middle')
                        .text(d.y);
                }

                // Add a visual grid inside the cell
                cellGroup.append('g')
                    .attr('class', 'y grid')
                    .call(d3.axisLeft()
                        .scale(scales[d.y])
                        .tickSize(-size)
                        .tickFormat('')
                    )
                    .call(g => g.selectAll(".tick line")
                        .attr("stroke", "#e0e0e0")
                        .attr("stroke-dasharray", "2,2"));
            }
        });

        // Add the scatterplot points for different cells
        cell.each(function (d) {
            const cellGroup = d3.select(this);

            try {
                // Add circles with initial zero size for animation
                const circles = cellGroup.selectAll('circle')
                    .data(data)
                    .enter().append('circle')
                    .attr('cx', dd => {
                        const val = scales[d.x](dd[d.x]);
                        return isNaN(val) ? 0 : val;
                    })
                    .attr('cy', dd => {
                        const val = scales[d.y](dd[d.y]);
                        return isNaN(val) ? 0 : val;
                    })
                    .attr('r', 0)
                    .style('fill', dotColor)
                    .style('opacity', 0.7);

                // Add transition animation
                circles.transition()
                    .duration(transitionDuration)
                    .attr('r', Math.min(dotRadius, size / 50)); // Scale dots to cell size

                // Add interactions
                circles.on('mouseenter', function (event, dd) {
                    // Change color and size on hover
                    d3.select(this)
                        .style('fill', dotHoverColor)
                        .attr('r', Math.min(dotRadius * 1.5, size / 40));

                    // Add tooltip for data point
                    const xValue = dd[d.x];
                    const yValue = dd[d.y];

                    if (xValue !== undefined && yValue !== undefined) {
                        const tooltip = g.append('text')
                            .attr('class', 'tooltip')
                            .attr('x', d.i * size + scales[d.x](xValue))
                            .attr('y', d.j * size + scales[d.y](yValue) - 10)
                            .attr('text-anchor', 'middle')
                            .attr('font-size', Math.max(8, Math.min(9, size / 30)) + 'px')
                            .attr('font-weight', 'bold')
                            .style('pointer-events', 'none')
                            .text(`${dd.label || ''} (${xValue.toFixed(1)}, ${yValue.toFixed(1)})`);
                    }

                    // Show related points in other plots
                    cell.selectAll('circle')
                        .filter(point => point === dd)
                        .style('fill', dotHoverColor)
                        .attr('r', Math.min(dotRadius * 1.5, size / 40));
                })
                    .on('mouseleave', function (event, dd) {
                        // Reset circle appearance
                        d3.select(this)
                            .style('fill', dotColor)
                            .attr('r', Math.min(dotRadius, size / 50));

                        // Remove tooltip
                        g.selectAll('.tooltip').remove();

                        // Reset all related points
                        cell.selectAll('circle')
                            .filter(point => point === dd)
                            .style('fill', dotColor)
                            .attr('r', Math.min(dotRadius, size / 50));
                    });
            } catch (e) {
                console.error('Error rendering circles for dimension pair:', d.x, d.y, e);
            }
        });

        // Function to generate pairs of dimensions
        function cross(a, b) {
            const result = [];
            a.forEach((d, i) => {
                b.forEach((e, j) => {
                    result.push({ i: i, j: j, x: d, y: e });
                });
            });
            return result;
        }

        // Update axis text styles
        cell.each(function(d) {
            const cellGroup = d3.select(this);

            // Add axis labels
            if (d.i === dimensions.length - 1) {
                cellGroup.append('text')
                    .attr('class', 'visualization-text x-label')
                    .attr('text-anchor', 'middle')
                    .attr('x', size / 2)
                    .attr('y', size + padding + 10)
                    .text(d.x);
            }

            if (d.j === 0) {
                cellGroup.append('text')
                    .attr('class', 'visualization-text y-label')
                    .attr('transform', `rotate(-90) translate(${-size/2}, ${-padding})`)
                    .attr('text-anchor', 'middle')
                    .text(d.y);
            }

            // Update axis text styles
            cellGroup.selectAll('.axis text')
                .attr('class', 'visualization-text');
        });

        // Update tooltip styles
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'scatterplot-tooltip visualization-text')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'white')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px')
            .style('padding', '8px')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
            .style('pointer-events', 'none');

    }, [data, dimensions, margin, padding, dotColor, dotHoverColor, dotRadius, title, transitionDuration, showLabels, containerDimensions]);

    return (
        <div ref={containerRef} className="scatterplot-matrix-container" style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
            />
        </div>
    );
}
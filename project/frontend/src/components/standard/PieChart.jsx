import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function PieChart({
    data = [],
    width = 400,
    height = 400,
    margin = { top: 30, right: 30, bottom: 30, left: 30 },
    innerRadius = 0,
    padAngle = 0.01,
    cornerRadius = 3,
    title = '',
    colorScale = d3.schemeCategory10,
    transitionDuration = 500,
    showLegend = true,
    legendPosition = 'right', // 'right', 'bottom'
}) {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Add resize observer to update dimensions when container size changes
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                setDimensions({ width, height });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (!data.length || dimensions.width === 0 || dimensions.height === 0) return;

        // Use container dimensions
        const chartWidth = dimensions.width;
        const chartHeight = dimensions.height;

        // Clear SVG before redrawing
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Calculate dimensions
        const availableWidth = chartWidth - margin.left - margin.right;
        const availableHeight = chartHeight - margin.top - margin.bottom;

        // Determine pie size based on available space and legend position
        let pieWidth, pieHeight, legendX, legendY;
        const legendWidth = showLegend ? 100 : 0;

        if (legendPosition === 'right' && showLegend) {
            pieWidth = availableWidth - legendWidth;
            pieHeight = availableHeight;
            legendX = margin.left + pieWidth;
            legendY = margin.top;
        } else if (legendPosition === 'bottom' && showLegend) {
            pieWidth = availableWidth;
            pieHeight = availableHeight - 80;
            legendX = margin.left;
            legendY = margin.top + pieHeight;
        } else {
            pieWidth = availableWidth;
            pieHeight = availableHeight;
        }

        // Calculate radius
        const radius = Math.min(pieWidth, pieHeight) / 2;

        // Create the main group element
        const g = svg
            .append('g')
            .attr('transform', `translate(${margin.left + pieWidth / 2},${margin.top + pieHeight / 2})`);

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

        // Create color scale
        const color = d3.scaleOrdinal()
            .domain(data.map(d => d.label))
            .range(typeof colorScale === 'function' ? colorScale(data.length) : colorScale);

        // Create pie layout
        const pie = d3.pie()
            .value(d => d.value)
            .sort(null)
            .padAngle(padAngle);

        // Create arc generator
        const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius)
            .cornerRadius(cornerRadius);

        // Create hover arc (slightly larger)
        const hoverArc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius * 1.05)
            .cornerRadius(cornerRadius);

        // Draw pie slices
        const arcs = g.selectAll('.arc')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'arc');

        // Add path for each slice
        const paths = arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => color(d.data.label))
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .style('opacity', 0.9)
            .on('mouseenter', function (event, d) {
                // Enlarge slice on hover
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', hoverArc)
                    .style('opacity', 1);

                // Add value label
                const centroid = arc.centroid(d);
                g.append('text')
                    .attr('class', 'hover-value')
                    .attr('x', centroid[0])
                    .attr('y', centroid[1])
                    .attr('text-anchor', 'middle')
                    .style('font-size', '14px')
                    .style('font-weight', 'bold')
                    .style('fill', '#fff')
                    .style('text-shadow', '0 0 3px rgba(0,0,0,0.5)')
                    .text(d.data.value);
            })
            .on('mouseleave', function () {
                // Restore original size
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', arc)
                    .style('opacity', 0.9);

                // Remove hover value
                g.selectAll('.hover-value').remove();
            });

        // Add transition animation
        paths.transition()
            .duration(transitionDuration)
            .attrTween('d', function (d) {
                const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
                return t => arc(interpolate(t));
            });

        // Add legend if enabled
        if (showLegend) {
            const legend = svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${legendX}, ${legendY})`);

            // Legend items
            const legendItems = legend.selectAll('.legend-item')
                .data(data)
                .enter()
                .append('g')
                .attr('class', 'legend-item')
                .attr('transform', (d, i) =>
                    legendPosition === 'right'
                        ? `translate(0, ${i * 20})`
                        : `translate(${i * (pieWidth / data.length)}, 10)`
                );

            // Add colored rectangles
            legendItems.append('rect')
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', d => color(d.label));

            // Add labels
            legendItems.append('text')
                .attr('x', 20)
                .attr('y', 10)
                .attr('text-anchor', 'start')
                .style('font-size', '12px')
                .attr('class', 'visualization-text')
                .text(d => d.label);
        }

        // Add percentage labels with visualization-text class
        arcs.append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('class', 'visualization-text')
            .text(d => `${Math.round(d.value / d3.sum(data, d => d.value) * 100)}%`);

    }, [data, margin, innerRadius, padAngle, cornerRadius, title, colorScale, transitionDuration, showLegend, legendPosition, dimensions]);

    return (
        <div ref={containerRef} className="pie-chart-container" style={{ width: '100%', height: '100%' }}>
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ overflow: 'visible' }}
            />
        </div>
    );
}
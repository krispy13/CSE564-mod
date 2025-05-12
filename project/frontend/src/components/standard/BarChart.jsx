import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
// import PropTypes from 'prop-types';

export default function BarChart({
    data = [],
    width = 600,
    height = 400,
    margin = { top: 20, right: 30, bottom: 60, left: 60 },
    xAxisLabel = 'X Axis',
    yAxisLabel = 'Y Axis',
    barColor = '#4682b4',
    hoverColor = '#6495ed',
    title = '',
    transitionDuration = 500,
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

        // Use container dimensions instead of props
        const chartWidth = dimensions.width;
        const chartHeight = dimensions.height;

        // Calculate dimensions
        const innerWidth = chartWidth - margin.left - margin.right;
        const innerHeight = chartHeight - margin.top - margin.bottom;

        // Clear SVG before redrawing
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Create the main group element
        const g = svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

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

        // Create scales
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, innerWidth])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value) * 1.1])
            .range([innerHeight, 0]);

        // Draw X axis
        const xAxis = g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale));

        // Add X axis label
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + margin.bottom - 10)
            .attr('text-anchor', 'middle')
            .attr('class', 'visualization-text')
            .text(xAxisLabel);

        // Draw Y axis
        g.append('g')
            .call(d3.axisLeft(yScale));

        // Add Y axis label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 10)
            .attr('x', -innerHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('class', 'visualization-text')
            .text(yAxisLabel);

        // Update axis text styles
        svg.selectAll('.axis text')
            .attr('class', 'visualization-text');

        // Draw bars
        const bars = g.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.label))
            .attr('width', xScale.bandwidth())
            .attr('y', innerHeight)
            .attr('height', 0)
            .attr('fill', barColor)
            .on('mouseenter', function () {
                // Change color on hover without triggering state changes
                d3.select(this).attr('fill', hoverColor);

                // Add value label above bar on hover
                const d = d3.select(this).datum();
                const x = xScale(d.label) + xScale.bandwidth() / 2;
                const y = yScale(d.value) - 5;

                g.append('text')
                    .attr('class', 'hover-value')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('font-weight', 'bold')
                    .text(d.value);
            })
            .on('mouseleave', function () {
                // Restore original color
                d3.select(this).attr('fill', barColor);

                // Remove hover value
                g.selectAll('.hover-value').remove();
            });

        // Add transition animation
        bars.transition()
            .duration(transitionDuration)
            .attr('y', d => yScale(d.value))
            .attr('height', d => innerHeight - yScale(d.value));

        // Clean up on unmount
        return () => {
            // No tooltip to clean up anymore
        };
    }, [data, margin, xAxisLabel, yAxisLabel, barColor, hoverColor, title, transitionDuration, dimensions]);

    return (
        <div ref={containerRef} className="bar-chart-container" style={{ width: '100%', height: '100%' }}>
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ overflow: 'visible' }}
            />
        </div>
    );
}
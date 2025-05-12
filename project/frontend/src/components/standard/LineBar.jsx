import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Borough color mapping for consistent visualization with softer colors on dark background
const BOROUGH_COLORS = {
    'MANHATTAN': '#7AA2F7', // Soft blue from reference
    'BROOKLYN': '#E0AF68', // Warm yellow
    'QUEENS': '#BB9AF7', // Soft purple from reference
    'BRONX': '#F7768E', // Soft pink from reference
    'STATEN ISLAND': '#73DACA' // Cyan from reference
};

export default function LineBarChart({
    data = [],
    width = 700,
    height = 400,
    margin = { top: 40, right: 80, bottom: 100, left: 80 },
    xAxisLabel = 'Environmental Factors',
    yAxisLabel = 'Impact Score',
    barColor = '#FF7B5C',    // Warm orange for bars
    hoverColor = '#BB9AF7',  // Soft purple for hover
    title = 'Environmental Metrics by Borough',
    transitionDuration = 800,
    selectedBorough = null,
    onBoroughSelect = () => {},
}) {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Get the line color based on selected borough
    const getLineColor = () => {
        if (!selectedBorough) return '#7AA2F7'; // Default blue for line
        return BOROUGH_COLORS[selectedBorough.toUpperCase()] || '#7AA2F7';
    };

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

        const lineColor = getLineColor();

        const chartWidth = dimensions.width;
        const chartHeight = dimensions.height;

        const innerWidth = chartWidth - margin.left - margin.right;
        const innerHeight = chartHeight - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const g = svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        if (title) {
            const titleText = selectedBorough 
                ? `${title} - ${selectedBorough}` 
                : `${title} - Citywide`;
            
            svg
                .append('text')
                .attr('x', chartWidth / 2)
                .attr('y', margin.top / 2)
                .attr('text-anchor', 'middle')
                .attr('class', 'visualization-title')
                .style('font-size', '16px')
                .style('font-weight', 'bold')
                .style('fill', '#a9b1d6')
                .text(titleText);
        }

        // Create scales with padding
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, innerWidth])
            .padding(0.3);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => Math.max(d.barValue, d.lineValue || 0)) * 1.1])
            .range([innerHeight, 0])
            .nice();

        // Draw X axis with improved styling
        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .call(g => {
                g.selectAll('text')
                    .style('text-anchor', 'end')
                    .attr('dx', '-.8em')
                    .attr('dy', '.15em')
                    .attr('transform', 'rotate(-45)')
                    .style('font-size', '11px') // Slightly smaller font
                    .style('fill', '#787c99') // Muted text color
                    .each(function() { // Handle long labels
                        const self = d3.select(this);
                        const textLength = self.node().getComputedTextLength();
                        const maxWidth = xScale.bandwidth() * 1.5;
                        
                        if (textLength > maxWidth) {
                            let text = self.text();
                            while (text.length > 0 && self.node().getComputedTextLength() > maxWidth) {
                                text = text.slice(0, -1);
                                self.text(text + '...');
                            }
                        }
                    });
                g.selectAll('line')
                    .style('stroke', '#2f334d') // Darker lines
                    .style('stroke-opacity', 0.5);
                g.select('.domain')
                    .style('stroke', '#2f334d') // Darker domain line
                    .style('stroke-opacity', 0.5);
            });

        // Add X axis label with better positioning
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + margin.bottom - 20) // Adjusted position
            .attr('text-anchor', 'middle')
            .attr('class', 'visualization-text')
            .style('font-size', '14px')
            .style('fill', '#a9b1d6') // Softer text color
            .text(xAxisLabel);

        // Draw Y axis with improved styling
        g.append('g')
            .call(d3.axisLeft(yScale))
            .call(g => {
                g.selectAll('text')
                    .style('font-size', '12px')
                    .style('fill', '#787c99'); // Muted text color
                g.selectAll('line')
                    .style('stroke', '#2f334d') // Darker lines
                    .style('stroke-opacity', 0.5);
                g.select('.domain')
                    .style('stroke', '#2f334d') // Darker domain line
                    .style('stroke-opacity', 0.5);
            });

        // Add Y axis label with better positioning
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 30)
            .attr('x', -innerHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('class', 'visualization-text')
            .style('font-size', '14px')
            .style('fill', '#a9b1d6') // Softer text color
            .text(yAxisLabel);

        // Draw bars with neutral color
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
            .style('opacity', 0.8)
            .on('mouseenter', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('fill', hoverColor)
                    .style('opacity', 1);

                // Show value tooltip
                g.append('text')
                    .attr('class', 'hover-value')
                    .attr('x', xScale(d.label) + xScale.bandwidth() / 2)
                    .attr('y', yScale(d.barValue) - 5)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('font-weight', 'bold')
                    .style('fill', '#a9b1d6')
                    .text(`Current: ${d.barValue.toFixed(1)}`);

                // Show benchmark tooltip if available
                if (d.lineValue) {
                    g.append('text')
                        .attr('class', 'hover-value')
                        .attr('x', xScale(d.label) + xScale.bandwidth() / 2)
                        .attr('y', yScale(d.lineValue) - 5)
                        .attr('text-anchor', 'middle')
                        .style('font-size', '12px')
                        .style('font-weight', 'bold')
                        .style('fill', lineColor)
                        .text(`Benchmark: ${d.lineValue.toFixed(1)}`);
                }
            })
            .on('mouseleave', function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('fill', barColor)
                    .style('opacity', 0.8);
                g.selectAll('.hover-value').remove();
            });

        // Animate bars
        bars.transition()
            .duration(transitionDuration)
            .delay((_, i) => i * 50)
            .ease(d3.easeElastic.amplitude(0.5))
            .attr('y', d => yScale(d.barValue))
            .attr('height', d => innerHeight - yScale(d.barValue));

        // Add benchmark line with borough colors
        const line = d3.line()
            .x(d => xScale(d.label) + xScale.bandwidth() / 2)
            .y(d => yScale(d.lineValue))
            .curve(d3.curveMonotoneX);

        // Add line path with animation
        const linePath = g.append('path')
            .datum(data.filter(d => d.lineValue !== undefined))
            .attr('fill', 'none')
            .attr('stroke', lineColor)
            .attr('stroke-width', 2.5)
            .attr('d', line);

        // Animate line
        const totalLength = linePath.node().getTotalLength();
        linePath
            .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(transitionDuration)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);

        // Add benchmark points with borough colors
        g.selectAll('.benchmark-point')
            .data(data.filter(d => d.lineValue !== undefined))
            .enter()
            .append('circle')
            .attr('class', 'benchmark-point')
            .attr('cx', d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr('cy', d => yScale(d.lineValue))
            .attr('r', 4)
            .attr('fill', lineColor)
            .attr('stroke', '#1a1b26')
            .attr('stroke-width', 2)
            .style('opacity', 0)
            .transition()
            .duration(transitionDuration)
            .delay((_, i) => i * 50 + transitionDuration / 2)
            .style('opacity', 1);

        // Add legend with adjusted position
        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${innerWidth - 150}, ${margin.top})`); // Moved down

        // Current value legend item
        legend.append('rect')
            .attr('x', 0)
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', barColor);

        legend.append('text')
            .attr('x', 20)
            .attr('y', 9)
            .style('font-size', '12px')
            .style('fill', '#a9b1d6')
            .text('Current Value');

        // Benchmark legend item
        legend.append('rect')
            .attr('x', 100)
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', lineColor);

        legend.append('text')
            .attr('x', 120)
            .attr('y', 9)
            .style('font-size', '12px')
            .style('fill', '#a9b1d6')
            .text('Benchmark');

    }, [data, margin, xAxisLabel, yAxisLabel, barColor, hoverColor, title, transitionDuration, dimensions, selectedBorough]);

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
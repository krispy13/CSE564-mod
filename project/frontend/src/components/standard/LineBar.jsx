import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Borough color mapping for consistent visualization with softer colors on dark background
const boroughColors = {
    'MANHATTAN': '#81A1C1', // Soft blue
    'BROOKLYN': '#A3BE8C', // Soft green
    'QUEENS': '#EBCB8B',   // Soft yellow
    'BRONX': '#B48EAD',    // Soft purple
    'STATEN ISLAND': '#88C0D0' // Soft cyan
};

export default function LineBarChart({
    data = [],
    width = 700,
    height = 400,
    margin = { top: 40, right: 80, bottom: 80, left: 80 },
    xAxisLabel = 'Environmental Factors',
    yBarAxisLabel = 'Value',
    yLineAxisLabel = 'Value',
    barColor = '#3B4252',    // Darker gray for bars
    lineColor = '#7aa2f7',   // Bright blue for line
    hoverColor = '#81A1C1',  // Soft blue for hover
    title = 'Environmental Metrics by Borough',
    transitionDuration = 800,
    selectedBorough = null,
    onBoroughSelect = () => {},
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

    // Get the line color based on selected borough
    const getLineColor = () => {
        if (!selectedBorough) return lineColor;
        return boroughColors[selectedBorough.toUpperCase()] || lineColor;
    };

    useEffect(() => {
        if (!data.length || dimensions.width === 0 || dimensions.height === 0) return;

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
                .style('fill', '#a9b1d6') // Softer text color
                .text(titleText);
        }

        // Create scales with padding
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, innerWidth])
            .padding(0.3); // Increased padding between bars

        const yBarScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.barValue) * 1.1])
            .range([innerHeight, 0])
            .nice(); // Nice round numbers

        const yLineScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.lineValue) * 1.1])
            .range([innerHeight, 0])
            .nice(); // Nice round numbers

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
                    .style('font-size', '12px')
                    .style('fill', '#787c99'); // Muted text color
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
            .attr('y', innerHeight + margin.bottom - 10)
            .attr('text-anchor', 'middle')
            .attr('class', 'visualization-text')
            .style('font-size', '14px')
            .style('fill', '#a9b1d6') // Softer text color
            .text(xAxisLabel);

        // Draw Y Bar axis with improved styling
        g.append('g')
            .call(d3.axisLeft(yBarScale))
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

        // Add Y Bar axis label with better positioning
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 30)
            .attr('x', -innerHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('class', 'visualization-text')
            .style('font-size', '14px')
            .style('fill', '#a9b1d6') // Softer text color
            .text(yBarAxisLabel);

        // Draw Y Line axis with improved styling
        g.append('g')
            .attr('transform', `translate(${innerWidth},0)`)
            .call(d3.axisRight(yLineScale))
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

        // Add Y Line axis label with better positioning
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', innerWidth + margin.right - 30)
            .attr('x', -innerHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('class', 'visualization-text')
            .style('font-size', '14px')
            .style('fill', '#a9b1d6') // Softer text color
            .text(yLineAxisLabel);

        // Draw bars with improved animations
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

                g.append('text')
                    .attr('class', 'hover-value-bar')
                    .attr('x', xScale(d.label) + xScale.bandwidth() / 2)
                    .attr('y', yBarScale(d.barValue) - 5)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('font-weight', 'bold')
                    .style('fill', '#a9b1d6') // Softer text color
                    .text(`${d.barValue.toFixed(2)}`);
            })
            .on('mouseleave', function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('fill', barColor)
                    .style('opacity', 0.8);
                g.selectAll('.hover-value-bar').remove();
            });

        // Animate bars with sequential delay
        bars.transition()
            .duration(transitionDuration)
            .delay((_, i) => i * 50) // Sequential delay for each bar
            .ease(d3.easeElastic.amplitude(0.5)) // Elastic animation
            .attr('y', d => yBarScale(d.barValue))
            .attr('height', d => innerHeight - yBarScale(d.barValue));

        // Define the line with smooth curve
        const line = d3.line()
            .x(d => xScale(d.label) + xScale.bandwidth() / 2)
            .y(d => yLineScale(d.lineValue))
            .curve(d3.curveMonotoneX); // Smooth curve interpolation

        // Draw the line path with animation
        const linePath = g.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', getLineColor())
            .attr('stroke-width', 3)
            .attr('d', line);

        // Animate line drawing
        const totalLength = linePath.node().getTotalLength();
        linePath
            .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(transitionDuration)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);

        // Add points to the line with improved styling and animations
        g.selectAll('.line-point')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'line-point')
            .attr('cx', d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr('cy', d => yLineScale(d.lineValue))
            .attr('r', 0)
            .attr('fill', getLineColor())
            .attr('stroke', '#1a1b26') // Darkest background color for contrast
            .attr('stroke-width', 2)
            .transition()
            .duration(transitionDuration)
            .delay((_, i) => i * 50 + transitionDuration / 2)
            .attr('r', 6);

        // Add hover effects to points
        g.selectAll('.line-point')
            .on('mouseenter', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 8)
                    .attr('stroke-width', 3);

                g.append('text')
                    .attr('class', 'hover-value-line')
                    .attr('x', xScale(d.label) + xScale.bandwidth() / 2)
                    .attr('y', yLineScale(d.lineValue) - 15)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('font-weight', 'bold')
                    .style('fill', '#a9b1d6') // Softer text color
                    .text(`${d.lineValue.toFixed(2)}`);
            })
            .on('mouseleave', function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6)
                    .attr('stroke-width', 2);
                g.selectAll('.hover-value-line').remove();
            });

        // Update tooltip text color
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', '#24283b')
            .style('border', '1px solid #2f334d')
            .style('border-radius', '4px')
            .style('padding', '8px')
            .style('color', '#a9b1d6')  // Updated from white
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', 1000);

        // Update any value labels or text elements
        g.selectAll('.value-label')
            .style('fill', '#a9b1d6')  // Updated from white
            .style('font-size', '12px');

        // Update legend text if present
        g.selectAll('.legend-text')
            .style('fill', '#a9b1d6');  // Updated from white

        // Update any other text elements that might be white
        g.selectAll('text')
            .filter(function() {
                const currentColor = d3.select(this).style('fill');
                return currentColor === '#fff' || currentColor === '#ffffff' || currentColor === 'white';
            })
            .style('fill', '#a9b1d6');

    }, [data, margin, xAxisLabel, yBarAxisLabel, yLineAxisLabel, barColor, lineColor, hoverColor, title, transitionDuration, dimensions, selectedBorough]);

    return (
        <div ref={containerRef} className="line-bar-chart-container" style={{ width: '100%', height: '100%' }}>
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ overflow: 'visible' }}
            />
        </div>
    );
}
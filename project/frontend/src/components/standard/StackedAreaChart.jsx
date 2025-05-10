import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const StackedAreaChart = ({
    data,
    margin = { top: 20, right: 20, bottom: 30, left: 40 },
    xKey = 'hour_of_day',
    yKey = 'incident_count',
    groupKey = 'crime_type',
    colorScale = d3.schemeSet2,
    transitionDuration = 800,
    showLegend = true,
    legendPosition = 'top',
    xAxisLabel = '',
    yAxisLabel = ''
}) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !data.length) return;

        d3.select(svgRef.current).selectAll('*').remove();

        const legendItemHeight = 20;
        const legendPadding = 5;
        const legendItemsPerRow = 5;
        
        const groups = [...new Set(data.map(d => d[groupKey]))].sort((a,b) => d3.descending(a,b));
        let legendHeight = 0;
        let legendWidthAdjustment = 0;

        if (showLegend) {
            if (legendPosition === 'top' || legendPosition === 'bottom') {
                const numRows = Math.ceil(groups.length / legendItemsPerRow);
                legendHeight = numRows * legendItemHeight + (numRows > 0 ? legendPadding * 2 : 0);
            } else if (legendPosition === 'right') {
                legendWidthAdjustment = 100;
            }
        }

        let currentTopMargin = margin.top;
        if (showLegend && legendPosition === 'top') {
            currentTopMargin += legendHeight;
        }
        let currentBottomMargin = margin.bottom;
         if (showLegend && legendPosition === 'bottom') {
            currentBottomMargin += legendHeight;
        }

        const width = svgRef.current.clientWidth - margin.left - margin.right - legendWidthAdjustment;
        const chartDrawingHeight = svgRef.current.clientHeight - currentTopMargin - currentBottomMargin;
        
        const svg = d3.select(svgRef.current)
            .attr('width', svgRef.current.clientWidth)
            .attr('height', svgRef.current.clientHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${currentTopMargin})`);

        const groupedData = d3.group(data, d => d[xKey]);
        const stack = d3.stack()
            .keys(groups)
            .value((d, key) => {
                const entry = d[1].find(item => item[groupKey] === key);
                return entry ? entry[yKey] : 0;
            });

        const stackedData = stack(Array.from(groupedData).sort((a,b) => d3.ascending(a[0], b[0])));

        const xScale = d3.scaleLinear()
            .domain(d3.extent(Array.from(groupedData.keys()).map(k => +k)))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(stackedData, layer => d3.max(layer, d => d[1]))])
            .range([chartDrawingHeight, 0])
            .nice();

        const color = d3.scaleOrdinal().domain(groups).range(colorScale);

        const area = d3.area()
            .x(d => xScale(d.data[0]))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]))
            .curve(d3.curveMonotoneX);

        const paths = svg.selectAll('.area-path')
            .data(stackedData)
            .enter()
            .append('path')
            .attr('class', 'area-path')
            .attr('d', area)
            .style('fill', (d) => color(d.key))
            .style('opacity', 0.8);

        const xAxis = d3.axisBottom(xScale)
            .ticks(Math.min(24, (xScale.domain()[1] - xScale.domain()[0] || 0) +1 )) 
            .tickFormat(d => {
                if (d === 0) return '12 AM'; if (d === 12) return '12 PM';
                return d < 12 ? `${d} AM` : `${d - 12} PM`;
            });

        svg.append('g')
            .attr('transform', `translate(0,${chartDrawingHeight})`)
            .call(xAxis)
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em').attr('dy', '.15em').attr('transform', 'rotate(-45)');

        svg.append('g').call(d3.axisLeft(yScale));

        if (xAxisLabel) {
            svg.append('text')
                .attr('transform', `translate(${width/2}, ${chartDrawingHeight + margin.bottom -5 + (xScale.domain()[1] > 12 ? 10 : 0) })`)
                .style('text-anchor', 'middle').text(xAxisLabel);
        }

        if (yAxisLabel) {
            svg.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('y', -margin.left + 15).attr('x', -(chartDrawingHeight / 2))
                .style('text-anchor', 'middle').text(yAxisLabel);
        }

        if (showLegend) {
            const legendGroup = d3.select(svgRef.current).select("g")
                .insert('g', ':first-child')
                .attr('class', 'legend-group')
                .attr('font-family', 'sans-serif')
                .attr('font-size', 10)
                .attr('text-anchor', 'start');

            const legend = legendGroup.selectAll('.legend-item')
                .data(groups)
                .enter()
                .append('g')
                .attr('class', 'legend-item')
                .attr('transform', (d, i) => {
                    if (legendPosition === 'top') {
                        const col = i % legendItemsPerRow;
                        const row = Math.floor(i / legendItemsPerRow);
                        const itemWidth = (width / legendItemsPerRow);
                        return `translate(${col * itemWidth}, ${row * legendItemHeight + legendPadding})`;
                    } else if (legendPosition === 'bottom') {
                        const col = i % legendItemsPerRow;
                        const row = Math.floor(i / legendItemsPerRow);
                        const itemWidth = (width / legendItemsPerRow);
                        return `translate(${col * itemWidth}, ${chartDrawingHeight + currentBottomMargin - legendHeight + row * legendItemHeight + legendPadding})`;
                    } else {
                        return `translate(${width + 10},${i * legendItemHeight})`;
                    }
                });

            legend.append('rect')
                .attr('x', 0).attr('width', 19).attr('height', 19).attr('fill', color);
            legend.append('text')
                .attr('x', 24).attr('y', 9.5).attr('dy', '0.32em').text(d => d);
        }
        
        const tooltip = d3.select("body").append("div")
            .attr("class", "stacked-area-tooltip")
            .style("position", "absolute").style("visibility", "hidden")
            .style("background-color", "white").style("border", "solid")
            .style("border-width", "1px").style("border-radius", "5px")
            .style("padding", "10px").style("font-size", "12px")
            .style("pointer-events", "none");

        const bisectDate = d3.bisector(d => d.data[0]).left;
        const focusLine = svg.append("line")
            .attr("class", "focus-line").style("stroke", "black")
            .style("stroke-dasharray", "3,3").style("opacity", 0);

        svg.append("rect")
            .attr("class", "overlay").attr("width", width).attr("height", chartDrawingHeight)
            .style("fill", "none").style("pointer-events", "all")
            .on("mouseover", () => { 
                tooltip.style("visibility", "visible");
                focusLine.style("opacity", 1);
                paths.style("opacity", 0.5);
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
                focusLine.style("opacity", 0);
                paths.style("opacity", 0.8);
            })
            .on("mousemove", function(event) {
                const pointer = d3.pointer(event, this);
                const mouseX = pointer[0];
                const mouseY = pointer[1];
                const x0 = xScale.invert(mouseX);
                
                let closestHour = Math.round(x0);
                const domain = xScale.domain();
                if (closestHour < domain[0]) closestHour = domain[0];
                if (closestHour > domain[1]) closestHour = domain[1];

                focusLine.attr("x1", xScale(closestHour)).attr("y1", 0)
                         .attr("x2", xScale(closestHour)).attr("y2", chartDrawingHeight);

                let tooltipContent = `<strong>Hour: ${closestHour === 0 ? '12 AM' : (closestHour === 12 ? '12 PM' : (closestHour < 12 ? `${closestHour} AM` : `${closestHour - 12} PM`))}</strong><br/>`;
                let totalForHour = 0;
                const hoveredLayerData = [];

                stackedData.forEach(layer => {
                    const dataPointIndex = bisectDate(layer, closestHour, 0, layer.length -1 );
                    const d0 = layer[dataPointIndex -1];
                    const d1 = layer[dataPointIndex];
                    let d = null;
                    if(d0 && d1){
                        d = (closestHour - d0.data[0] > d1.data[0] - closestHour) ? d1 : d0;
                    } else if (d0) {
                        d = d0;
                    } else if (d1) {
                        d = d1;
                    } else { return; }
                    
                    if (d && d.data[0] === closestHour) {
                        const crimeType = layer.key;
                        const value = d[1] - d[0];
                        totalForHour += value;
                        hoveredLayerData.push({ crimeType, value, yPos: (yScale(d[0]) + yScale(d[1])) / 2 });
                    }
                });
                
                let hoveredCrime = null;
                let minDistance = Infinity;
                hoveredLayerData.forEach(item => {
                    const distance = Math.abs(item.yPos - mouseY);
                    if (distance < minDistance) {
                        minDistance = distance;
                        hoveredCrime = item;
                    }
                });
                
                paths.style('opacity', d => d.key === hoveredCrime?.crimeType ? 1 : 0.3);

                if (hoveredCrime) {
                    tooltipContent += `<span style="color:${color(hoveredCrime.crimeType)};">●</span> ${hoveredCrime.crimeType}: ${hoveredCrime.value.toFixed(0)}<br/>`;
                }
                tooltipContent += `Total Incidents: ${totalForHour.toFixed(0)}`;

                tooltip.html(tooltipContent)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            });

        return () => { tooltip.remove(); };

    }, [data, margin, xKey, yKey, groupKey, colorScale, transitionDuration, showLegend, legendPosition, xAxisLabel, yAxisLabel]);

    return (
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    );
};

export default StackedAreaChart; 
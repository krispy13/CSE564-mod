import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const StackedAreaChart = ({
    data,
    margin = { top: 40, right: 30, bottom: 50, left: 60 },
    xKey = 'hour_of_day',
    yKey = 'incident_count',
    groupKey = 'crime_type',
    colorScale = d3.schemeSet2,
    showLegend = true,
    legendPosition = 'top',
    xAxisLabel = '',
    yAxisLabel = '',
    selectedBorough = null,
    onBoroughSelect = null
}) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !data.length) return;

        // Debug log to check data structure
        if (groupKey === 'borough') {
            console.log('StackedAreaChart - Initial data sample:', data.slice(0, 2));
            console.log('StackedAreaChart - Current selected borough:', selectedBorough);
        }

        // Filter data if borough is selected (case-insensitive)
        const filteredData = selectedBorough 
            ? data.filter(d => d.borough && d.borough.toLowerCase() === selectedBorough.toLowerCase())
            : data;

        if (groupKey === 'borough') {
            console.log('StackedAreaChart - Filtered data length:', filteredData.length);
        }

        if (filteredData.length === 0) {
            // Handle empty data case
            const svg = d3.select(svgRef.current);
            svg.selectAll('*').remove();
            svg.append('text')
                .attr('x', svgRef.current.clientWidth / 2)
                .attr('y', svgRef.current.clientHeight / 2)
                .attr('text-anchor', 'middle')
                .style('fill', '#a9b1d6')
                .text(`No data available${selectedBorough ? ` for ${selectedBorough}` : ''}`);
            return;
        }

        d3.select(svgRef.current).selectAll('*').remove();

        const legendItemHeight = 15;
        const legendPadding = 5;
        const legendItemsPerRow = 5;
        
        // Get all unique boroughs for the legend and sort them in reverse order
        const allGroups = [...new Set(data.map(d => d[groupKey]))].sort((a,b) => d3.ascending(a,b));
        let legendHeight = 0;
        let legendWidthAdjustment = 0;

        if (showLegend) {
            if (legendPosition === 'top' || legendPosition === 'bottom') {
                const numRows = Math.ceil(allGroups.length / legendItemsPerRow);
                legendHeight = numRows * legendItemHeight + (numRows > 0 ? legendPadding : 0);
            } else if (legendPosition === 'right') {
                legendWidthAdjustment = 100;
            }
        }

        let currentTopMargin = margin.top - legendHeight;
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

        const groupedData = d3.group(filteredData, d => d[xKey]);
        const stack = d3.stack()
            .keys([...new Set(filteredData.map(d => d[groupKey]))])
            .value((d, key) => {
                const entry = d[1].find(item => item[groupKey] === key);
                return entry ? entry[yKey] : 0;
            })
            .order(d3.stackOrderReverse);

        const stackedData = stack(Array.from(groupedData).sort((a,b) => d3.ascending(a[0], b[0])));

        if (groupKey === 'borough') {
            console.log('StackedAreaChart - Stacked data structure:', 
                stackedData.map(d => ({ key: d.key, dataPoints: d.length }))
            );
        }

        // Debug logs for data structure
        console.log('Stacked Data Structure:', stackedData);
        console.log('First stacked item:', stackedData[0]);

        const xScale = d3.scaleLinear()
            .domain(d3.extent(Array.from(groupedData.keys()).map(k => +k)))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, selectedBorough ? 1000 : d3.max(stackedData, layer => d3.max(layer, d => d[1]))])
            .range([chartDrawingHeight, 0])
            .nice();

        const area = d3.area()
            .x(d => xScale(d.data[0]))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]))
            .curve(d3.curveMonotoneX);

        // Add data points with animation
        const paths = svg.selectAll('.area-path')
            .data(stackedData)
            .enter()
            .append('path')
            .attr('class', 'area-path')
            .attr('d', area)
            .style('fill', (d) => {
                return typeof colorScale === 'function' ? colorScale(d.key) : colorScale[stackedData.indexOf(d) % colorScale.length];
            })
            .style('cursor', 'pointer')
            .style('opacity', 0);

        // Animate each path
        paths.each(function(d, i) {
            const path = d3.select(this);
            const totalLength = path.node().getTotalLength();
            
            path
                .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
                .attr("stroke-dashoffset", totalLength)
                .style("opacity", 1)
                .transition()
                .duration(1500)
                .delay(i * 100)
                .ease(d3.easeLinear)
                .attr("stroke-dashoffset", 0)
                .on("end", function() {
                    // Remove the stroke properties after animation
                    path.attr("stroke-dasharray", null)
                        .attr("stroke-dashoffset", null);
                });
        });

        paths.on('click', function(event, d) {  // Use function to get correct 'this' context
            event.stopPropagation();
            if (groupKey === 'borough') {
                console.log('StackedAreaChart - Area clicked:', {
                    key: d.key,
                    currentlySelected: selectedBorough,
                    willSelect: selectedBorough && selectedBorough.toLowerCase() === d.key.toLowerCase() ? null : d.key
                });

                // Highlight the clicked path
                const path = d3.select(this);
                path.style('stroke', '#000')
                    .style('stroke-width', '2px');
                
                // Only handle borough selection if groupKey is 'borough'
                if (onBoroughSelect) {
                    const boroughName = d.key;
                    if (selectedBorough && selectedBorough.toLowerCase() === boroughName.toLowerCase()) {
                        onBoroughSelect(null);
                        // Remove highlight
                        path.style('stroke', null)
                            .style('stroke-width', null);
                    } else {
                        onBoroughSelect(boroughName);
                        // Remove highlight from other paths
                        svg.selectAll('.area-path')
                            .style('stroke', null)
                            .style('stroke-width', null);
                        // Add highlight to selected path
                        path.style('stroke', '#000')
                            .style('stroke-width', '2px');
                    }
                }
            }
        });

        // Add background rect for deselection
        svg.insert('rect', ':first-child')
            .attr('class', 'background')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', width)
            .attr('height', chartDrawingHeight)
            .style('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', () => {
                if (groupKey === 'borough') {
                    console.log('StackedAreaChart - Background clicked, deselecting borough');
                    // Remove highlight from all paths
                    svg.selectAll('.area-path')
                        .style('stroke', null)
                        .style('stroke-width', null);
                }
                // Only handle deselection if groupKey is 'borough'
                if (onBoroughSelect && selectedBorough && groupKey === 'borough') {
                    onBoroughSelect(null);
                }
            });

        // Add axes with consistent text color
        svg.append('g')
            .attr('transform', `translate(0,${chartDrawingHeight})`)
            .call(d3.axisBottom(xScale)
                .ticks(width > 600 ? 24 : 12)
                .tickFormat(d => d))
            .call(g => {
                g.selectAll('text')
                    .style('fill', '#a9b1d6')
                    .style('font-size', '12px');
                g.selectAll('line')
                    .style('stroke', '#2f334d');
                g.select('.domain')
                    .style('stroke', '#2f334d');
            });

        svg.append('g')
            .call(d3.axisLeft(yScale))
            .call(g => {
                g.selectAll('text')
                    .style('fill', '#a9b1d6')
                    .style('font-size', '12px');
                g.selectAll('line')
                    .style('stroke', '#2f334d');
                g.select('.domain')
                    .style('stroke', '#2f334d');
            });

        if (xAxisLabel) {
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', chartDrawingHeight + 40)
                .attr('text-anchor', 'middle')
                .style('fill', '#a9b1d6')
                .text(xAxisLabel);
        }

        if (yAxisLabel) {
            svg.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('x', -chartDrawingHeight / 2)
                .attr('y', -40)
                .attr('text-anchor', 'middle')
                .style('fill', '#a9b1d6')
                .text(yAxisLabel);
        }

        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .style('fill', '#a9b1d6')
            .text(selectedBorough ? `${selectedBorough} Crime Distribution` : 'NYC Crime Distribution by Time');

        if (showLegend) {
            const legendGroup = d3.select(svgRef.current).select("g")
                .insert('g', ':first-child')
                .attr('class', 'legend-group')
                .attr('font-family', 'sans-serif')
                .attr('font-size', 10)
                .attr('text-anchor', 'start');

            const legend = legendGroup.selectAll('.legend-item')
                .data(allGroups)
                .enter()
                .append('g')
                .attr('class', 'legend-item')
                .style('cursor', 'pointer')
                .attr('transform', (d, i) => {
                    if (legendPosition === 'top') {
                        const col = i % legendItemsPerRow;
                        const row = Math.floor(i / legendItemsPerRow);
                        const itemWidth = Math.floor(width / legendItemsPerRow);
                        return `translate(${col * itemWidth + 5}, ${row * (legendItemHeight + 2) - 5})`;
                    } else if (legendPosition === 'bottom') {
                        const col = i % legendItemsPerRow;
                        const row = Math.floor(i / legendItemsPerRow);
                        const itemWidth = Math.floor(width / legendItemsPerRow);
                        return `translate(${col * itemWidth + 5}, ${chartDrawingHeight + currentBottomMargin - legendHeight + row * (legendItemHeight + 2)})`;
                    } else {
                        return `translate(${width + 15},${i * (legendItemHeight + 2)})`;
                    }
                });

            legend.append('rect')
                .attr('x', 0)
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', d => typeof colorScale === 'function' ? colorScale(d) : colorScale[allGroups.indexOf(d) % colorScale.length]);

            legend.append('text')
                .attr('x', 16)
                .attr('y', 9)
                .style('font-size', '10px')
                .style('fill', '#a9b1d6')
                .text(d => d);
        }
        
        const tooltip = d3.select("body").append("div")
            .attr("class", "stacked-area-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "#24283b")
            .style("border", "1px solid #2f334d")
            .style("border-width", "1px")
            .style("border-radius", "5px")
            .style("padding", "10px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("color", "#a9b1d6");

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
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
                focusLine.style("opacity", 0);
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
                const hoveredLayerData = [];
                let totalForHour = 0;
                
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

                if (hoveredCrime) {
                    tooltipContent += `<span style="color:${typeof colorScale === 'function' ? colorScale(hoveredCrime.crimeType) : colorScale[allGroups.indexOf(hoveredCrime.crimeType) % colorScale.length]};">●</span> ${hoveredCrime.crimeType}: ${hoveredCrime.value.toFixed(0)}<br/>`;
                }
                tooltipContent += `Total Incidents: ${totalForHour.toFixed(0)}`;

                tooltip.html(tooltipContent)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            });

        return () => { tooltip.remove(); };

    }, [data, selectedBorough]);

    return (
        <svg 
            ref={svgRef} 
            style={{ width: '100%', height: '100%' }}
            className={selectedBorough ? 'filtered-view' : ''}
        />
    );
};

export default StackedAreaChart; 
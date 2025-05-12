import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const SunburstChart = ({
    data,
    width = 600,
    height = 600,
    margin = { top: 10, right: 10, bottom: 10, left: 10 },
    maxDepth = 2, // Represents the number of rings to show in any view
    transitionDuration = 750,
    selectedBorough = null,  // Add selectedBorough prop
    onBoroughSelect = null  // Add onBoroughSelect prop
}) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !data.children) return;

        d3.select(svgRef.current).selectAll('*').remove();

        const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;
        
        const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([3, 5]);
        
        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);
        
        const partition = dataIn => {
            const rootNode = d3.hierarchy(dataIn)
                .sum(d => d.value || 0) // Ensure value is non-negative for sum
                .sort((a, b) => b.value - a.value);
            return d3.partition().size([2 * Math.PI, radius])(rootNode);
        };
        
        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => Math.max(0, d.y0)) // Ensure non-negative radius
            .outerRadius(d => Math.max(0, d.y1 - 1)); // Ensure non-negative radius
        
        const tooltipDiv = d3.select('body')
            .append('div')
            .attr('class', 'sunburst-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'white')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px')
            .style('padding', '8px')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
            .style('font-size', '12px')
            .style('pointer-events', 'none');
        
        const root = partition(data);
        let currentZoomTarget = root;

        root.each(d => {
            d.originalX0 = d.x0; d.originalX1 = d.x1;
            d.originalY0 = d.y0; d.originalY1 = d.y1;
            // Initialize current state for transitions
            d.current = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
            // Assign a unique ID if not present, for D3 key functions
            if (!d.id) d.id = d.originalX0 + "-" + d.originalY0 + "-" + (d.data.name || 'node');
        });

        // Function to find a node by borough name
        const findBoroughNode = (node, boroughName) => {
            if (!node || !boroughName) return null;
            if (node.depth === 1 && node.data.name.toLowerCase() === boroughName.toLowerCase()) {
                return node;
            }
            if (node.children) {
                for (let child of node.children) {
                    const found = findBoroughNode(child, boroughName);
                    if (found) return found;
                }
            }
            return null;
        };

        const getArcFill = d => {
            if (d.depth === 3) return colorScale(d.data.rating);
            if (d.depth === 2) {
                const avgRating = d.children ? d3.mean(d.children, child => child.data.rating) : 4.0;
                return colorScale(avgRating);
            }
            const avgRating = d.children ? d3.mean(d.children.flatMap(child => child.children ? child.children.map(c => c.data.rating) : [])) : 4.0;
            return colorScale(avgRating);
        };

        const isDescendantOrSelf = (node, potentialAncestor) => {
            if (!node || !potentialAncestor) return false;
            if (node === potentialAncestor) return true;
            let L = node.parent;
            while (L) {
                if (L === potentialAncestor) return true;
                L = L.parent;
            }
            return false;
        };
        
        function arcVisible(targetCoords) {
            return targetCoords.x1 > targetCoords.x0 + 1e-7 && 
                   targetCoords.y1 > targetCoords.y0 + 1e-7 && 
                   targetCoords.y0 < radius - 1e-7 &&
                   targetCoords.x0 >= 0 && targetCoords.x1 <= 2 * Math.PI + 1e-7; 
        }

        function labelVisible(targetCoords) {
            return arcVisible(targetCoords) && (targetCoords.y1 - targetCoords.y0) * (targetCoords.x1 - targetCoords.x0) > 0.015; 
        }

        function labelTransform(currentCoords) {
            const x = (currentCoords.x0 + currentCoords.x1) / 2 * 180 / Math.PI;
            const y = (currentCoords.y0 + currentCoords.y1) / 2;
            if (isNaN(x) || isNaN(y)) return 'translate(0,0) rotate(0)'; // Fallback for NaN
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        }
        
        const centerText = svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', '#333')
            .style('font-size', '10px')
            .style('pointer-events', 'none');

        function updateCenterText() {
            centerText.text(currentZoomTarget === root ? "Overview" : (currentZoomTarget.parent ? "Up" : "Root"));
        }
        updateCenterText(); // Initial text

        function clicked(_event, clickedArcOrRoot) {
            let newP;
            if (clickedArcOrRoot === root) {
                newP = root;
                // Notify parent component when zooming out to root
                if (onBoroughSelect && currentZoomTarget !== root) {
                    onBoroughSelect(null);
                }
            } else if (clickedArcOrRoot === currentZoomTarget && clickedArcOrRoot.parent) {
                newP = clickedArcOrRoot.parent;
                // Notify parent component when zooming out
                if (onBoroughSelect && clickedArcOrRoot.depth === 1) {
                    onBoroughSelect(null);
                }
            } else {
                newP = clickedArcOrRoot;
                // Notify parent component when clicking on a borough
                if (onBoroughSelect && clickedArcOrRoot.depth === 1) {
                    onBoroughSelect(clickedArcOrRoot.data.name);
                }
            }
            
            if (currentZoomTarget === newP && newP === root && clickedArcOrRoot === root && _event && _event.type === 'click') {
                return; // No change if already at root and center is clicked again
            } else if (currentZoomTarget === newP) {
                return; // No change if target is already the current one
            }

            // Store the previous target for transition calculation
            const previousTarget = currentZoomTarget;
            currentZoomTarget = newP;
            updateCenterText();

            // Calculate the transition duration based on depth change
            const depthChange = Math.abs((previousTarget?.depth || 0) - (currentZoomTarget?.depth || 0));
            const transitionTime = transitionDuration * (depthChange || 1);

            root.each(d => {
                let targetX0, targetX1, targetY0, targetY1;
                const p = currentZoomTarget;

                if (p === root) {
                    // When zooming out to root, use original coordinates
                    targetX0 = d.originalX0;
                    targetX1 = d.originalX1;
                    targetY0 = d.originalY0;
                    targetY1 = d.originalY1;
                } else {
                    const pOriginalAngleSpan = p.originalX1 - p.originalX0;

                    if (pOriginalAngleSpan < 1e-7) {
                        if (d === p) {
                            targetX0 = 0;
                            targetX1 = 2 * Math.PI;
                        } else {
                            targetX0 = d.originalX0; targetX1 = d.originalX0;
                        }
                    } else {
                        targetX0 = (d.originalX0 - p.originalX0) / pOriginalAngleSpan * 2 * Math.PI;
                        targetX1 = (d.originalX1 - p.originalX0) / pOriginalAngleSpan * 2 * Math.PI;
                    }
                    
                    targetX0 = Math.max(0, Math.min(2 * Math.PI, targetX0));
                    targetX1 = Math.max(targetX0, Math.min(2 * Math.PI, targetX1));

                    const relativeDepth = d.depth - p.depth;
                    
                    // Show only current level and one level deeper
                    if (isDescendantOrSelf(d, p) && (relativeDepth === 0 || relativeDepth === 1)) {
                        targetY0 = relativeDepth * (radius / 2);
                        targetY1 = (relativeDepth + 1) * (radius / 2);
                    } else {
                        targetY0 = radius; targetY1 = radius;
                        if (targetX1 <= targetX0 + 1e-7) {
                            targetY0 = d.current.y0; targetY1 = d.current.y0;
                        }
                    }
                }

                // Store the starting position for the transition
                d.current = d.current || { x0: d.originalX0, x1: d.originalX1, y0: d.originalY0, y1: d.originalY1 };
                d.target = { x0: targetX0, x1: targetX1, y0: targetY0, y1: targetY1 };
            });

            const t = svg.transition()
                .duration(transitionTime)
                .ease(d3.easeCubicInOut); // Add easing for smoother transition

            // Update paths with transition
            path.transition(t)
                .tween("data", dNode => {
                    const i = d3.interpolate(dNode.current, dNode.target);
                    return time => {
                        dNode.current = i(time);
                        return dNode.current;
                    };
                })
                .attr("fill-opacity", dNode => {
                    const p = currentZoomTarget;
                    const relativeDepth = dNode.depth - p.depth;
                    if (isDescendantOrSelf(dNode, p) && (relativeDepth === 0 || relativeDepth === 1)) {
                        return arcVisible(dNode.target) ? (getArcFill(dNode) ? 1 : 0.7) : 0;
                    }
                    return 0;
                })
                .attr("pointer-events", dNode => {
                    const p = currentZoomTarget;
                    const relativeDepth = dNode.depth - p.depth;
                    if (isDescendantOrSelf(dNode, p) && (relativeDepth === 0 || relativeDepth === 1) && arcVisible(dNode.target)) {
                        return 'auto';
                    }
                    return 'none';
                })
                .attrTween("d", dNode => () => arc(dNode.current) || "M0,0");

            // Update labels with transition
            label.transition(t)
                .attr("fill-opacity", dNode => {
                    const p = currentZoomTarget;
                    const relativeDepth = dNode.depth - p.depth;
                    if (isDescendantOrSelf(dNode, p) && (relativeDepth === 0 || relativeDepth === 1)) {
                        return labelVisible(dNode.target) ? 1 : 0;
                    }
                    return 0;
                })
                .attr("pointer-events", "none")
                .attrTween("transform", dNode => () => labelTransform(dNode.current));

            // Fade center text
            centerText.transition(t)
                .style("opacity", 0)
                .transition()
                .duration(transitionTime / 2)
                .style("opacity", 1);
        }
        
        // Bind all descendants that have depth > 0
        const allDescendants = root.descendants().filter(d => d.depth > 0);

        const path = svg.append('g')
            .selectAll('path')
            .data(allDescendants, d => d.id) // Use unique ID as key
            .join('path')
            .attr('fill', d => getArcFill(d) || "#ccc") // Fallback fill
            .attr('fill-opacity', dNode => {
                const p = currentZoomTarget; // initially root
                const relativeDepth = dNode.depth - p.depth;
                if (isDescendantOrSelf(dNode, p) && relativeDepth >= 0 && relativeDepth < maxDepth) {
                    return arcVisible(dNode.current) ? 1 : 0;
                }
                return 0;
            })
            .attr('pointer-events', dNode => {
                const p = currentZoomTarget;
                const relativeDepth = dNode.depth - p.depth;
                 if (isDescendantOrSelf(dNode, p) && relativeDepth >= 0 && relativeDepth < maxDepth && arcVisible(dNode.current)) {
                    return 'auto';
                }
                return 'none';
            })
            .attr('d', dNode => arc(dNode.current) || "M0,0") // Fallback for arc
            .style('cursor', 'pointer')
            .on('click', clicked)
            .on('mouseover', function(event, dNode) {
                if (!arcVisible(dNode.current)) return;
                let content = '';
                if (dNode.depth === 3) {
                    content = `<strong>${dNode.data.name}</strong><br>Rating: ${dNode.data.rating}`;
                } else if (dNode.depth === 2) {
                    const avgRating = dNode.children ? d3.mean(dNode.children, child => child.data.rating).toFixed(1) : 'N/A';
                    content = `<strong>${dNode.data.name}</strong><br>Avg Rating: ${avgRating}`;
                } else {
                    const avgRating = dNode.children ? d3.mean(dNode.children.flatMap(child => child.children ? child.children.map(c => c.data.rating) : [])).toFixed(1) : 'N/A';
                    content = `<strong>${dNode.data.name}</strong><br>Avg Rating: ${avgRating}`;
                }
                tooltipDiv.style('visibility', 'visible').html(content)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
                d3.select(this).style('opacity', 0.8);
            })
            .on('mousemove', function(event) {
                tooltipDiv.style('left', (event.pageX + 10) + 'px')
                          .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                tooltipDiv.style('visibility', 'hidden');
                d3.select(this).style('opacity', 1);
            });
        
        const label = svg.append('g')
            .selectAll('text')
            .data(allDescendants, d => d.id) // Use unique ID as key
            .join('text')
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .attr('transform', dNode => labelTransform(dNode.current))
            .attr('fill-opacity', dNode => {
                const p = currentZoomTarget; // initially root
                const relativeDepth = dNode.depth - p.depth;
                 if (isDescendantOrSelf(dNode, p) && relativeDepth >= 0 && relativeDepth < maxDepth) {
                    return labelVisible(dNode.current) ? 1 : 0;
                }
                return 0;
            })
            .attr('dy', '0.35em')
            .attr('font-size', dNode => dNode.depth === 1 ? '10px' : '8px')
            .text(dNode => dNode.data.name)
            .each(function(dNode) {
                const self = d3.select(this);
                if (!labelVisible(dNode.current) || !(+self.attr('fill-opacity'))) {
                    self.text(''); return;
                }
                let textLength = self.node().getComputedTextLength();
                let text = self.text();
                const arcWidth = (dNode.current.x1 - dNode.current.x0) * ( (dNode.current.y0 + dNode.current.y1) / 2 );
                const arcHeight = dNode.current.y1 - dNode.current.y0;
                const availableSpace = Math.min(arcWidth * 0.8, arcHeight * 2) ; // Adjusted heuristic

                if (textLength > availableSpace) {
                    let newText = text;
                    while (textLength > availableSpace && newText.length > 3) {
                        newText = newText.slice(0, -2) + '...'; 
                        self.text(newText);
                        textLength = self.node().getComputedTextLength();
                        if (newText.length <= 3 && newText !== "...") break; 
                    }
                    if (textLength > availableSpace) self.text(""); // Hide if still too long
                }
            });
        
        svg.append('circle')
            .attr('r', radius * 0.15) 
            .attr('fill', 'white') 
            .attr('stroke', '#ccc')
            .attr('pointer-events', 'all')
            .attr('cursor', 'pointer')
            .on('click', (event) => clicked(event, root));
        
        svg.append('text')
            .attr('x', 0)
            .attr('y', -height / 2 + margin.top + 5) 
            .attr('text-anchor', 'middle')
            .style('font-size', '14px') 
            .style('font-weight', 'bold')
            .text('NYC Restaurant Ratings');

        // Handle initial borough selection if any
        if (selectedBorough) {
            const targetNode = findBoroughNode(root, selectedBorough);
            if (targetNode) {
                clicked(null, targetNode);
            }
        }
        
        return () => {
            tooltipDiv.remove();
            // Any other cleanup, e.g. d3.select(svgRef.current).selectAll('*').remove(); if not handled by effect re-run
        };
    }, [data, width, height, margin, maxDepth, transitionDuration, selectedBorough, onBoroughSelect]); // Add selectedBorough and onBoroughSelect to dependencies

    return (
        <div className="sunburst-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
            <svg
                ref={svgRef}
                style={{
                    width: '100%',
                    height: '100%',
                    overflow: 'visible' 
                }}
            />
        </div>
    );
};

export default SunburstChart; 
import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';

export default function GeoMap({ onBoroughSelect, selectedBorough }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const containerRef = useRef(null);

  // Animation durations
  const TRANSITION_DURATION = 750;
  const HOVER_DURATION = 200;

  // Borough color mapping for consistent visualization with softer colors on dark background
  const boroughColors = {
    'MANHATTAN': '#7AA2F7', // Soft blue
    'BROOKLYN': '#F27649', // Warm orange
    'QUEENS': '#BB9AF7', // Soft purple
    'BRONX': '#F7768E', // Soft pink
    'STATEN ISLAND': '#73DACA' // Cyan
  };

  // Case-insensitive borough color getter
  const getBoroughColor = (borough) => {
    if (!borough) return '#2f334d'; // Darker gray for unselected
    const upperBorough = borough.toUpperCase();
    return boroughColors[upperBorough] || '#2f334d';
  };

  // Case-insensitive borough comparison
  const isSameBorough = (borough1, borough2) => {
    if (!borough1 || !borough2) return false;
    return borough1.toUpperCase() === borough2.toUpperCase();
  };

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (data && containerRef.current) {
        updateVisualization();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  // Fetch GeoJSON data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:8000/nta_geo');
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        const jsonData = await response.json();
        
        if (!jsonData.type || !jsonData.features || !Array.isArray(jsonData.features)) {
          throw new Error("Invalid GeoJSON data structure");
        }

        setData(jsonData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update visualization function
  const updateVisualization = () => {
    if (!data || !containerRef.current) return;

    // Clear any existing SVG and tooltips
    d3.select(containerRef.current).selectAll("svg").remove();
    d3.select("body").selectAll(".tooltip").remove();

    // Create tooltip div with transition
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("font-size", "12px")
      .style("box-shadow", "2px 2px 6px rgba(0, 0, 0, 0.2)")
      .style("pointer-events", "none")
      .style("z-index", "1000"); // Ensure tooltip is always on top

    // Get container dimensions
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Calculate the bounds of the data
    const bounds = d3.geoBounds(data);
    const [[x0, y0], [x1, y1]] = bounds;
    const dataWidth = x1 - x0;
    const dataHeight = y1 - y0;
    const dataAspectRatio = dataWidth / dataHeight;
    const containerAspectRatio = width / height;

    // Determine dimensions to maintain aspect ratio with vertical stretch
    let finalWidth = width;
    let finalHeight = height;
    
    // Apply a vertical stretch factor
    const stretchFactor = 1.5; // Increase this value to stretch more vertically
    
    if (dataAspectRatio > containerAspectRatio) {
      // Data is wider than container
      finalHeight = (width / dataAspectRatio) * stretchFactor;
    } else {
      // Data is taller than container
      finalWidth = (height * dataAspectRatio) / stretchFactor;
    }

    // Create SVG container
    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${finalWidth} ${finalHeight}`)
      .style("background-color", "#24283b"); // Dark blue-gray background

    // Add title
    svg.append('text')
      .attr('x', finalWidth/2 - finalWidth * 0.3)
      .attr('y', finalHeight * 0.025 - finalHeight * 0.10)
      .attr('text-anchor', 'middle')
      .attr('class', 'visualization-title')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('font-family', 'system-ui, -apple-system, sans-serif')
      .style('fill', '#a9b1d6')
      .text(selectedBorough ? `${selectedBorough} Neighborhood Map` : 'NYC Neighborhood Map');

    // Create container for map features
    const mapGroup = svg.append("g")
      .attr("transform", `translate(0, -${finalHeight * 0.1})`)
      .style("opacity", isInitialRender ? 0 : 1);

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([1, 1.5])  // Allow just a bit more zoom for manual interaction
      .on('zoom', (event) => {
        mapGroup.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Function to zoom to a feature
    const zoomToFeature = (d) => {
      const bounds = path.bounds(d);
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const x = (bounds[0][0] + bounds[1][0]) / 2;
      const y = (bounds[0][1] + bounds[1][1]) / 2;
      
      // Use a very mild scale factor (0.2) and add padding to ensure the whole neighborhood is visible
      const scale = 0.3 / Math.max(dx / finalWidth, dy / finalHeight);
      const boundedScale = Math.min(scale, 1.2); // Ensure we don't zoom in too much
      const translate = [
        finalWidth / 2 - boundedScale * x,
        finalHeight / 2 - boundedScale * y
      ];

      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity
          .translate(translate[0], translate[1])
          .scale(boundedScale));
    };

    // Function to reset zoom
    const resetZoom = () => {
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
    };

    // Create a projection that fits the data
    const projection = d3.geoIdentity()
      .reflectY(true)
      .fitSize([finalWidth, finalHeight], data);

    // Create path generator
    const path = d3.geoPath().projection(projection);

    // Draw features with enter animation
    const regions = mapGroup.selectAll("path")
      .data(data.features)
      .enter()
      .append("path")
      .attr("d", path)
      .style("opacity", 0) // Start with opacity 0 for all updates
      .attr("fill", d => {
        const borough = d.properties.BoroName;
        // Highlight selected borough
        if (isSameBorough(selectedBorough, borough)) {
          return d3.color(getBoroughColor(borough)).brighter(0.3);
        }
        return getBoroughColor(borough);
      })
      .attr("stroke", "#2f334d") // Darker border color
      .attr("stroke-width", d => {
        const borough = d.properties.BoroName;
        return isSameBorough(selectedBorough, borough) ? 2 : 1;
      })
      .style("cursor", "pointer");

    // Always animate regions with staggered delay
    regions.transition()
      .duration(300)
      .delay((d, i) => {
        // Longer delay for initial render, shorter for updates
        const baseDelay = isInitialRender ? 10 : 5;
        return i * baseDelay;
      })
      .style("opacity", 1);

    // Add interactions
    regions.on("mouseover", function(event, d) {
        const borough = d.properties.BoroName;
        const ntaName = d.properties.NTAName;
        
        if (!isSameBorough(borough, selectedBorough)) {  // Only highlight if not selected
          d3.select(this)
            .transition()
            .duration(50)
            .attr("stroke-width", 2)
            .attr("fill", d3.color(getBoroughColor(borough)).brighter(0.5));
        }
        
        // Calculate tooltip position to prevent going off-screen
        const tooltipWidth = 200; // Approximate width
        const tooltipHeight = 80; // Approximate height
        const x = event.pageX + tooltipWidth > window.innerWidth 
          ? event.pageX - tooltipWidth - 10 
          : event.pageX + 10;
        const y = event.pageY + tooltipHeight > window.innerHeight
          ? event.pageY - tooltipHeight - 10
          : event.pageY + 10;
        
        tooltip
          .style("visibility", "visible")
          .html(`
            <strong>${ntaName}</strong><br/>
            Borough: ${borough}
            ${isSameBorough(selectedBorough, borough) ? '<br/><em>(Selected)</em>' : ''}
          `)
          .style("left", x + "px")
          .style("top", y + "px");
      })
      .on("mousemove", function(event) {
        // Calculate tooltip position on move
        const tooltipWidth = 200;
        const tooltipHeight = 80;
        const x = event.pageX + tooltipWidth > window.innerWidth 
          ? event.pageX - tooltipWidth - 10 
          : event.pageX + 10;
        const y = event.pageY + tooltipHeight > window.innerHeight
          ? event.pageY - tooltipHeight - 10
          : event.pageY + 10;
        
        tooltip
          .style("left", x + "px")
          .style("top", y + "px");
      })
      .on("mouseout", function(event, d) {
        const borough = d.properties.BoroName;
        
        if (!isSameBorough(borough, selectedBorough)) {  // Only restore if not selected
          d3.select(this)
            .transition()
            .duration(50)
            .attr("stroke-width", 1)
            .attr("fill", getBoroughColor(borough));
        }
        
        tooltip.style("visibility", "hidden");
      })
      .on("click", function(event, d) {
        const borough = d.properties.BoroName;
        
        if (isSameBorough(selectedBorough, borough)) {
          onBoroughSelect(null);
          resetZoom();
        } else {
          onBoroughSelect(borough);
          zoomToFeature(d);
        }
      });

    // Update all regions when selection changes
    regions.each(function(d) {
      const borough = d.properties.BoroName;
      if (isSameBorough(borough, selectedBorough)) {
        d3.select(this)
          .attr("stroke-width", 2)
          .attr("fill", d3.color(getBoroughColor(borough)).brighter(0.3));
      }
    });

    // If there's a selected borough on mount/update, zoom to it
    if (selectedBorough && !isInitialRender) {
      const selectedFeature = data.features.find(d => 
        isSameBorough(d.properties.BoroName, selectedBorough)
      );
      if (selectedFeature) {
        zoomToFeature(selectedFeature);
      }
    }

    // Add a legend with animation
    const legendPadding = 10;
    const legendGroup = svg.append("g")
      .attr("transform", `translate(${legendPadding}, ${legendPadding})`)
      .style("opacity", isInitialRender ? 0 : 1);

    // Add white background to legend
    legendGroup.append("rect")
      .attr("width", 120)
      .attr("height", Object.keys(boroughColors).length * 20 + legendPadding * 2)
      .attr("fill", "#24283b") // Dark background for legend
      .attr("opacity", 0.9)
      .attr("rx", 5)
      .attr("stroke", "#2f334d") // Border color
      .attr("stroke-width", 1);

    // Add legend items with faster staggered animation
    const legend = legendGroup.append("g")
      .attr("transform", `translate(${legendPadding}, ${legendPadding})`);

    Object.entries(boroughColors).forEach(([borough, color], i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`)
        .style("opacity", isInitialRender ? 0 : 1);

      legendRow.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", color);

      legendRow.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .style("font-size", "12px")
        .style("fill", "#a9b1d6") // Softer text color
        .text(borough);

      // Animate each legend row faster only on initial render
      if (isInitialRender) {
        legendRow.transition()
          .duration(300)
          .delay(i * 20)
          .style("opacity", 1);
      }
    });

    // Fade in the legend only on initial render
    legendGroup.style("opacity", isInitialRender ? 0 : 1);
    if (isInitialRender) {
      legendGroup.transition()
        .duration(300)
        .style("opacity", 1);
    }

    // Set isInitialRender to false after first render
    setIsInitialRender(false);
  };

  // Set up D3 visualization
  useEffect(() => {
    updateVisualization();
  }, [data, selectedBorough]);

  if (loading) {
    return (
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        style={{ minHeight: '500px', backgroundColor: '#24283b' }}
      >
        <p className="text-[#787c99]">Loading map data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        ref={containerRef}
        className="w-full h-full flex flex-col items-center justify-center"
        style={{ minHeight: '500px', backgroundColor: '#24283b' }}
      >
        <p className="text-[#a9b1d6] mb-2 font-bold">Error loading map data:</p>
        <p className="text-[#a9b1d6]">{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-[#7aa2f7] text-white rounded hover:bg-[#81A1C1]"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '500px', backgroundColor: '#24283b' }}
    >
      {selectedBorough && (
        <div 
          className="absolute top-4 right-4 bg-[#24283b] p-2 rounded shadow border border-[#2f334d]"
          style={{ zIndex: 1000 }}
        >
          <span className="text-[#a9b1d6]">Selected: {selectedBorough}</span>
          <button 
            onClick={() => {
              onBoroughSelect(null);
            }}
            className="ml-2 px-2 py-1 text-sm bg-[#7aa2f7] text-white rounded hover:bg-[#81A1C1]"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
} 
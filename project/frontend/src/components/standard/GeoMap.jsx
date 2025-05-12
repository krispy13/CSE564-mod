import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';

export default function GeoMap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBorough, setSelectedBorough] = useState(null);
  const [selectedNTA, setSelectedNTA] = useState(null);
  const containerRef = useRef(null);

  // Animation durations
  const TRANSITION_DURATION = 750;
  const HOVER_DURATION = 200;

  // Color scale for boroughs
  const boroughColors = {
    'Manhattan': '#1f77b4',
    'Brooklyn': '#2ca02c',
    'Queens': '#ff7f0e',
    'Bronx': '#d62728',
    'Staten Island': '#9467bd'
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
        console.log('Sample feature properties:', jsonData.features[0].properties);
        
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
      .style("pointer-events", "none");

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

    // Create SVG container with initial scale animation
    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${finalWidth} ${finalHeight}`)
      .style("background-color", "#e6f3ff");

    // Create container for map features with initial animation
    const mapGroup = svg.append("g")
      .attr("transform", `translate(0, -${finalHeight * 0.1})`)
      .style("opacity", 0);

    // Fade in the map
    mapGroup.transition()
      .duration(10)
      .style("opacity", 1);

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
      .style("opacity", 0)
      .attr("fill", d => {
        const borough = d.properties.BoroName;
        // Highlight selected borough
        if (selectedBorough === borough) {
          return d3.color(boroughColors[borough]).brighter(0.3);
        }
        return boroughColors[borough] || '#ccc';
      })
      .attr("stroke", "white")
      .attr("stroke-width", d => {
        const borough = d.properties.BoroName;
        return selectedBorough === borough ? 2 : 1;
      })
      .style("cursor", "pointer");  // Add pointer cursor

    // Animate regions appearing
    regions.transition()
      .duration(300)
      .delay((d, i) => i * 10)
      .style("opacity", 1);

    // Add interactions
    regions.on("mouseover", function(event, d) {
        const borough = d.properties.BoroName;
        const ntaName = d.properties.NTAName;
        
        if (borough !== selectedBorough) {  // Only highlight if not selected
          d3.select(this)
            .transition()
            .duration(50)
            .attr("stroke-width", 2)
            .attr("fill", d3.color(boroughColors[borough]).brighter(0.5));
        }
        
        tooltip
          .style("visibility", "visible")
          .html(`
            <strong>${ntaName}</strong><br/>
            Borough: ${borough}
            ${selectedBorough === borough ? '<br/><em>(Selected)</em>' : ''}
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function(event, d) {
        const borough = d.properties.BoroName;
        
        if (borough !== selectedBorough) {  // Only restore if not selected
          d3.select(this)
            .transition()
            .duration(50)
            .attr("stroke-width", 1)
            .attr("fill", boroughColors[borough] || '#ccc');
        }
        
        tooltip.style("visibility", "hidden");
      })
      .on("click", function(event, d) {
        const borough = d.properties.BoroName;
        const ntaName = d.properties.NTAName;
        
        // Toggle selection
        if (selectedBorough === borough) {
          setSelectedBorough(null);
          setSelectedNTA(null);
        } else {
          setSelectedBorough(borough);
          setSelectedNTA(ntaName);
        }
      });

    // Update all regions when selection changes
    regions.each(function(d) {
      const borough = d.properties.BoroName;
      if (borough === selectedBorough) {
        d3.select(this)
          .attr("stroke-width", 2)
          .attr("fill", d3.color(boroughColors[borough]).brighter(0.3));
      }
    });

    // Add a legend with animation
    const legendPadding = 10;
    const legendGroup = svg.append("g")
      .attr("transform", `translate(${legendPadding}, ${legendPadding})`)
      .style("opacity", 0);

    // Add white background to legend
    legendGroup.append("rect")
      .attr("width", 120)
      .attr("height", Object.keys(boroughColors).length * 20 + legendPadding * 2)
      .attr("fill", "white")
      .attr("opacity", 0.9)
      .attr("rx", 5);

    // Add legend items with faster staggered animation
    const legend = legendGroup.append("g")
      .attr("transform", `translate(${legendPadding}, ${legendPadding})`);

    Object.entries(boroughColors).forEach(([borough, color], i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`)
        .style("opacity", 0);

      legendRow.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", color);

      legendRow.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .style("font-size", "12px")
        .text(borough);

      // Animate each legend row faster
      legendRow.transition()
        .duration(300)
        .delay(i * 20)  // Reduced stagger delay
        .style("opacity", 1);
    });

    // Fade in the legend
    legendGroup.transition()
      .duration(300)
      .style("opacity", 1);
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
        style={{ minHeight: '500px' }}
      >
        <p className="text-gray-500">Loading map data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        ref={containerRef}
        className="w-full h-full flex flex-col items-center justify-center"
        style={{ minHeight: '500px' }}
      >
        <p className="text-red-500 mb-2 font-bold">Error loading map data:</p>
        <p className="text-red-500">{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
      style={{ minHeight: '500px' }}
    >
      {selectedBorough && (
        <div 
          className="absolute top-4 right-4 bg-white p-2 rounded shadow"
          style={{ zIndex: 1000 }}
        >
          Selected: {selectedNTA} ({selectedBorough})
          <button 
            onClick={() => {
              setSelectedBorough(null);
              setSelectedNTA(null);
            }}
            className="ml-2 px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
} 
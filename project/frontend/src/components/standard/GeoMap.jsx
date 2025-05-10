import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function GeoMap({ margin = { top: 20, right: 20, bottom: 20, left: 20 } }) {
  const svgRef = useRef();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8000/nta_geo');
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const jsonData = await response.json();
        console.log("Received GeoJSON data:", jsonData.type, "with", jsonData.features?.length || 0, "features");
        setData(jsonData);
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!data || !data.features || data.features.length === 0) {
      console.error("No valid GeoJSON data to render");
      return;
    }

    console.log("Rendering map with", data.features.length, "features");

    // Get the container dimensions
    const container = d3.select(svgRef.current.parentNode);
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = container.node().getBoundingClientRect().height - margin.top - margin.bottom;

    console.log("Container dimensions:", width, "x", height);

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create main SVG with margins
    svg.attr('width', width + margin.left + margin.right)
       .attr('height', height + margin.top + margin.bottom);

    // Create map group with margin transform
    const mapGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    try {
      // Create a color scale based on boroughs
      const boroughs = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
      const colorScale = d3.scaleOrdinal()
        .domain(boroughs)
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']);

      // Create a simple projection and path generator
      const projection = d3.geoAlbers();
      
      // Directly fit the projection to our container size
      // This is the most reliable way to ensure the map fits properly
      projection.fitSize([width, height], data);
      
      const path = d3.geoPath().projection(projection);

      // Draw a border around the SVG for debugging
      svg.append("rect")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("fill", "none")
        .attr("stroke", "#ddd");

      // Create tooltip
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("padding", "8px")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("z-index", "1000")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");
        
      // Add neighborhoods
      const paths = mapGroup.selectAll('path')
        .data(data.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', d => {
          try {
            return colorScale(d.properties.BoroName);
          } catch (e) {
            console.error("Error applying fill for feature:", d, e);
            return "#ccc"; // Default color
          }
        })
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 0.5)
        .attr('class', 'neighborhood');

      console.log("Rendered paths:", paths.size());
      
      // Check first few paths to make sure they're visible
      paths.each(function(d, i) {
        if (i < 5) {
          const bbox = this.getBBox();
          if (bbox && bbox.width > 0 && bbox.height > 0) {
            console.log(`Path ${i} bounding box:`, bbox);
          }
        }
      });
      
      // Add interaction
      paths.on('mouseover', function(event, d) {
          // Highlight the neighborhood
          d3.select(this)
            .attr('stroke-width', 2)
            .attr('stroke', '#000');
          
          // Show tooltip
          tooltip
            .style("visibility", "visible")
            .html(`
              <strong>${d.properties.NTAName || 'Unknown'}</strong><br>
              NTA Code: ${d.properties.NTACode || 'N/A'}<br>
              Borough: ${d.properties.BoroName || 'Unknown'}
            `);
        })
        .on('mousemove', function(event) {
          // Position tooltip near mouse
          tooltip
            .style("top", (event.pageY - 10) + "px")
            .style("left", (event.pageX + 10) + "px");
        })
        .on('mouseout', function() {
          // Reset the neighborhood appearance
          d3.select(this)
            .attr('stroke-width', 0.5)
            .attr('stroke', '#ffffff');
          
          // Hide tooltip
          tooltip.style("visibility", "hidden");
        });

      // Add title
      svg.append('text')
        .attr('x', width / 2 + margin.left)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text('NYC Neighborhoods');

      // Add legend
      const legendX = 10;
      const legendY = height - 130;
      const legendGroup = svg.append('g')
        .attr('transform', `translate(${legendX + margin.left}, ${legendY + margin.top})`);
      
      boroughs.forEach((borough, i) => {
        legendGroup.append('rect')
          .attr('x', 0)
          .attr('y', i * 20)
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', colorScale(borough));
        
        legendGroup.append('text')
          .attr('x', 20)
          .attr('y', i * 20 + 12)
          .attr('font-size', '10px')
          .text(borough);
      });

      // Clean up on unmount
      return () => {
        tooltip.remove();
      };
    } catch (err) {
      console.error("Error rendering map:", err);
      mapGroup.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'red')
        .text('Error rendering map');
    }
  }, [data, margin]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-gray-500">Loading map data...</p></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-full"><p className="text-red-500">Error loading map: {error}</p></div>;
  }

  if (!data || !data.features || data.features.length === 0) {
    return <div className="flex items-center justify-center h-full"><p className="text-red-500">No valid geographic data available</p></div>;
  }

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" style={{ minHeight: '300px' }}></svg>
    </div>
  );
}

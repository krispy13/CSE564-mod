import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';

export default function GeoMap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

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
        console.log('Fetched GeoJSON data:', jsonData);
        
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

  // Set up D3 visualization
  useEffect(() => {
    if (!data || !containerRef.current) return;

    console.log('Drawing map with data:', data);

    // Clear any existing SVG
    d3.select(containerRef.current).selectAll("svg").remove();

    // Get container dimensions
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Create SVG container
    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background-color", "#f0f0f0");

    // Create a simple projection
    const projection = d3.geoIdentity()
      .reflectY(true)
      .fitSize([width, height], data);

    // Create path generator
    const path = d3.geoPath().projection(projection);

    // Draw features
    svg.selectAll("path")
      .data(data.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", "#69b3a2")
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("fill", "#2E8B57")
          .attr("stroke-width", 2);
        
        console.log('Feature data:', d);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("fill", "#69b3a2")
          .attr("stroke-width", 1);
      });

    // Log bounds information
    const bounds = path.bounds(data);
    console.log('Path bounds:', bounds);
    
  }, [data]);

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
    />
  );
} 
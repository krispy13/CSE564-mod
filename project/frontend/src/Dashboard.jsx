import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import StackedAreaChart from './components/standard/StackedAreaChart';
import SunburstChart from './components/standard/SunburstChart';
import GeoMap from './components/standard/GeoMap';
import PCP from './components/nonStandard/PCP';
import LineBarChart from './components/standard/LineBar';
import { data_overall } from './data/data_pcp.js';
import {
    overallCitywideLineData,
    bronxLineData,
    brooklynLineData,
    manhattanLineData,
    queensLineData,
    statenIslandLineData
} from './data/data_line.js';

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
    if (!borough) return '#F27649'; // Warm orange when no borough selected
    const upperBorough = borough.toUpperCase();
    return boroughColors[upperBorough] || '#F27649';
};

export default function Dashboard() {
    const [crimeData, setCrimeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restaurantData, setRestaurantData] = useState(null);
    const [loadingRestaurants, setLoadingRestaurants] = useState(true);
    const [selectedBorough, setSelectedBorough] = useState(null);

    // Define PCP dimensions
    const pcpDimensions = [
        { name: "price", label: "Price" },
        { name: "number of reviews", label: "Number of Reviews" },
        { name: "review rate number", label: "Review Rate" },
        { name: "availability 365", label: "Availability (Days)" },
    ];

    // Process PCP data to handle borough selection
    const getFilteredPCPData = () => {
        if (!selectedBorough) return data_overall;
        return data_overall.filter(d => 
            d["neighbourhood group"].toUpperCase() === selectedBorough.toUpperCase()
        );
    };

    // Handle PCP borough selection
    const handlePCPBoroughSelect = (category) => {
        if (!category) {
            setSelectedBorough(null);
            return;
        }
        // Convert from "neighbourhood group" format to dashboard format
        const boroughName = category.toUpperCase();
        setSelectedBorough(boroughName);
    };

    // Fetch crime data from backend
    useEffect(() => {
        const fetchCrimeData = async () => {
            try {
                const response = await fetch('http://localhost:8000/crime_data');
                const data = await response.json();
                setCrimeData(data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching crime data:', error);
                setLoading(false);
            }
        };

        fetchCrimeData();
    }, []);

    // Fetch restaurant data for sunburst chart
    useEffect(() => {
        const fetchRestaurantData = async () => {
            try {
                const response = await fetch('http://localhost:8000/sunburst_data');
                const data = await response.json();
                setRestaurantData(data);
                setLoadingRestaurants(false);
            } catch (error) {
                console.error('Error fetching restaurant data:', error);
                setLoadingRestaurants(false);
            }
        };

        fetchRestaurantData();
    }, []);

    // Process crime data for borough chart
    const processCrimeDataForBoroughChart = (data) => {
        if (!data || data.length === 0) return [];

        // Debug log to check unique boroughs in the data
        const uniqueBoroughs = new Set(data.map(d => d.borough));
        console.log('Available boroughs:', Array.from(uniqueBoroughs));

        const aggregatedByBoroughHour = d3.rollup(
            data,
            v => d3.sum(v, d => d.incident_count), // Sum incident_count
            d => d.hour_of_day, // Group by hour
            d => d.borough // Then by borough
        );

        const processed = [];
        aggregatedByBoroughHour.forEach((boroughMap, hour_of_day) => {
            boroughMap.forEach((incident_count, borough) => {
                processed.push({
                    hour_of_day: +hour_of_day, // ensure hour is a number
                    borough,
                    incident_count
                });
            });
        });

        return processed;
    };

    const processedDataForBoroughChart = processCrimeDataForBoroughChart(crimeData);

    // Add this function to process line data based on selected borough
    const getLineDataForBorough = (selectedBorough) => {
        if (!selectedBorough) return overallCitywideLineData;
        switch (selectedBorough.toUpperCase()) {
            case 'BRONX':
                return bronxLineData;
            case 'BROOKLYN':
                return brooklynLineData;
            case 'MANHATTAN':
                return manhattanLineData;
            case 'QUEENS':
                return queensLineData;
            case 'STATEN ISLAND':
                return statenIslandLineData;
            default:
                return overallCitywideLineData;
        }
    };

    return (
        <div className="h-screen bg-[#1a1b26] flex flex-col">
            {/* Minimal header */}
            <header className="p-2 h-12">
                <h1 className="text-xl font-semibold text-[#a9b1d6]">Data Visualization Dashboard</h1>
            </header>

            {/* Main grid with fixed height calculations */}
            <main className="grid grid-cols-3 grid-rows-2 gap-2 p-2 h-[calc(100vh-6rem)]">
                {/* Each chart container needs to be sized relative to its space */}
                <div className="bg-[#24283b] rounded-md shadow-lg border border-[#2f334d] p-3 flex flex-col h-full">
                    <h3 className="text-sm font-medium text-[#ffffff] mb-1">NYC Neighborhoods</h3>
                    <div className="flex-1 w-full h-[calc(100%-2rem)]">
                        <GeoMap 
                            onBoroughSelect={setSelectedBorough} 
                            selectedBorough={selectedBorough}
                            colorScale={boroughColors}
                        />
                    </div>
                </div>

                <div className="bg-[#24283b] rounded-md shadow-lg border border-[#2f334d] p-3 flex flex-col h-full">
                    <h3 className="text-sm font-medium text-[#ffffff] mb-1">NYC Restaurant Ratings</h3>
                    <div className="flex-1 w-full h-[calc(100%-2rem)]">
                        {loadingRestaurants ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-[#787c99]">Loading restaurant data...</p>
                            </div>
                        ) : (
                            <SunburstChart
                                data={restaurantData}
                                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                maxDepth={2}
                                transitionDuration={600}
                                selectedBorough={selectedBorough}
                                onBoroughSelect={setSelectedBorough}
                                colorScale={getBoroughColor}
                            />
                        )}
                    </div>
                </div>

                <div className="bg-[#24283b] rounded-md shadow-lg border border-[#2f334d] p-3 flex flex-col h-full">
                    <h3 className="text-sm font-medium text-[#ffffff] mb-1">
                        Airbnb Listing Characteristics
                        {selectedBorough && (
                            <span className="ml-2 text-[#7aa2f7]">(Filtered: {selectedBorough})</span>
                        )}
                    </h3>
                    <div className="flex-1 w-full h-[calc(100%-2rem)]">
                        <PCP
                            data={getFilteredPCPData()}
                            dimensions={pcpDimensions}
                            colorByCategory={true}
                            categoryAttribute="neighbourhood group"
                            title=""
                            showLabels={false}
                            lineOpacity={0.3}
                            showCentroids={true}
                            onCategorySelect={handlePCPBoroughSelect}
                            colorScale={getBoroughColor}
                        />
                    </div>
                </div>

                <div className="bg-[#24283b] rounded-md shadow-lg border border-[#2f334d] p-3 flex flex-col h-full">
                    <h3 className="text-sm font-medium text-[#ffffff] mb-1">
                        NYC Crime Trends by Borough
                        {selectedBorough && (
                            <span className="ml-2 text-[#7aa2f7]">(Filtered: {selectedBorough})</span>
                        )}
                    </h3>
                    <div className="flex-1 w-full h-[calc(100%-2rem)]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-[#787c99]">Loading crime data...</p>
                            </div>
                        ) : (
                            <StackedAreaChart
                                data={processedDataForBoroughChart}
                                margin={{ top: 30, right: 30, bottom: 60, left: 70 }}
                                xKey="hour_of_day"
                                yKey="incident_count"
                                groupKey="borough"
                                colorScale={getBoroughColor}
                                showLegend={true}
                                legendPosition="top"
                                xAxisLabel="Hour of Day"
                                yAxisLabel="Number of Crimes"
                                selectedBorough={selectedBorough}
                                onBoroughSelect={setSelectedBorough}
                            />
                        )}
                    </div>
                </div>

                <div className="bg-[#24283b] rounded-md shadow-lg border border-[#2f334d] p-3 flex flex-col h-full">
                    <h3 className="text-sm font-medium text-[#ffffff] mb-1">
                        Environmental Metrics
                        {selectedBorough && (
                            <span className="ml-2 text-[#7aa2f7]">(Filtered: {selectedBorough})</span>
                        )}
                    </h3>
                    <div className="flex-1 w-full h-[calc(100%-2rem)]">
                        <LineBarChart
                            data={getLineDataForBorough(selectedBorough).map(d => ({
                                label: d.label,
                                barValue: d.value,
                                lineValue: d.value
                            }))}
                            selectedBorough={selectedBorough}
                            onBoroughSelect={setSelectedBorough}
                            barColor={selectedBorough ? getBoroughColor(selectedBorough) : "#2F334D"}
                            lineColor={selectedBorough ? getBoroughColor(selectedBorough) : "#7aa2f7"}
                            hoverColor="#F27649"
                        />
                    </div>
                </div>

                <div className="bg-[#24283b] rounded-md shadow-lg border border-[#2f334d] p-3 flex flex-col h-full">
                    <h3 className="text-lg font-medium text-[#ffffff] mb-2">Welcome to NYC Explorer!</h3>
                    <div className="flex-1">
                        <p className="mb-3 text-[#787c99]">
                            Discover NYC neighborhoods through our interactive visualizations:
                        </p>
                        <ul className="space-y-1.5 text-[#787c99]">
                            <li className="flex items-start">
                                <span className="text-[#7aa2f7] mr-2">•</span>
                                <span><span className="font-medium text-[#ffffff]">Interactive Map:</span> Click boroughs to explore local data</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-[#7aa2f7] mr-2">•</span>
                                <span><span className="font-medium text-[#ffffff]">Dining:</span> Find top-rated restaurants by cuisine</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-[#7aa2f7] mr-2">•</span>
                                <span><span className="font-medium text-[#ffffff]">Stays:</span> Compare Airbnb prices and reviews</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-[#7aa2f7] mr-2">•</span>
                                <span><span className="font-medium text-[#ffffff]">Safety:</span> View crime patterns by time and area</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-[#7aa2f7] mr-2">•</span>
                                <span><span className="font-medium text-[#ffffff]">Environment:</span> Check area comfort metrics</span>
                            </li>
                        </ul>
                        <p className="mt-3 text-sm text-[#7aa2f7] font-medium">
                            💡 Tip: Click any borough to focus all charts on that area!
                        </p>
                    </div>
                </div>
            </main>

            {/* Minimal footer */}
            <footer className="p-2 h-12">
                <p className="text-center text-[#565f89] text-xs">
                    &copy; {new Date().getFullYear()} NYC Explorer. All rights reserved.
                </p>
            </footer>
        </div>
    );
}
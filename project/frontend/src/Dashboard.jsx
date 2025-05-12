import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import StackedAreaChart from './components/standard/StackedAreaChart';
import SunburstChart from './components/standard/SunburstChart';
import GeoMap from './components/standard/GeoMap';
import PCP from './components/nonStandard/PCP';
import { data_overall } from './data/data_pcp.js';

// Borough color mapping for consistent visualization
const boroughColors = {
    'MANHATTAN': '#1f77b4',
    'BROOKLYN': '#2ca02c',
    'QUEENS': '#ff7f0e',
    'BRONX': '#d62728',
    'STATEN ISLAND': '#9467bd'
};

// Case-insensitive borough color getter
const getBoroughColor = (borough) => {
    if (!borough) return '#ccc';
    const upperBorough = borough.toUpperCase();
    return boroughColors[upperBorough] || '#ccc';
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

    return (
        <div className="h-screen bg-slate-100 p-4 font-sans flex flex-col overflow-hidden">
            {/* Simple Header */}
            <header className="mb-2 flex-shrink-0">
                <h1 className="text-xl font-medium text-gray-800">Data Visualization Dashboard</h1>
            </header>

            {/* Main Content - Chart Grid */}
            <main className="flex-1 grid grid-cols-3 grid-rows-2 gap-3 min-h-0">
                {/* Chart 1 - NYC Neighborhoods Map */}
                <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3 flex flex-col overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-700 mb-1 flex-shrink-0">NYC Neighborhoods</h3>
                    <div className="flex-1 min-h-0">
                        <GeoMap onBoroughSelect={setSelectedBorough} selectedBorough={selectedBorough} />
                    </div>
                </div>

                {/* Chart 2 - Restaurant Sunburst Chart */}
                <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3 flex flex-col overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-700 mb-1 flex-shrink-0">NYC Restaurant Ratings</h3>
                    <div className="flex-1 min-h-0">
                        {loadingRestaurants ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500">Loading restaurant data...</p>
                            </div>
                        ) : (
                            <SunburstChart
                                data={restaurantData}
                                margin={{ top: 30, right: 30, bottom: 40, left: 40 }}
                                maxDepth={2}
                                transitionDuration={600}
                                selectedBorough={selectedBorough}
                                onBoroughSelect={setSelectedBorough}
                            />
                        )}
                    </div>
                </div>

                {/* Chart 3 - Parallel Coordinates Plot */}
                <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3 flex flex-col overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-700 mb-1 flex-shrink-0">
                        Airbnb Listing Characteristics
                        {selectedBorough && (
                            <span className="ml-2 text-blue-600">
                                (Filtered: {selectedBorough})
                            </span>
                        )}
                    </h3>
                    <div className="flex-1 min-h-0">
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
                            colorScale={(borough) => getBoroughColor(borough)}
                        />
                    </div>
                </div>

                {/* Chart 4 - Stacked Area Chart by Borough */}
                <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3 flex flex-col overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-700 mb-1 flex-shrink-0">
                        NYC Crime Trends by Borough
                        {selectedBorough && (
                            <span className="ml-2 text-blue-600">
                                (Filtered: {selectedBorough})
                            </span>
                        )}
                    </h3>
                    <div className="flex-1 min-h-0">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500">Loading crime data...</p>
                            </div>
                        ) : (
                            <StackedAreaChart
                                data={processedDataForBoroughChart}
                                margin={{ top: 30, right: 30, bottom: 60, left: 50 }}
                                xKey="hour_of_day"
                                yKey="incident_count"
                                groupKey="borough"
                                colorScale={d => getBoroughColor(d)}
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

                {/* Chart 5 - Empty Cell for 2x3 Grid */}
                <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3 flex flex-col overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-700 mb-1 flex-shrink-0">Future Visualization</h3>
                    <div className="flex-1 min-h-0 flex items-center justify-center">
                        <p className="text-gray-400">Space available for additional chart</p>
                    </div>
                </div>

                {/* Chart 6 - Empty Cell for 2x3 Grid */}
                <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3 flex flex-col overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-700 mb-1 flex-shrink-0">Future Visualization</h3>
                    <div className="flex-1 min-h-0 flex items-center justify-center">
                        <p className="text-gray-400">Space available for additional chart</p>
                    </div>
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="mt-2 text-gray-400 text-xs flex-shrink-0">
                <p>Last updated: April 5, 2025</p>
            </footer>
        </div>
    );
}
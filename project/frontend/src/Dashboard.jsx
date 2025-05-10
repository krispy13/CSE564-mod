import { useState, useEffect } from 'react';
import BarChart from './components/standard/BarChart';
import PieChart from './components/standard/PieChart';
import * as d3 from 'd3';
import LinePlot from './components/standard/LinePlot';
import Scatterplot from './components/standard/Scatterplot';
import ScatterplotMatrix from './components/standard/ScatterplotMatrix';
import MDS from './components/nonStandard/MDS';
import PCA from './components/nonStandard/PCA';
import MCA from './components/nonStandard/MCA';
import PCP from './components/nonStandard/PCP';
import StackedAreaChart from './components/standard/StackedAreaChart';
import SunburstChart from './components/standard/SunburstChart';
import GeoMap from './components/standard/GeoMap';

export default function Dashboard() {
    const [crimeData, setCrimeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restaurantData, setRestaurantData] = useState(null);
    const [loadingRestaurants, setLoadingRestaurants] = useState(true);

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

    // Bar Chart
    const BarData = [
        { label: 'January', value: 65 },
        { label: 'February', value: 59 },
        { label: 'March', value: 80 },
        { label: 'April', value: 81 },
        { label: 'May', value: 56 },
        { label: 'June', value: 55 },
    ];

    const _pieData = [
        { label: 'Direct', value: 35 },
        { label: 'Organic Search', value: 25 },
        { label: 'Referral', value: 20 },
        { label: 'Social', value: 15 },
        { label: 'Email', value: 5 },
    ];

    const _lineData = [
        { label: 'Jan', value: 10 },
        { label: 'Feb', value: 25 },
        { label: 'Mar', value: 15 },
        { label: 'Apr', value: 30 },
        { label: 'May', value: 45 },
        { label: 'Jun', value: 35 },
        { label: 'Jul', value: 55 },
        { label: 'Aug', value: 50 },
    ];

    const _scatterData = [
        { label: 'A', x: 10, y: 40 },
        { label: 'B', x: 20, y: 30 },
        { label: 'C', x: 30, y: 20 },
        { label: 'D', x: 40, y: 60 },
        { label: 'E', x: 50, y: 50 },
        { label: 'F', x: 60, y: 40 },
        { label: 'G', x: 70, y: 30 },
        { label: 'H', x: 80, y: 65 },
        { label: 'I', x: 90, y: 55 },
        { label: 'J', x: 100, y: 45 },
    ];

    const _matrixData = [
        { label: 'A', sales: 200, profit: 15, growth: 10, cost: 80 },
        { label: 'B', sales: 150, profit: 20, growth: 15, cost: 60 },
        { label: 'C', sales: 300, profit: 25, growth: 5, cost: 120 },
        { label: 'D', sales: 250, profit: 10, growth: 20, cost: 90 },
        { label: 'E', sales: 100, profit: 18, growth: 25, cost: 40 },
        { label: 'F', sales: 230, profit: 22, growth: 12, cost: 110 },
        { label: 'G', sales: 180, profit: 16, growth: 18, cost: 85 },
        { label: 'H', sales: 400, profit: 30, growth: 8, cost: 140 },
    ];
    const _matrixDimensions = ['sales', 'profit', 'growth', 'cost'];

    const _mdsData = [
        { label: "Product A", x: -2.5, y: 1.2, category: "Electronics" },
        { label: "Product B", x: -2.2, y: -0.8, category: "Electronics" },
        { label: "Product C", x: -1.8, y: 1.7, category: "Electronics" },
        { label: "Product D", x: -0.5, y: 2.4, category: "Furniture" },
        { label: "Product E", x: 0.3, y: 1.8, category: "Furniture" },
        { label: "Product F", x: 0.8, y: 1.2, category: "Furniture" },
        { label: "Product G", x: 1.5, y: -0.7, category: "Apparel" },
        { label: "Product H", x: 2.0, y: -1.5, category: "Apparel" },
        { label: "Product I", x: 2.3, y: 0.5, category: "Apparel" },
        { label: "Product J", x: 1.2, y: -2.1, category: "Apparel" },
        { label: "Product K", x: -1.0, y: -1.5, category: "Electronics" },
        { label: "Product L", x: -0.2, y: -2.0, category: "Furniture" }
    ];

    const _pcaData = [
        { label: "Item 1", pc1: 2.1, pc2: 1.5, category: "Group A" },
        { label: "Item 2", pc1: 1.8, pc2: -0.5, category: "Group A" },
        { label: "Item 3", pc1: 2.5, pc2: 0.8, category: "Group A" },
        { label: "Item 4", pc1: -0.2, pc2: 1.9, category: "Group B" },
        { label: "Item 5", pc1: -0.9, pc2: 1.2, category: "Group B" },
        { label: "Item 6", pc1: -1.5, pc2: 1.5, category: "Group B" },
        { label: "Item 7", pc1: -2.0, pc2: -0.8, category: "Group C" },
        { label: "Item 8", pc1: -1.7, pc2: -1.3, category: "Group C" },
        { label: "Item 9", pc1: -1.9, pc2: -0.5, category: "Group C" },
        { label: "Item 10", pc1: 0.5, pc2: -1.8, category: "Group D" },
        { label: "Item 11", pc1: 1.2, pc2: -1.5, category: "Group D" },
        { label: "Item 12", pc1: 0.8, pc2: -2.0, category: "Group D" }
    ];

    // Feature vectors showing the contribution of original features to PCs
    const _pcaFeatures = [
        { feature: "Feature 1", pc1: 0.8, pc2: 0.1 },
        { feature: "Feature 2", pc1: 0.7, pc2: -0.5 },
        { feature: "Feature 3", pc1: -0.2, pc2: 0.9 },
        { feature: "Feature 4", pc1: -0.5, pc2: 0.7 }
    ];

    const _mcaData = [
        { label: "Person 1", dim1: 1.2, dim2: 0.8, category: "Segment A", attributes: ["Young", "Urban", "High Income"] },
        { label: "Person 2", dim1: 1.5, dim2: 1.1, category: "Segment A", attributes: ["Young", "Urban", "High Income"] },
        { label: "Person 3", dim1: 0.9, dim2: 0.7, category: "Segment A", attributes: ["Young", "Urban", "Medium Income"] },
        { label: "Person 4", dim1: -0.2, dim2: 1.3, category: "Segment B", attributes: ["Middle Age", "Urban", "High Income"] },
        { label: "Person 5", dim1: -0.5, dim2: 1.0, category: "Segment B", attributes: ["Middle Age", "Urban", "Medium Income"] },
        { label: "Person 6", dim1: -0.8, dim2: 0.6, category: "Segment B", attributes: ["Middle Age", "Urban", "Low Income"] },
        { label: "Person 7", dim1: -1.2, dim2: -0.4, category: "Segment C", attributes: ["Senior", "Rural", "Medium Income"] },
        { label: "Person 8", dim1: -1.5, dim2: -0.7, category: "Segment C", attributes: ["Senior", "Rural", "Low Income"] },
        { label: "Person 9", dim1: -1.3, dim2: -0.5, category: "Segment C", attributes: ["Senior", "Rural", "Low Income"] },
        { label: "Person 10", dim1: 0.5, dim2: -1.0, category: "Segment D", attributes: ["Young", "Rural", "Medium Income"] },
        { label: "Person 11", dim1: 0.8, dim2: -1.3, category: "Segment D", attributes: ["Young", "Rural", "Low Income"] },
        { label: "Person 12", dim1: 0.3, dim2: -0.9, category: "Segment D", attributes: ["Middle Age", "Rural", "Low Income"] }
    ];

    // Variable categories plotted in the same correspondence space
    const _mcaVariables = [
        // Age categories
        { variable: "Age", category: "Young", dim1: 0.9, dim2: -0.3 },
        { variable: "Age", category: "Middle Age", dim1: -0.4, dim2: 0.5 },
        { variable: "Age", category: "Senior", dim1: -1.4, dim2: -0.6 },

        // Location categories
        { variable: "Location", category: "Urban", dim1: 0.5, dim2: 1.1 },
        { variable: "Location", category: "Rural", dim1: -0.6, dim2: -1.0 },

        // Income categories
        { variable: "Income", category: "High Income", dim1: 0.7, dim2: 1.3 },
        { variable: "Income", category: "Medium Income", dim1: 0.2, dim2: 0.1 },
        { variable: "Income", category: "Low Income", dim1: -0.8, dim2: -0.9 }
    ];

    // Sample data for Parallel Coordinate Plot
    const PCPData = [
        {
            id: 1,
            category: "Electronics",
            price: 1200,
            rating: 4.5,
            stockLevel: 85,
            salesPerMonth: 120,
            weight: 2.3,
            label: "Laptop Pro X"
        },
        {
            id: 2,
            category: "Electronics",
            price: 800,
            rating: 4.2,
            stockLevel: 42,
            salesPerMonth: 90,
            weight: 1.8,
            label: "Tablet Ultra"
        },
        {
            id: 3,
            category: "Home Goods",
            price: 350,
            rating: 4.0,
            stockLevel: 120,
            salesPerMonth: 65,
            weight: 8.5,
            label: "Coffee Maker"
        },
        {
            id: 4,
            category: "Fashion",
            price: 120,
            rating: 3.8,
            stockLevel: 200,
            salesPerMonth: 150,
            weight: 0.4,
            label: "Designer Jeans"
        },
        {
            id: 5,
            category: "Home Goods",
            price: 550,
            rating: 4.7,
            stockLevel: 35,
            salesPerMonth: 30,
            weight: 12.6,
            label: "Stand Mixer"
        },
        {
            id: 6,
            category: "Electronics",
            price: 950,
            rating: 3.9,
            stockLevel: 60,
            salesPerMonth: 75,
            weight: 0.8,
            label: "Smartphone X2"
        },
        {
            id: 7,
            category: "Fashion",
            price: 80,
            rating: 4.1,
            stockLevel: 300,
            salesPerMonth: 220,
            weight: 0.3,
            label: "T-Shirt Premium"
        },
        {
            id: 8,
            category: "Home Goods",
            price: 220,
            rating: 4.3,
            stockLevel: 75,
            salesPerMonth: 45,
            weight: 5.2,
            label: "Blender Pro"
        },
        {
            id: 9,
            category: "Electronics",
            price: 1500,
            rating: 4.8,
            stockLevel: 20,
            salesPerMonth: 40,
            weight: 3.1,
            label: "Gaming PC"
        },
        {
            id: 10,
            category: "Fashion",
            price: 250,
            rating: 4.4,
            stockLevel: 90,
            salesPerMonth: 85,
            weight: 0.5,
            label: "Leather Jacket"
        }
    ];

    const pcpDimensions = [
        { name: "price", label: "Price ($)" },
        { name: "rating", label: "Rating" },
        { name: "stockLevel", label: "Stock Level" },
        { name: "salesPerMonth", label: "Monthly Sales" },
        { name: "weight", label: "Weight (kg)" }
    ];

    // Function to get top 5 crime types
    const getTop5CrimeTypes = (data) => {
        if (!data || data.length === 0) return [];
        const crimeTypeTotals = data.reduce((acc, curr) => {
            acc[curr.crime_type] = (acc[curr.crime_type] || 0) + curr.incident_count;
            return acc;
        }, {});

        return Object.entries(crimeTypeTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([crimeType]) => crimeType);
    };
    
    // Process crime data for borough chart
    const processCrimeDataForBoroughChart = (data) => {
        if (!data || data.length === 0) return [];

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


    // Get top 5 crime types and filter data
    const top5CrimeTypes = getTop5CrimeTypes(crimeData);
    const processedDataForCrimeTypeChart = crimeData.filter(d => top5CrimeTypes.includes(d.crime_type));
    const processedDataForBoroughChart = processCrimeDataForBoroughChart(crimeData);


    return (
        <div className="h-screen bg-slate-100 p-4 font-sans flex flex-col overflow-hidden">
            {/* Simple Header */}
            <header className="mb-2 flex-shrink-0">
                <h1 className="text-xl font-medium text-gray-800">Data Visualization Dashboard</h1>
            </header>

            {/* Main Content - Chart Grid */}
            <main className="flex-1 grid grid-cols-3 grid-rows-2 gap-3 min-h-0">
                {/* Chart 1 - Stacked Area Chart by Crime Type */}
                <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3 flex flex-col overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-700 mb-1 flex-shrink-0">
                        NYC Crime Trends by Type (Top 5)
                    </h3>
                    <div className="flex-1 min-h-0">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500">Loading crime data...</p>
                            </div>
                        ) : (
                            <StackedAreaChart
                                data={processedDataForCrimeTypeChart}
                                margin={{ top: 30, right: 30, bottom: 60, left: 50 }}
                                xKey="hour_of_day"
                                yKey="incident_count"
                                groupKey="crime_type"
                                colorScale={d3.schemeCategory10}
                                transitionDuration={800}
                                showLegend={true}
                                legendPosition="top"
                                xAxisLabel="Hour of Day"
                                yAxisLabel="Number of Crimes"
                            />
                        )}
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
                            />
                        )}
                    </div>
                </div>

                {/* Chart 3 - Product Attribute Analysis (PCP) */}
                <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3 flex flex-col overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-700 mb-1 flex-shrink-0">Product Attribute Analysis</h3>
                    <div className="flex-1 min-h-0">
                        <PCP
                            data={PCPData}
                            dimensions={pcpDimensions}
                            margin={{ top: 30, right: 30, bottom: 40, left: 50 }}
                            lineColor="#10B981"
                            lineHoverColor="#34D399"
                            lineOpacity={0.6}
                            lineHoverOpacity={0.9}
                            lineWidth={1.5}
                            transitionDuration={800}
                            title="Product Metrics" // PCP already has a title prop, so this is a bit redundant
                            showLabels={true}
                            labelKey="label"
                            colorByCategory={true}
                        />
                    </div>
                </div>

                {/* Chart 4 - Stacked Area Chart by Borough */}
                <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3 flex flex-col overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-700 mb-1 flex-shrink-0">
                        NYC Crime Trends by Borough
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
                                colorScale={d3.schemePaired}
                                transitionDuration={800}
                                showLegend={true}
                                legendPosition="top"
                                xAxisLabel="Hour of Day"
                                yAxisLabel="Number of Crimes"
                            />
                        )}
                    </div>
                </div>

                {/* Chart 5 - NYC Neighborhoods Map */}
                <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3 flex flex-col overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-700 mb-1 flex-shrink-0">NYC Neighborhoods</h3>
                    <div className="flex-1 min-h-0">
                        <GeoMap
                            margin={{ top: 30, right: 30, bottom: 40, left: 40 }}
                        />
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
const transformData = (obj) => Object.entries(obj).map(([key, value]) => ({ label: key, value: value }));

export const overallCitywide = {
    "Boiler Emissions": 12.066667,
    "PM2.5 Health Impacts": 52.54,
    "O3 Health Impacts": 36.11,
    "Air Toxics": 3.05,
    "Traffic Density": 15.966667
};
export const overallCitywideLineData = transformData(overallCitywide);

export const bronx = {
    "Boiler Emissions": 18.066667,
    "PM2.5 Health Impacts": 76.3,
    "O3 Health Impacts": 55.92,
    "Air Toxics": 3.05,
    "Traffic Density": 23.9
};
export const bronxLineData = transformData(bronx);

export const brooklyn = {
    "Boiler Emissions": 7.9,
    "PM2.5 Health Impacts": 49.71,
    "O3 Health Impacts": 35.02,
    "Air Toxics": 2.9,
    "Traffic Density": 23.8
};
export const brooklynLineData = transformData(brooklyn);

export const manhattan = {
    "Boiler Emissions": 72.533333,
    "PM2.5 Health Impacts": 61.16,
    "O3 Health Impacts": 40.09,
    "Air Toxics": 4.5,
    "Traffic Density": 48.0
};
export const manhattanLineData = transformData(manhattan);

export const queens = {
    "Boiler Emissions": 6.2,
    "PM2.5 Health Impacts": 36.47,
    "O3 Health Impacts": 25.22,
    "Air Toxics": 2.3,
    "Traffic Density": 23.5
};
export const queensLineData = transformData(queens);

export const statenIsland = {
    "Boiler Emissions": 0.933333,
    "PM2.5 Health Impacts": 35.91,
    "O3 Health Impacts": 23.54,
    "Air Toxics": 1.95,
    "Traffic Density": 9.8
};
export const statenIslandLineData = transformData(statenIsland);
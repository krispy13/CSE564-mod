import pandas as pd
import numpy as np
import os
import json
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.manifold import MDS
from sklearn.preprocessing import StandardScaler
from scipy.spatial.distance import pdist, squareform
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import LabelEncoder 
def perform_pca():
    # Get the base directory and construct absolute paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    merged_df_path = os.path.join(base_dir, "data", "merged_df.csv")
    merged_df = pd.read_csv(merged_df_path)
    numeric_df = merged_df.select_dtypes(include=[np.number])

    # Dropping any columns with NaN values
    numeric_df = numeric_df.dropna(axis=1)

    # Convert timedelta columns to numerical (seconds)
    for col in numeric_df.select_dtypes(include=['timedelta64']).columns:
        numeric_df[col] = numeric_df[col].dt.total_seconds()

    # Standardizing the data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numeric_df)

    # Performing PCA
    pca = PCA()
    pca.fit(scaled_data)

    # Convert NumPy arrays to Python lists for JSON serialization
    eigenvectors = pca.components_.tolist()
    explained_variance = pca.explained_variance_.tolist()
    explained_variance_ratio = pca.explained_variance_ratio_.tolist()
    
    # Calculate cumulative explained variance for Scree plot
    cumulative_variance_ratio = np.cumsum(pca.explained_variance_ratio_).tolist()
    
    # Also return column names for reference
    feature_names = numeric_df.columns.tolist()

    return {
        "eigenVectors": eigenvectors,
        "explainedVariance": explained_variance,
        "explainedVarianceRatio": explained_variance_ratio,
        "cumulativeVarianceRatio": cumulative_variance_ratio,
        "featureNames": feature_names,
        "screeData": {
            "components": list(range(1, len(explained_variance_ratio) + 1)),
            "explainedVarianceRatio": explained_variance_ratio,
            "cumulativeVarianceRatio": cumulative_variance_ratio
        }
    }


def get_biplot_data(selected_dimensions=None):
    # Default to first two dimensions if not specified
    if selected_dimensions is None:
        selected_dimensions = [0, 1, 2, 3, 4]
    elif isinstance(selected_dimensions, int):
        selected_dimensions = list(range(min(selected_dimensions + 1, 5)))
    elif not isinstance(selected_dimensions, list):
        selected_dimensions = [0, 1, 2, 3, 4]

    # Get the base directory and construct absolute path to file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    merged_df_path = os.path.join(base_dir, "data", "merged_df.csv")
    merged_df = pd.read_csv(merged_df_path)
    
    numeric_df = merged_df.select_dtypes(include=[np.number])

    # Dropping any columns with NaN values
    numeric_df = numeric_df.dropna(axis=1)

    # Convert timedelta columns to numerical (seconds)
    for col in numeric_df.select_dtypes(include=['timedelta64']).columns:
        numeric_df[col] = numeric_df[col].dt.total_seconds()

    # Standardizing the data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numeric_df)

    # Performing PCA
    pca = PCA()
    pca_scores = pca.fit_transform(scaled_data)
    loadings = pca.components_.T 
    feature_names = numeric_df.columns.tolist()
    variance = pca.explained_variance_ratio_
    
    # Generate point labels (can be customized)
    point_labels = [f"Point {i+1}" for i in range(len(pca_scores))]
    
    # Create original data as a list of dictionaries
    original_data = []
    for i, row in enumerate(numeric_df.values):
        data_point = {}
        for j, feature in enumerate(feature_names):
            data_point[feature] = row[j]
        original_data.append(data_point)

    biplot_data = {
        "pcScores": pca_scores.tolist(),
        "loadings": loadings.tolist(),
        "featureNames": feature_names,
        "variance": variance.tolist(),
        "selectedDimensions": selected_dimensions,
        "pointLabels": point_labels,
        "originalData": original_data
    }

    return biplot_data


def top_features(di):
    # Get the base directory and construct absolute paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    merged_df_path = os.path.join(base_dir, "data", "merged_df.csv")
    merged_df = pd.read_csv(merged_df_path)
    numeric_df = merged_df.select_dtypes(include=[np.number])

    # Dropping any columns with NaN values
    numeric_df = numeric_df.dropna(axis=1)

    # Convert timedelta columns to numerical (seconds)
    for col in numeric_df.select_dtypes(include=['timedelta64']).columns:
        numeric_df[col] = numeric_df[col].dt.total_seconds()

    # Standardizing the data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numeric_df)

    # Performing PCA
    pca = PCA(n_components=di)  # Limit the components to <= di
    pca.fit(scaled_data)

    # Get the loadings (transpose components to get features in rows)
    loadings = pca.components_.T  
    
    # Weight loadings by explained variance for each component
    weighted_loadings = loadings * np.sqrt(pca.explained_variance_)
    
    # Sum of squared loadings for each feature
    squared_loadings = np.sum(weighted_loadings**2, axis=1)
    
    # Get the indices of the top 4 features with the highest squared sum of loadings
    top_indices = np.argsort(squared_loadings)[-4:][::-1]
    
    # Get the feature names (column names) of the top 4 features
    top_features = numeric_df.columns[top_indices].tolist()
    
    return top_features



def get_pca_loadings(di):
    """
    Returns the loadings (weights) of each feature on each principal component.
    
    Args:
        di (int): Number of PCA dimensions to consider
        
    Returns:
        dict: Dictionary containing loadings and related data
    """
    # Get the base directory and construct absolute paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    merged_df_path = os.path.join(base_dir, "data", "merged_df.csv")
    merged_df = pd.read_csv(merged_df_path)
    numeric_df = merged_df.select_dtypes(include=[np.number])

    # Dropping any columns with NaN values
    numeric_df = numeric_df.dropna(axis=1)

    # Convert timedelta columns to numerical (seconds)
    for col in numeric_df.select_dtypes(include=['timedelta64']).columns:
        numeric_df[col] = numeric_df[col].dt.total_seconds()

    # Standardizing the data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numeric_df)

    # Performing PCA with specified number of components
    pca = PCA(n_components=min(di, len(numeric_df.columns)))
    pca.fit(scaled_data)

    # Get the loadings (transpose components to get features in rows)
    loadings = pca.components_.T
    
    # Weight loadings by explained variance
    weighted_loadings = loadings * np.sqrt(pca.explained_variance_)
    
    # Calculate squared sum of loadings for each feature
    # Only use the first 'di' components
    squared_loadings = np.sum(weighted_loadings[:, :di]**2, axis=1)
    
    # Get indices of features sorted by squared loadings
    sorted_indices = np.argsort(squared_loadings)[::-1]
    
    # Get top 4 features
    top_indices = sorted_indices[:4]
    top_features = numeric_df.columns[top_indices].tolist()
    top_loadings = squared_loadings[top_indices].tolist()
    
    # Create table data for frontend display
    table_data = []
    for i, (feature, loading) in enumerate(zip(top_features, top_loadings)):
        table_data.append({
            "rank": i+1,
            "feature": feature,
            "loading": round(loading, 4)
        })
    
    return {
        "allLoadings": loadings.tolist(),
        "squaredLoadings": squared_loadings.tolist(),
        "featureNames": numeric_df.columns.tolist(),
        "topFeatures": top_features,
        "topLoadingValues": top_loadings,
        "tableData": table_data,
        "explainedVariance": pca.explained_variance_ratio_.tolist()
    }

def get_scatterplot_matrix_data(dimensions=2, n_clusters=3):
    """
    Creates data for a scatterplot matrix of the top 4 features identified by PCA,
    including cluster assignments.
    
    Args:
        dimensions (int): Number of PCA dimensions to consider for selecting top features
        n_clusters (int): Number of clusters to create
        
    Returns:
        dict: Data for scatterplot matrix including features, values, and cluster assignments
    """
    # Get the base directory and construct absolute paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    merged_df_path = os.path.join(base_dir, "data", "merged_df.csv")
    merged_df = pd.read_csv(merged_df_path)
    
    # Get the top 4 features based on PCA
    features = top_features(dimensions)
    
    # Extract only the top features from the dataframe
    feature_data = merged_df[features].copy()
    
    # Perform clustering on these features
    # Standardizing the feature data
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(feature_data)
    
    # Apply K-means clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(scaled_features)
    
    # Convert to appropriate format for frontend
    result = {
        "features": features,  # List of feature names
        "data": [],  # Will contain data points
        "clusterCenters": []  # Will contain cluster centers
    }
    
    # Convert data to list of dictionaries (one per row)
    for i, row in enumerate(feature_data.iterrows()):
        _, row_data = row
        data_point = {}
        for feature in features:
            value = row_data[feature]
            # Convert numpy types to Python native types for JSON serialization
            if isinstance(value, np.integer):
                value = int(value)
            elif isinstance(value, np.floating):
                value = float(value)
            data_point[feature] = value
        
        # Add cluster assignment
        data_point["cluster"] = int(cluster_labels[i])
        result["data"].append(data_point)
    
    # Add cluster centers
    centers = kmeans.cluster_centers_
    for i, center in enumerate(centers):
        center_point = {"cluster": i}
        for j, feature in enumerate(features):
            center_point[feature] = float(center[j])
        result["clusterCenters"].append(center_point)
    
    # Calculate correlation matrix
    corr_matrix = feature_data.corr().to_dict(orient='index')
    result["correlation_matrix"] = corr_matrix
    
    return result


def perform_kmeans(n_clusters=3, dimensions=2):
    # Get the base directory and construct absolute paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    merged_df_path = os.path.join(base_dir, "data", "merged_df.csv")
    merged_df = pd.read_csv(merged_df_path)
    numeric_df = merged_df.select_dtypes(include=[np.number])

    # Dropping any columns with NaN values
    numeric_df = numeric_df.dropna(axis=1)

    # Convert timedelta columns to numerical (seconds)
    for col in numeric_df.select_dtypes(include=['timedelta64']).columns:
        numeric_df[col] = numeric_df[col].dt.total_seconds()

    # Standardizing the data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numeric_df)

    # Performing PCA with the specified number of dimensions
    pca = PCA(n_components=dimensions)
    pca_data = pca.fit_transform(scaled_data)

    # Using the Elbow Method to determine the best 'k' (still calculate this for the chart)
    inertia = []
    k_range = range(1, 11)  # Testing k from 1 to 10

    for k in k_range:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(pca_data)
        inertia.append(kmeans.inertia_)

    # Use the n_clusters passed from the frontend
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(pca_data)

    return {
        "pcaData": pca_data.tolist(),  # PCA-transformed data
        "clusterLabels": cluster_labels.tolist(),  # Assigned cluster for each point
        "elbowData": {
            "kValues": list(k_range),
            "inertia": inertia
        },
        "optimalK": n_clusters,  # Return the user-specified k
        "dimensions": dimensions  # Return the dimensions used
    }


def compute_mds_json(cluster_labels=None, find_optimal=False):
    """
    Computes MDS plots for data points and variables.
    
    Parameters:
    cluster_labels (pd.Series or list, optional): Cluster labels for coloring points.
    find_optimal (bool): Whether to find the optimal number of clusters (defaults to False).
    
    Returns:
    dict: A dictionary containing MDS coordinates for data points and variables in JSON format.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    merged_df_path = os.path.join(base_dir, "data", "merged_df.csv")
    df = pd.read_csv(merged_df_path)
    
    # Select numeric columns only
    df = df.select_dtypes(include=[np.number])
    
    # Dropping any columns with NaN values
    df = df.dropna(axis=1)
    
    # Standardize the data
    scaler = StandardScaler()
    df_scaled = scaler.fit_transform(df)
    
    # (a) Data MDS plot using Euclidean distance
    data_dist = squareform(pdist(df_scaled, metric='euclidean'))
    mds_data = MDS(n_components=2, dissimilarity='precomputed', random_state=42)
    data_coords = mds_data.fit_transform(data_dist)
    
    # Determine optimal number of clusters if requested
    optimal_k = None
    if find_optimal:
        # Calculate silhouette scores for different k values
        
        silhouette_scores = []
        k_range = range(2, 11)  # Test 2-10 clusters
        
        for k in k_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = kmeans.fit_predict(data_coords)  # Cluster in MDS space
            
            # Skip if there's only one cluster or some clusters are empty
            if len(np.unique(labels)) < 2:
                silhouette_scores.append(-1)
                continue
                
            # Calculate silhouette score
            score = silhouette_score(data_coords, labels)
            silhouette_scores.append(score)
        
        # Find k with highest silhouette score
        if silhouette_scores:
            optimal_k = k_range[np.argmax(silhouette_scores)]
            
            # Use the optimal number of clusters
            kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(data_coords)
    
    data_json = [{
        "x": float(data_coords[i, 0]),
        "y": float(data_coords[i, 1]),
        "cluster": int(cluster_labels[i]) if cluster_labels is not None else None
    } for i in range(len(df))]
    
    # (b) Variable MDS plot using (1 - |correlation|) distance
    corr_matrix = df.corr().abs()  # Absolute correlation
    var_dist = 1 - corr_matrix
    var_dist[var_dist < 0] = 0  # Ensure non-negative distances
    
    mds_var = MDS(n_components=2, dissimilarity='precomputed', random_state=42)
    var_coords = mds_var.fit_transform(var_dist)
    
    var_json = [{
        "x": float(var_coords[i, 0]),
        "y": float(var_coords[i, 1]),
        "variable": df.columns[i]
    } for i in range(len(df.columns))]
    
    result = {
        "data_mds": data_json, 
        "variable_mds": var_json
    }
    
    # Add optimal clustering info if available
    if find_optimal and optimal_k:
        result["optimal_k"] = optimal_k
        
    return json.dumps(result, indent=4)


def compute_parallel_coordinates_json():
    """
    Converts a dataframe into a format suitable for parallel coordinates plotting.
    Handles both numerical and categorical variables.
    
    Returns:
    dict: A dictionary with processed data and axis information
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    merged_df_path = os.path.join(base_dir, "data", "merged_df.csv")
    df = pd.read_csv(merged_df_path)

    # Replace inf, -inf with large finite values and NaN with None
    df = df.replace([np.inf, -np.inf], [1.0e+308, -1.0e+308])
    # Remove 'Name' column if it exists
    if 'Name' in df.columns:
        df = df.drop(columns=['Name', 'POS'])
    
    df_processed = df.copy()
    encoders = {}
    
    # Create axis information for each column
    axes = []
    for col in df.columns:
        axis_info = {
            "name": col,  # Original column name
            "type": "categorical" if df[col].dtype == "object" or df[col].dtype == "category" else "numerical"
        }
        
        # Add range information for numerical columns
        if axis_info["type"] == "numerical":
            axis_info["min"] = float(df[col].min()) if np.isfinite(df[col].min()) else None
            axis_info["max"] = float(df[col].max()) if np.isfinite(df[col].max()) else None
        
        axes.append(axis_info)
    
    # Process categorical variables
    for col in df.select_dtypes(include=['object', 'category']).columns:
        encoder = LabelEncoder()
        df_processed[col] = encoder.fit_transform(df[col].fillna('missing'))
        # Convert NumPy values to native Python types
        encoders[col] = {str(k): int(v) for k, v in zip(encoder.classes_, encoder.transform(encoder.classes_))}
    
    # Convert DataFrame to records and ensure all values are JSON serializable
    records = []
    for record in df_processed.to_dict(orient='records'):
        # Convert any NumPy types to native Python types
        clean_record = {}
        for key, value in record.items():
            if pd.isna(value):
                clean_record[key] = None
            elif isinstance(value, (np.integer, np.int64, np.int32)):
                clean_record[key] = int(value)
            elif isinstance(value, (np.floating, np.float64, np.float32)):
                if np.isfinite(value):
                    clean_record[key] = float(value)
                else:
                    clean_record[key] = None
            elif isinstance(value, np.bool_):
                clean_record[key] = bool(value)
            elif isinstance(value, (np.ndarray, list)):
                clean_record[key] = [
                    None if pd.isna(x) else
                    int(x) if isinstance(x, np.integer) else 
                    float(x) if isinstance(x, np.floating) and np.isfinite(x) else
                    bool(x) if isinstance(x, np.bool_) else x 
                    for x in value
                ]
            else:
                clean_record[key] = value
        records.append(clean_record)
    
    return {
        "records": records,
        "axes": axes,
        "encoders": encoders
    }

def get_crime_data_by_hour():
    """
    Loads and processes the NYC crime data by hour, including borough information.
    Returns data formatted for the stacked area chart.
    """
    # Get the base directory and construct absolute paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # Assuming the original CSV 'nyc_crime_data_cleaned.csv' contains borough, crime_type, hour_of_day, incident_count
    # If not, the source CSV needs to be checked and potentially replaced/modified.
    # For now, let's assume 'nyc_crime_by_hour.csv' might be a pre-aggregated one.
    # Let's try to use a more granular dataset if available or adjust.
    # For the purpose of this fix, we will assume 'nyc_crime_by_hour.csv' *does* have borough.
    # If it doesn't, this function would need to read from a more raw data source.
    
    crime_data_path = os.path.join(base_dir, "data", "nyc_crime_by_hour.csv") # This might need to change if this CSV is already too aggregated
    
    # Read the CSV file
    df = pd.read_csv(crime_data_path)

    # Ensure required columns exist (initial check for presence)
    # This check is important before attempting to access df['borough']
    if 'borough' not in df.columns:
        print(f"Error: Critical 'borough' column not found in {crime_data_path}. Cannot proceed with borough-specific processing.")
        # Depending on requirements, either return empty or data for crime_type only if possible
        if 'crime_type' in df.columns and 'hour_of_day' in df.columns and 'incident_count' in df.columns:
            print("Falling back to grouping by crime_type only due to missing 'borough' column.")
            grouped_data = df.groupby(['crime_type', 'hour_of_day'])['incident_count'].sum().reset_index()
            return grouped_data.to_dict('records')
        return [] # Or raise an error

    # Replace string versions of null with np.nan in 'borough' column
    null_string_values = ['(null)', 'NULL', 'Null', 'nan', 'NaN', ''] # Add empty string if that represents null
    df['borough'] = df['borough'].replace(null_string_values, np.nan)

    # Now drop rows where 'borough' is NaN (either originally or after replacement)
    df.dropna(subset=['borough'], inplace=True)

    # Check for other required columns after ensuring 'borough' is handled
    required_cols = ['borough', 'crime_type', 'hour_of_day', 'incident_count']
    if not all(col in df.columns for col in required_cols):
        # This implies some other required column might be missing
        print(f"Error: One or more required columns ({required_cols}) are still missing after initial checks and borough processing in {crime_data_path}")
        return []

    # Optional: Fill NaN in 'incident_count' with 0 if that makes sense for the dataset
    # df['incident_count'].fillna(0, inplace=True)

    # Select and rename columns if necessary to match frontend expectations if they differ.
    crime_data_records = df[['borough', 'crime_type', 'hour_of_day', 'incident_count']].to_dict('records')
    
    return crime_data_records

def get_sunburst_data():
    """
    Loads and processes the restaurant data for a sunburst visualization.
    Returns data formatted for D3.js sunburst chart.
    """
    # Get the base directory and construct absolute paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sunburst_data_path = os.path.join(base_dir, "data", "sunburst_df.csv")
    
    # Read the CSV file
    df = pd.read_csv(sunburst_data_path)
    
    # Create a hierarchical structure for the sunburst chart
    data = {"name": "NYC Restaurants", "children": []}
    
    # Group by borough
    boroughs = df['borough'].unique()
    
    for borough in boroughs:
        borough_data = {"name": borough, "children": []}
        borough_df = df[df['borough'] == borough]
        
        # Group by reduced cuisine type
        cuisine_groups = borough_df['reduced_cuisine'].unique()
        
        for cuisine in cuisine_groups:
            cuisine_data = {"name": cuisine, "children": []}
            cuisine_df = borough_df[borough_df['reduced_cuisine'] == cuisine]
            
            # Add restaurant names
            for _, row in cuisine_df.iterrows():
                restaurant = {
                    "name": row['name'],
                    "value": 1,
                    "rating": float(row['rating'])
                }
                cuisine_data["children"].append(restaurant)
            
            borough_data["children"].append(cuisine_data)
        
        data["children"].append(borough_data)
    
    return data

def get_nta_geojson():
    """
    Loads and returns the NTA (Neighborhood Tabulation Areas) GeoJSON data.
    Returns data formatted for D3.js geo visualization.
    """
    # Get the base directory and construct absolute paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    nta_geojson_path = os.path.join(base_dir, "data", "NTA.geo.json")
    
    try:
        with open(nta_geojson_path, 'r') as f:
            geojson_data = json.load(f)
        
        # Basic validation of the GeoJSON structure
        if not isinstance(geojson_data, dict) or 'type' not in geojson_data or 'features' not in geojson_data:
            print("Error: Invalid GeoJSON structure")
            return {"error": "Invalid GeoJSON structure", "type": "FeatureCollection", "features": []}
            
        # Ensure the features array exists and is not empty
        if not geojson_data['features'] or not isinstance(geojson_data['features'], list):
            print("Error: No features found in GeoJSON")
            return {"error": "No features found in GeoJSON", "type": "FeatureCollection", "features": []}
        
        # Count features before validation
        feature_count_before = len(geojson_data['features'])
        
        valid_features = []
        # Validate each feature has required properties
        for i, feature in enumerate(geojson_data['features']):
            # Skip features without geometry or properties
            if 'geometry' not in feature or 'properties' not in feature:
                continue
                
            # Skip features with empty or invalid geometry
            if feature['geometry'] is None or 'type' not in feature['geometry'] or 'coordinates' not in feature['geometry']:
                continue
                
            # Skip features with empty coordinates
            if not feature['geometry']['coordinates'] or len(feature['geometry']['coordinates']) == 0:
                continue
                
            # Ensure all properties exist, set defaults if missing
            props = feature['properties']
            if 'NTAName' not in props and 'NTAname' in props:
                props['NTAName'] = props['NTAname']  # Fix potential case inconsistency
            elif 'NTAName' not in props:
                props['NTAName'] = f"Neighborhood {i}"
                
            if 'NTACode' not in props:
                props['NTACode'] = f"NT{i:03d}"
                
            if 'BoroName' not in props:
                # Try to determine borough from other properties if available
                if 'BoroCode' in props:
                    boro_code = props['BoroCode']
                    if boro_code == 1:
                        props['BoroName'] = "Manhattan"
                    elif boro_code == 2:
                        props['BoroName'] = "Bronx"
                    elif boro_code == 3:
                        props['BoroName'] = "Brooklyn"
                    elif boro_code == 4:
                        props['BoroName'] = "Queens"
                    elif boro_code == 5:
                        props['BoroName'] = "Staten Island"
                    else:
                        props['BoroName'] = "Unknown"
                else:
                    props['BoroName'] = "Unknown"
            
            valid_features.append(feature)
        
        # Replace features with only valid ones
        geojson_data['features'] = valid_features
            
        print(f"Successfully loaded GeoJSON with {len(valid_features)} valid features out of {feature_count_before} total features")
        return geojson_data
    except FileNotFoundError:
        print(f"Error: GeoJSON file not found at {nta_geojson_path}")
        return {"error": "GeoJSON file not found", "type": "FeatureCollection", "features": []}
    except json.JSONDecodeError as e:
        print(f"Error parsing GeoJSON: {e}")
        return {"error": f"JSON parsing error: {str(e)}", "type": "FeatureCollection", "features": []}
    except Exception as e:
        print(f"Error loading NTA GeoJSON data: {e}")
        return {"error": f"Unknown error: {str(e)}", "type": "FeatureCollection", "features": []}
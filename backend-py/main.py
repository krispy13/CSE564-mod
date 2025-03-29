from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import json
from typing import List, Optional
from services import perform_pca, get_biplot_data, top_features, get_scatterplot_matrix_data, get_pca_loadings, perform_kmeans, compute_mds_json, compute_parallel_coordinates_json

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/eigenValues")
async def get_eigen_values():
    result = perform_pca()
    return {"explained_variance_ratio": result["explainedVarianceRatio"]}

@app.get("/biplot")
async def get_biplot(dimensions: Optional[List[int]] = Query(None, description="List of dimensions to include in the biplot")):
    # Pass dimensions directly to get_biplot_data, which now handles defaults appropriately
    result = get_biplot_data(dimensions)
    return {"biplot": result}

@app.get("/top_features")
async def get_top_features(dimensions: int = Query(2, description="Number of PCA dimensions to consider")):
    features = top_features(dimensions)
    return {"top_features": features}

@app.get("/scatterplot_matrix")
async def get_scatterplot_matrix(
    dimensions: int = Query(2, description="Number of PCA dimensions to consider"),
    n_clusters: int = Query(3, description="Number of clusters to create")
):
    result = get_scatterplot_matrix_data(dimensions, n_clusters)
    return {"scatterplot_matrix": result}


@app.get("/pca_loadings")
async def get_loadings(dimensions: int = Query(None, description="Number of PCA dimensions to return (defaults to all)")):
    loadings = get_pca_loadings(dimensions)
    return {"loadings": loadings}

@app.get("/kmeans")
def kmeans_endpoint(clusters: int = 3, dimensions: int = 2):
    result = perform_kmeans(n_clusters=clusters, dimensions=dimensions)
    return result

@app.get("/mdp")
def get_mdp(clusters: int = 3, find_optimal: bool = True):
    """
    Returns Multidimensional Scaling (MDS) visualization data for both data points and variables.
    
    Parameters:
    clusters (int): Number of clusters to use for coloring points (default: 3)
    find_optimal (bool): Whether to find the optimal number of clusters automatically (default: False)
    
    Returns:
    dict: MDS coordinates for data points and variables
    """
    if find_optimal:
        # If finding optimal clusters, run the MDS with optimization
        mds_data = compute_mds_json(cluster_labels=None, find_optimal=True)
    else:
        # Otherwise use the user-specified number of clusters
        kmeans_result = perform_kmeans(n_clusters=clusters)
        cluster_labels = kmeans_result["clusterLabels"]
        mds_data = compute_mds_json(cluster_labels=cluster_labels, find_optimal=False)
    
    # The function returns a JSON string, but FastAPI will handle serialization
    return json.loads(mds_data)

@app.get("/pdp")
def get_parallel_coordinates():
    """
    Returns data for parallel coordinates visualization.
    
    Returns:
    dict: Data formatted for parallel coordinates plotting, including encoded categorical variables and axis information
    """
    # Call the service function to get parallel coordinates data
    pdp_data = compute_parallel_coordinates_json()
    
    # Return the complete data structure
    return pdp_data


@app.get("/")
async def root():
    return {"message": "PCA Backend is running 🚀"}
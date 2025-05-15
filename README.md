# CSE564 Project Setup Guide

This repository contains both the frontend and backend components of the CSE564 project. Follow the instructions below to set up and run the project on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:
- Python 3.8 or higher
- Node.js (v14 or higher)
- npm (comes with Node.js)

## Backend Setup (Python)

1. Navigate to the backend directory:
   ```bash
   cd backend-py
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On Windows:
     ```bash
     .\venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install required Python packages:
   ```bash
   pip install fastapi uvicorn pandas numpy scikit-learn
   ```

5. Run the backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

The backend server will start running at `http://localhost:8000`

## Frontend Setup (React)

1. Navigate to the frontend directory:
   ```bash
   cd project/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend application will start running at `http://localhost:3000`

The API KEY for the Gemini based-chatbot is still available in the .env file for just showcasing the project. We will manual disable the key after 14 days of submission.

## Project Structure

```
.
├── backend-py/           # Python backend
│   ├── main.py          # Main FastAPI application
│   ├── services.py      # Backend services
│   ├── data/            # Data files
│   └── precompute/      # Precomputed data
│
└── project/
    └── frontend/        # React frontend application
```

## API Endpoints

The backend provides several API endpoints:

- `GET /api/data`: Retrieves the dataset
- `GET /api/pca`: Performs PCA analysis
- `GET /api/mds`: Performs MDS analysis
- `GET /api/tsne`: Performs t-SNE analysis
- `GET /api/scree`: Returns scree plot data
- `GET /api/biplot`: Returns biplot data
- `GET /api/correlation`: Returns correlation matrix

## Notes

- Make sure both backend and frontend servers are running simultaneously for the application to work properly.
- The backend server must be running on port 8000 for the frontend to communicate with it correctly.
- If you encounter any CORS issues, ensure that the backend is properly configured to accept requests from the frontend origin.

## Troubleshooting

If you encounter any issues:

1. Ensure all dependencies are properly installed
2. Check if the ports 3000 and 8000 are available
3. Verify that both servers are running simultaneously
4. Clear your browser cache if you experience frontend issues

For additional help or to report issues, please contact the project maintainers. 
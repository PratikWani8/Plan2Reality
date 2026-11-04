import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

try:
    from .api.routes import router
except ImportError:
    from app.api.routes import router

app = FastAPI(
    title="Plan2Reality AI Computer Vision Microservice",
    description="Parametric 2D architectural blueprint analysis & 3D geometry reconstruction",
    version="1.0.0"
)

origins = [
    item.strip()
    for item in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost:5000"
    ).split(",")
    if item.strip()
]

# Enable CORS for frontend and backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {
        "name": "Plan2Reality AI Service",
        "version": "1.0.0",
        "documentation": "/docs"
    }

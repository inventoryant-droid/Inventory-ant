from fastapi import FastAPI

app = FastAPI(title="Inventory Ant AI Microservice")

@app.get("/")
def read_root():
    return {"message": "Welcome to Inventory Ant AI Service"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

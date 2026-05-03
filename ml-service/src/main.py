from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from src.classifier import classifier
import uvicorn

app = FastAPI(title="LocalSpot ML Service")

class ReviewData(BaseModel):
    text: str
    metadata: Optional[Dict] = None

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/classify")
async def classify_review(data: ReviewData):
    try:
        score = classifier.predict(data.text, data.metadata)
        return {
            "mlScore": score,
            "isSuspicious": score >= classifier.threshold,
            "message": "Review analyzed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

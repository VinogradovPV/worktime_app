from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WorkTime API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://worktimeapp-pdfmhwoz.manus.space"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}

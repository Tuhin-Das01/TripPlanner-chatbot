from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from main import run1


app = FastAPI(
    title="Budget Travel Planning with Agentic AI",
    description="LangGraph, FastAPI, Groq"
)


class Runrequest(BaseModel):
    query: str = Field(min_length=2, max_length=300)


app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)


@app.get("/")
def home():
    return FileResponse("static/index.html")


@app.post("/run")
def run(request: Runrequest):

    print("========== REQUEST RECEIVED ==========")
    print("Request object:", request)
    print("Question:", request.query)

    ques = request.query.strip()

    if not ques:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty"
        )

    result = run1(ques)

    return {
        "success": True,
        "final_answer": result.get("final_answer", ""),
        "final_decision": result.get("final_decision", ""),
        "final_feedback": result.get("final_feedback", ""),
        "revision_count": result.get("revision_count", 0),
        "provider": result.get("provider", ""),
        "events": result.get("event", []),
        "block": result.get("blocked", False)
    }
from fastapi import FastAPI, UploadFile, File, Form, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from ai_agent import generate_support_reply, get_kb_context, GENERIC_RESOLUTION_GUIDANCE
from ai_agent_analyzer.ai_agent_analyzer import analyze_case, evaluate_resolution_readiness
from pydantic import BaseModel
from typing import Dict, Any
import json

def load_resolution_guides():
    with open("resolution_guides.json", "r", encoding="utf-8") as f:
        return json.load(f)
RESOLUTION_GUIDES = load_resolution_guides()

app = FastAPI()

# CORS (para Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/support-agent")
async def support_agent(
    problem_description: str = Form(...),
    email_thread: str = Form(...),
    case_key: str | None = Form(None),
    screenshots: list[UploadFile] = File(default=[])
):
    kb_context = get_kb_context(case_key)

    screenshot_context = ""
    if screenshots:
        screenshot_context = f"\nScreenshots attached: {len(screenshots)}.\n"

    if case_key in RESOLUTION_GUIDES:
        selected_case = RESOLUTION_GUIDES[case_key]

        resolution_guidance = f"""
Case: {selected_case['case_name']}

Resolution steps:
- """ + "\n- ".join(selected_case["guidance"])

    else:
        resolution_guidance = GENERIC_RESOLUTION_GUIDANCE

    reply = generate_support_reply(
        problem_description=problem_description,
        email_thread=email_thread + screenshot_context,
        resolution_guidance=resolution_guidance,
        kb_context=kb_context
    )

    return {
        "reply": reply
    }

# @app.post("/analyze-case")
# async def analyze_support_case(
#     email_thread: str = Form(...)
# ):
#     analysis = analyze_case(email_thread=email_thread)
#     analysis = evaluate_resolution_readiness(analysis)

#     return analysis

class AnalyzeRequest(BaseModel):
    email_thread: str

@app.post("/analyze-case")
async def analyze_case_endpoint(payload: AnalyzeRequest):
    analysis = analyze_case(payload.email_thread)
    return analysis
# ---------------------------------------------------------------------
router = APIRouter()

class FinalizeCaseRequest(BaseModel):
    analysis: Dict[str, Any]


@router.post("/finalize-case")
def finalize_case(payload: FinalizeCaseRequest):
    analysis = payload.analysis

    # 1️⃣ Recalcular missing information
    missing = []

    if not analysis.get("supplier_entities", {}).get("graphite_id"):
        missing.append("Graphite ID")

    if not analysis.get("supplier_entities", {}).get("registration_number"):
        missing.append("Supplier registration number")

    if not analysis.get("customer_entities", {}).get("email"):
        missing.append("Customer contact email")

    if not analysis.get("generated_problem_description"):
        missing.append("Error details or screenshot reference")

    analysis["missing_information"] = missing

    # 2️⃣ Re-evaluar readiness
    analysis = evaluate_resolution_readiness(analysis)

    # 3️⃣ Marcar como finalizado
    analysis["finalized"] = True

    return {
    "analysis": analysis
}
app.include_router(router)

#--------------------------------------------------------------------------------------
class UpdateSummaryRequest(BaseModel):
    analysis: Dict[str, Any]

@app.post("/update-case-summary")
def update_case_summary(payload: UpdateSummaryRequest):
    analysis = payload.analysis

    # Construir summary basado en info confirmada
    supplier = analysis.get("supplier_entities", {})
    customer = analysis.get("customer_entities", {})

    summary_parts = []

    if supplier.get("company_name"):
        summary_parts.append(
            f"The case involves supplier {supplier['company_name']}."
        )

    if analysis.get("generated_problem_description"):
        summary_parts.append(analysis["generated_problem_description"])

    if customer.get("customer_company"):
        summary_parts.append(
            f"The customer is {customer['customer_company']}."
        )

    analysis["case_summary"] = " ".join(summary_parts)
    analysis["summary_confirmed_by_user"] = True

    return {"analysis": analysis}


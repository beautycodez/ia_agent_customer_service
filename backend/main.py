from fastapi import FastAPI, UploadFile, File, Form, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from ai_agent.ai_agent import generate_support_reply, get_kb_context, GENERIC_RESOLUTION_GUIDANCE
from ai_agent_analyzer.ai_agent_analyzer import analyze_case, evaluate_resolution_readiness
from ai_analyzer_replier.ai_analyzer_replier import generate_support_reply_analyzer, get_kb_context_analyzer, GENERIC_RESOLUTION_GUIDANCE_ANALYZER
from pydantic import BaseModel
from typing import Dict, Any
import json

def load_resolution_guides():
    with open("ai_agent/resolution_guides.json", "r", encoding="utf-8") as f:
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
#-----------------------------------New Replier -----------------------------
@app.post("/support-agent-replier")
async def support_agent_replier(
    problem_description: str = Form(...),
    case_key: str | None = Form(None),
    screenshots: list[UploadFile] = File(default=[])
):
    kb_context = get_kb_context_analyzer(case_key)

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
        resolution_guidance = GENERIC_RESOLUTION_GUIDANCE_ANALYZER

    reply = generate_support_reply_analyzer(
        problem_description=problem_description + screenshot_context,
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

def md_list(title: str, items: list[str], indent: int = 0) -> str:
    if not items:
        return ""
    space = " " * indent
    bullets = "\n".join(f"{space}- {item}" for item in items)
    return f"\n**{title}:**\n{bullets}"

class UpdateSummaryRequest(BaseModel):
    analysis: Dict[str, Any]


@app.post("/update-case-summary")
def update_case_summary(payload: UpdateSummaryRequest):
    analysis = payload.analysis

    summary_sections = []

    # 1️⃣ Generated problem description
    if analysis.get("generated_problem_description"):
        summary_sections.append(
    f"**Problem Description:**\n{analysis['generated_problem_description']}" + "\n"
)

    # 2️⃣ Supplier entities
    supplier = analysis.get("supplier_entities", {})
    supplier_parts = []

    for label, key in [
        ("Company Name", "company_name"),
        ("Contact Name", "contact_name"),
        ("Email", "email"),
        ("Graphite ID", "graphite_id"),
        ("Registration Number", "registration_number"),
    ]:
        if supplier.get(key):
            supplier_parts.append(f"- {label}: {supplier[key]}")

    admin = supplier.get("admin_users", {})
    if admin.get("name") or admin.get("email"):
        supplier_parts.append(
            f"- Admin User: {admin.get('name', 'N/A')} ({admin.get('email', 'N/A')})"
        )

    if supplier_parts:
        summary_sections.append(
    "**Supplier Information:**\n" + "\n".join(supplier_parts) + "\n"
)

    # 3️⃣ Customer entities
    customer = analysis.get("customer_entities", {})
    customer_parts = []

    for label, key in [
        ("Company", "customer_company"),
        ("Contact Name", "contact_name"),
        ("Email", "email"),
        ("Graphite ID", "graphite_id"),
    ]:
        if customer.get(key):
            customer_parts.append(f"- {label}: {customer[key]}")

    if customer_parts:
       summary_sections.append(
    "**Customer Information:**\n" + "\n".join(customer_parts) + "\n"
)

    # 4️⃣ Connection
    connection = analysis.get("connection", {})
    connection_parts = []

    if connection.get("status"):
        connection_parts.append(f"- Status: {connection['status']}")

    if connection.get("error_type"):
        connection_parts.append(f"- Error Type: {connection['error_type']}")

    if connection.get("deadline"):
        connection_parts.append(f"- Deadline: {connection['deadline']}")

    actions = connection.get("action_required", [])
    if actions:
        connection_parts.append(
        md_list("Required Actions", actions, indent=2)
    )

    if connection_parts:
        summary_sections.append(
        "**Connection Details:**\n" + "\n".join(connection_parts) + "\n"
    )

    # 5️⃣ Email
    email = analysis.get("email", {})
    email_parts = []

    for label, key in [
        ("Issue Category", "issue_category"),
        ("Urgency", "urgency"),
        ("Document Type", "document_type"),
        ("Solved", "solved"),
    ]:
        if key in email and email[key] not in ("", None, []):
            email_parts.append(f"- {label}: {email[key]}")

    for list_label, key in [
        ("Questions", "questions"),
        ("Detected Issues", "detected_issues"),
        ("Missing Information", "missing_information"),
    ]:
        items = email.get(key, [])
        if items:
            email_parts.append(
            md_list(list_label, items, indent=2)
            )

    confidence = email.get("confidence_notes", {})
    if confidence:
        email_parts.append(
        md_list(
            "Confidence Notes",
            [f"{k}: {v}" for k, v in confidence.items()],
            indent=2,
            )
        )

    if email_parts:
        summary_sections.append(
            "**Email Analysis**:\n" + "\n".join(email_parts) + "\n"
        )

    # 🧠 Final case summary
    analysis["case_summary"] = "\n\n".join(summary_sections)
    analysis["summary_confirmed_by_user"] = True

    # ❌ Explicitly ignore these fields
    analysis.pop("suggested_case_keys", None)
    analysis.pop("ready_for_resolution", None)

    return {"analysis": analysis}

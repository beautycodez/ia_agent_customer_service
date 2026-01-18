from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from ai_agent import generate_support_reply, get_kb_context, GENERIC_RESOLUTION_GUIDANCE
from kb_search import search_kb
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

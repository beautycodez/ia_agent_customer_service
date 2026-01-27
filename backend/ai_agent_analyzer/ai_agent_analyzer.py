from openai import OpenAI
from dotenv import load_dotenv
import os, json
from pathlib import Path

def normalize_confidence_notes(notes: dict) -> dict:
    allowed_fields = [
        "case_summary",
        "generated_problem_description",
        "supplier_entities.contact_name",
        "supplier_entities.company_name",
        "supplier_entities.email",
        "supplier_entities.graphite_id",
        "supplier_entities.registration_number",
        "customer_entities.customer_company",
        "customer_entities.contact_name",
        "customer_entities.email",
    ]

    clean = {}
    for k, v in notes.items():
        if k in allowed_fields:
            clean[k] = v

    return clean

load_dotenv()
client = OpenAI(api_key=os.getenv("API_KEY"))

BASE_DIR = Path(__file__).parent
STRUCTURE_PATH = BASE_DIR / "structure_data.json"

def load_structure_template():
    with open(STRUCTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


CASE_ANALYZER_SYSTEM_PROMPT = """
You are a Case Analysis Assistant for graphiteConnect Customer Support.

Your task:
- Analyze ONLY the email thread
- Infer the core problem
- Extract structured information
- Generate a concise problem description
- Identify missing information
- Suggest possible case keys for suggested_case_keys (example: bank approval, add new user)

Rules:
- Do NOT write a support reply
- Do NOT provide instructions
- Do NOT assume missing data
- If something is not explicit, mark it as null or missing
- Follow EXACTLY the JSON structure provided
- Return ONLY valid JSON

The field "confidence_notes" MUST be an object where:
- keys are JSON paths to fields (e.g. "supplier_entities.graphite_id")
- values are short confidence statements
- DO NOT use full sentences as keys

"""


def analyze_case(email_thread: str):
    structure_template = load_structure_template()

    user_prompt = f"""
Email thread:
{email_thread}

Return a JSON object that follows EXACTLY this structure:
{json.dumps(structure_template, indent=2)}
"""

    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": CASE_ANALYZER_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.1
    )

    content = response.choices[0].message.content

    try:
        analysis = json.loads(content)
    except json.JSONDecodeError:
        return {
            "error": "Analyzer returned invalid JSON",
            "raw_output": content
        }

    # ✅ Normalize confidence notes
    analysis["confidence_notes"] = normalize_confidence_notes(
        analysis.get("confidence_notes", {})
    )

    # ✅ Evaluate readiness
    analysis = evaluate_resolution_readiness(analysis)

    return analysis


def evaluate_resolution_readiness(analysis: dict) -> dict:
    missing = analysis.get("missing_information", [])
    suggested_cases = analysis.get("suggested_case_keys", [])

    analysis["ready_for_resolution"] = (
        len(missing) == 0 and len(suggested_cases) > 0
    )

    return analysis

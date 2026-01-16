from openai import OpenAI
from dotenv import load_dotenv
import os
from kb_search import search_kb
import json
# Cargar variables desde el archivo .env
load_dotenv()

# Obtener la API key
OPENAI_API_KEY = os.getenv("API_KEY")

#---------------------------------
def load_resolution_guides():
    with open("resolution_guides.json", "r", encoding="utf-8") as f:
        return json.load(f)

RESOLUTION_GUIDES = load_resolution_guides()

#-----------------------------------

client = OpenAI(api_key=OPENAI_API_KEY)
#-------------------------------------------------------------------------------------
SYSTEM_PROMPT = """
You are a graphiteConnect Customer Support Assistant.

Your responsibilities:
- Analyze customer and supplier support issues
- Review email threads carefully
- Identify missing or inconsistent information
- Follow the resolution guidance provided by the user

Rules:
- Be clear, professional, and polite
- Do not invent information
- If information is missing, request confirmation
- Always explain the next steps clearly

When resolution guidance references a known case type:
- Follow the case rules strictly
- Do not mix resolutions between cases
- Do not assume information not explicitly provided

If knowledge base information is provided:
- Use it as the primary source of truth
- Reference the article link when helpful
- Do not contradict it

Output:
- A ready-to-send support email
"""
#------------------------------------------------------------------------
def generate_support_reply(
    problem_description,
    email_thread,
    resolution_guidance,
    kb_context=""
):
    user_prompt = f"""
Problem description:
{problem_description}

Email thread:
{email_thread}

Resolution guidance:
{resolution_guidance}

{kb_context}

Generate the support reply email.
"""

    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3
    )

    return response.choices[0].message.content


#--------------------------------------------------------------------------
case_key = "bank_approval_pending_invitation_sent"

kb_entry = search_kb(case_key=case_key)

kb_context = ""

if kb_entry and "articles" in kb_entry:
    kb_context = "\nKnowledge Base references:\n"

    for i, article in enumerate(kb_entry["articles"], 1):
        kb_context += f"""
{i}. {article['title']}
Summary: {article['summary']}
Source: {article['url']}
"""


problem_description = """ pending bank approval, explain to the supplier how to complete the bank approval task
"""
email_thread = """Hi 

Are you able to let me know what is missing on this vendors profile for it to be completed please?

Canal & River Trust GB153188 - 100021747

Kind regards,


"""

if case_key in RESOLUTION_GUIDES:
    selected_case = RESOLUTION_GUIDES[case_key]

    resolution_guidance = f"""
Case: {selected_case['case_name']}

Resolution steps:
- """ + "\n- ".join(selected_case["guidance"])

else:
    resolution_guidance = """
Case: Unknown issue

Instructions:
- Politely acknowledge the request
- Ask for clarification
- Do not assume or resolve
"""

reply = generate_support_reply(
    problem_description,
    email_thread,
    resolution_guidance,
    kb_context
)

print("\n--- GENERATED SUPPORT REPLY ---\n")
print(reply)


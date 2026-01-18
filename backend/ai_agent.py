from openai import OpenAI
from dotenv import load_dotenv
import os
from kb_search import search_kb, KB_GENERAL
import json
# Cargar variables desde el archivo .env
load_dotenv()

# Obtener la API key
OPENAI_API_KEY = os.getenv("API_KEY")

#---------------------------------



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
GENERIC_RESOLUTION_GUIDANCE = """
Case: General support request (no specific case identified)

Instructions:
- Carefully analyze the email thread and problem description
- Identify the most likely issue based on the context
- Use the provided Knowledge Base articles as guidance
- Provide clear next steps to the supplier or customer
- If information is missing, request clarification politely
- Do not assume details that are not explicitly stated
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


def get_kb_context(case_key=None, max_articles=3):
    """
    Returns a formatted KB context string.
    Uses case-specific KB if available, otherwise falls back to general KB.
    """

    kb_entry = search_kb(case_key=case_key)

    # Fallback to general KB
    if not kb_entry:
        kb_entry = KB_GENERAL

    if "articles" not in kb_entry:
        return ""

    # Sort articles by weight (if present)
    articles = sorted(
        kb_entry["articles"],
        key=lambda a: a.get("weight", 1),
        reverse=True
    )

    context = "\nKnowledge Base references:\n"

    for i, article in enumerate(articles[:max_articles], 1):
        context += f"""
{i}. {article['title']}
Summary: {article['summary']}
Source: {article['url']}
"""

    return context

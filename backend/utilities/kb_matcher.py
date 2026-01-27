def select_case_key(case_summary: str, resolution_guides: dict) -> str:
    summary = case_summary.lower()
    best_match = None
    best_score = 0
    print(summary)
    
    for case_key, config in resolution_guides.items():
        keywords = config.get("keywords", [])
        score = sum(1 for kw in keywords if kw.lower() in summary)
        print(case_key, "→ score:", score)
        if score > best_score:
            best_score = score
            best_match = case_key

    return best_match if best_match else "others"

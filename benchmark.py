import requests
import time
import json
import sys

# Rogatekno Labs - Professional Research Validation Suite

API_URL = "http://localhost:8000/v1/chat/completions"

TEST_CASES = [
    {
        "id": "BASELINE",
        "category": "Basic Knowledge",
        "prompt": "Explain the importance of 1-bit quantization in 3 short sentences."
    },
    {
        "id": "CREATIVE",
        "category": "Creative Writing",
        "prompt": "Write a short 1-paragraph story about a robot living in a world without electricity."
    }
]

def run_test_case(case):
    print(f"\n[TESTING] Category: {case['category']}")
    print(f"Prompt: \"{case['prompt'][:50]}...\"")
    print("-" * 30)
    
    payload = {
        "messages": [
            {"role": "system", "content": "You are a professional research assistant. Provide accurate and well-formatted responses."},
            {"role": "user", "content": case['prompt']}
        ],
        "stream": True
    }
    
    start_time = time.time()
    first_token_time = None
    token_count = 0
    
    try:
        response = requests.post(API_URL, json=payload, stream=True, timeout=60)
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                line_text = line.decode('utf-8')
                if line_text.startswith("data: "):
                    data_str = line_text[6:].strip()
                    if data_str == "[DONE]": break
                    
                    try:
                        data = json.loads(data_str)
                        content = data['choices'][0]['delta'].get('content', '')
                        if content:
                            if first_token_time is None: first_token_time = time.time()
                            token_count += 1
                            sys.stdout.write(content)
                            sys.stdout.flush()
                    except: continue
                        
    except Exception as e:
        print(f"\n[ERROR] Case {case['id']} failed: {e}")
        return None
    
    end_time = time.time()
    gen_duration = end_time - (first_token_time or start_time)
    tps = token_count / gen_duration if gen_duration > 0 else 0
    
    print(f"\n\n[DONE] {token_count} tokens in {gen_duration:.2f}s ({tps:.2f} t/s)")
    return {
        "category": case['category'],
        "tokens": token_count,
        "duration": f"{gen_duration:.2f}s",
        "speed": f"{tps:.2f}"
    }

def print_markdown_report(results):
    print("\n" + "="*60)
    print("RESEARCH VALIDATION REPORT (Rogatekno Labs)")
    print("="*60)
    print("\nCopy the table below into your README or Research Report:\n")
    
    table = "| Category | Total Tokens | Duration | Speed (t/s) |\n"
    table += "| :--- | :--- | :--- | :--- |\n"
    
    for r in results:
        if r:
            table += f"| {r['category']} | {r['tokens']} | {r['duration']} | **{r['speed']}** |\n"
    
    print(table)
    print("="*60)

if __name__ == "__main__":
    print("Rogatekno Labs - Research Validation Suite v2.0")
    print("-" * 60)
    
    results = []
    for case in TEST_CASES:
        res = run_test_case(case)
        results.append(res)
        time.sleep(2) # Cooldown between runs
        
    print_markdown_report(results)

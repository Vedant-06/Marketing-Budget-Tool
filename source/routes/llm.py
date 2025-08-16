import os
from .constants import SYSTEM_PROMPT, PROMPT
import json5
from google import genai
from google.genai import types
import re
import os

def callLLMForBudgetAllocation(company_name, budget, goal):
  
  goal_ = {
    "generate_leads": "Attract and capture potential customers through targeted ads, landing pages, gated content, and lead magnets to grow the customer base.",
    "brand_awareness": "Increase recognition and visibility of the brand using social media, influencer partnerships, PR, and content marketing.",
    "increase_sales": "Boost revenue through promotional offers, retargeting ads, upselling, cross-selling, and optimized sales funnels.",
    "website_traffic": "Drive more visitors to the website using SEO, paid search, content marketing, and social media campaigns."
  }

  prompt = PROMPT.format(company_name, budget, goal_[goal])
  priors, answer, citations = get_grounded_response_citations(SYSTEM_PROMPT + prompt)

  citations_from_text = extract_sources_only(answer)
  return priors, citations_from_text, citations

def extract_json_loose(text):
    """
    Extract JSON from an LLM output, tolerating common formatting errors via json5.
    """
    # Grab JSON-like block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in text.")
    
    json_str = match.group(0)

    # Try parsing with json5 (tolerates single quotes, unquoted keys, trailing commas)
    try:
        return json5.loads(json_str)
    except Exception as e:
        raise ValueError(f"Could not parse even with loose parser: {e}")


def add_citations(response):
    citation_links = []
    if response.candidates and response.candidates[0].grounding_metadata and response.candidates[0].grounding_metadata.grounding_supports:
        supports = response.candidates[0].grounding_metadata.grounding_supports
        chunks = response.candidates[0].grounding_metadata.grounding_chunks

        # Sort supports by end_index in descending order to avoid shifting issues when inserting.
        sorted_supports = sorted(supports, key=lambda s: s.segment.end_index, reverse=True)

        for support in sorted_supports:
            if support.grounding_chunk_indices:
                for i in support.grounding_chunk_indices:
                    if i < len(chunks):
                        uri = chunks[i].web.uri
                        citation_links.append(uri)
    return citation_links

def get_grounded_response_citations(prompt_text):
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            GEMINI_KEY = os.getenv('GEMINI_KEY')
            client = genai.Client(api_key=GEMINI_KEY)

            grounding_tool = types.Tool(
                google_search=types.GoogleSearch()
            )

            config = types.GenerateContentConfig(
                tools=[grounding_tool]
            )

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt_text,
                config=config
            )

            text_with_citations = add_citations(response)
            answer = extract_json_loose(response.text)
            return answer, response.text, text_with_citations
        except Exception as e:
            print(f"Attempt {attempt+1} failed: {e}")
            if attempt == max_retries - 1:
                print("Max retries reached. Returning empty result.")
                return ('', [])

def extract_sources_only(text: str):
    # Find all URLs in the remaining text
    urls = re.findall(r'https?://\S+', text)
    return urls
  
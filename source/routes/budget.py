from flask import Blueprint, jsonify, request
import re
import json
from .llm import callLLMForBudgetAllocation
from .optimization import calculate_budget_allocation


budget_bp = Blueprint('budget', __name__)

def extract_citation_number(text):
    matches = re.findall(r"\[([^\]]+)\]", text)
    return [int(match) for match in matches if match.isdigit()]

@budget_bp.route('/allocate', methods=['POST'])
def allocate_budget():
    """Main endpoint for budget allocation"""
    try:
        data = request.json
        print("Received data:", data)  # Debugging line
        company_name = data.get('company_name')
        budget = float(data.get('monthly_budget'))
        goal = data.get('primary_goal')
        assumptions = data.get('constraints', {})
        assumptions = {k.replace('_min', ''): v for k, v in assumptions.items()}
        print(assumptions)
        # Simple cache system (in-memory, per-process)
        # Key: tuple (company_name, budget, goal)
        # Value: (priors, citations_text, extra_citations)
        global _priors_cache
        if '_priors_cache' not in globals():
            _priors_cache = {}

        cache_key = (company_name, budget, goal)

        if cache_key in _priors_cache:
            priors, citations_text, extra_citations = _priors_cache[cache_key]
            print('Using cached priors')
        else:
            priors, citations_text, extra_citations = callLLMForBudgetAllocation(company_name, budget, goal)
            _priors_cache[cache_key] = (priors, citations_text, extra_citations)
            print('Fetched new priors from LLM')

        reasoning = priors.get('reasoning', '')
        print("Priors:", json.dumps(priors, indent=2))  # Debugging line
        try:
            summary, allocation = calculate_budget_allocation(priors['channel'], budget, assumptions)
        except:
            del _priors_cache

        response = {
            'allocation': allocation,
            'confidence_intervals': summary.to_json(),
            'explanation': reasoning,
            'citations': citations_text,
            'additional_info': list(set(extra_citations) - set(citations_text))
        }

        print("Response:", json.dumps(response, indent=2))
        return jsonify(response)

    except Exception as e:
        print(f"Error in budget allocation: {e} {e.stacktrace()}")
        return jsonify({'error': str(e)}), 400

@budget_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'marketing_budget_tool'})


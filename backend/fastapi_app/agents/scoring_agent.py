"""
Scoring Agent
Uses Azure OpenAI to evaluate technical assessment answers.
"""
import os
import json
from openai import AzureOpenAI
from core.logging import log_error, api_logger

# Initialize Azure OpenAI Client
api_key = os.environ.get("AZURE_OPENAI_API_KEY")
api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")
azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")

client = None
if api_key and azure_endpoint:
    try:
        client = AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint
        )
    except Exception as e:
        log_error(e, context="AzureOpenAI Client Initialization")

async def evaluate_answer(question: str, desired_answer: str, candidate_answer: str) -> dict:
    """
    Evaluates a candidate's answer against a desired answer for a specific question.
    Returns a dictionary with 'score' (0-10) and 'reasoning' (text).
    """
    if not client:
        api_logger.warning("Azure OpenAI client not initialized. Skipping AI scoring.")
        return {"score": 0, "reasoning": "AI Scoring unavailable (configuration missing)."}

    prompt = f"""
    You are an expert technical interviewer. Evaluate the candidate's answer based on the question and the desired answer provided by the employer.
    
    Question: {question}
    Desired Answer / Key Points: {desired_answer}
    Candidate's Answer: {candidate_answer}
    
    Task:
    1. Score the answer from 0 to 10 (0 being completely wrong or irrelevant, 10 being perfect).
    2. Provide a brief reasoning for the score. Explain what was missed or what was good.
    3. Be critical but fair. If the candidate misses key keywords from the desired answer but explains the concept correctly, give partial credit.

    Output Format (JSON):
    {{
        "score": <integer>,
        "reasoning": "<string>"
    }}
    """

    try:
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant designed to output JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )

        content = response.choices[0].message.content
        result = json.loads(content)
        
        return {
            "score": result.get("score", 0),
            "reasoning": result.get("reasoning", "No reasoning provided.")
        }

    except Exception as e:
        log_error(e, context="evaluate_answer")
        return {
            "score": 0,
            "reasoning": f"Error during AI evaluation: {str(e)}"
        }

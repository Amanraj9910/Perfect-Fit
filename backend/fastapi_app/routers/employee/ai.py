
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from openai import AsyncAzureOpenAI
import os

from typing import List, Optional, Dict

from dependencies import get_user_with_role
from core.logging import api_logger, log_error

router = APIRouter()

# Initialize Azure OpenAI Client
client = AsyncAzureOpenAI(
    api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
    api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT")
)

DEPLOYMENT_NAME = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")

class GenerateRequest(BaseModel):
    field_name: str = Field(..., description="Field to generate content for (description, responsibilities, requirements, technical_questions)")
    context: str = Field(..., description="Job Title and basic context")
    tone: str = "professional"

class GenerateResponse(BaseModel):
    content: str
    technical_questions: Optional[List[Dict[str, str]]] = None

async def verify_employee(user: dict = Depends(get_user_with_role)):
    """Verify user is employee or admin."""
    if user["role"] not in ["employee", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee privileges required"
        )
    return user

@router.post("/generate", response_model=GenerateResponse)
async def generate_content(
    request: GenerateRequest,
    user: dict = Depends(verify_employee)
):
    """Generate content for job description or responsibilities using AI."""
    api_logger.info(f"Generating content for {request.field_name} (User: {user['id']})")
    
    try:
        if not os.environ.get("AZURE_OPENAI_API_KEY"):
             # Mock response if no key (for dev/demo without cost)
             # return GenerateResponse(content="AI key not configured. This is a placeholder.")
             raise HTTPException(status_code=500, detail="Azure OpenAI API Key not configured")

        prompt = ""
        is_json = False
        
        if request.field_name == "technical_questions":
            is_json = True
            # Check if there's specific instruction in context (e.g. "Title: .NET Developer | Focus: Async")
            job_title = request.context.split('|')[0].strip() if '|' in request.context else request.context
            focus_area = request.context.split('|')[1].strip() if '|' in request.context else ""
            
            prompt = (
                f"Generate 5 technical interview questions for a '{job_title}' role."
                f"{f' Focus specifically on: {focus_area}. ' if focus_area else ''}"
                "Include a desired answer for each. "
                "Output valid JSON as a list of objects with keys: 'question' and 'desired_answer'."
            )
        elif request.field_name == "description":
            prompt = (
                f"Write a concise, high-impact job description for a '{request.context}' role. "
                "Limit output to (approx 150 words). "
                "Focus strictly on the role's core purpose and impact in points. "
                "Format the output as bullet points. "
                "Do NOT include sections like 'Key Responsibilities', 'Requirements', 'Benefits', or 'Why Join Us' as these have their own fields."
            )
        elif request.field_name == "responsibilities":
            prompt = f"List 5-7 key responsibilities for a '{request.context}' role. Return them as a bulleted list."
        elif request.field_name == "requirements":
            prompt = (
                f"List the top 5-7 essential technical and soft skill requirements for a '{request.context}' role. "
                "Return them as a concise bulleted list."
            )
        elif request.field_name == "key_business_objective":
            prompt = f"Write a single sentence describing the key business objective or impact of a '{request.context}' role."
        else:
            prompt = f"Write content for '{request.field_name}' for a job titled '{request.context}'."

        messages = [
            {"role": "system", "content": "You are an expert HR copywriter." + (" Output valid JSON." if is_json else "")},
            {"role": "user", "content": prompt}
        ]

        kwargs = {
            "model": DEPLOYMENT_NAME,
            "messages": messages,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        if is_json:
            kwargs["response_format"] = { "type": "json_object" }

        response = await client.chat.completions.create(**kwargs)
        
        content = response.choices[0].message.content.strip()
        
        if is_json:
            import json
            try:
                data = json.loads(content)
                # Handle if it returns a wrapper object (e.g. {"questions": [...]}) or direct list (though schema usually enforces object root for json_object mode)
                questions = []
                if isinstance(data, list):
                    questions = data
                elif "questions" in data:
                    questions = data["questions"]
                elif "technical_questions" in data:
                    questions = data["technical_questions"]
                
                return GenerateResponse(content="Generated questions", technical_questions=questions)
            except json.JSONDecodeError:
                return GenerateResponse(content=content)

        return GenerateResponse(content=content)

    except Exception as e:
        log_error(e, context="generate_content")
        raise HTTPException(status_code=500, detail="Failed to generate content")

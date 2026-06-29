import json
from pydantic import BaseModel, Field
from typing import List
from llm_client import execute_llm

class SubTaskSchema(BaseModel):
    title: str = Field(description="Actionable subtask title, concise and clear")
    completed: bool = Field(default=False, description="Completion status, defaults to false")

class SplitTaskSchema(BaseModel):
    title: str = Field(description="Enhanced task title, making it professional and clear")
    description: str = Field(description="Enhanced task description, adding clear details or steps")
    priority: str = Field(description="Suggested priority: P0 (Urgent/Critical), P1 (Normal), or P2 (Low/Leisure)")
    estimated_time: str = Field(description="Predicted time required to complete the task, e.g., '3 hours', '1 day'")
    sub_tasks: List[SubTaskSchema] = Field(description="A list of 3-5 subtasks that split the main task")

def split_task(title: str, description: str, config) -> dict:
    system_prompt = """You are an expert AI Project Manager. Your job is to take a user's task title and description, analyze it, and return a structured JSON response to break down the task.

You MUST follow these requirements:
1. Split the task into 3 to 5 logical, actionable, and sequential subtasks.
2. Estimate the total time required to complete the main task (e.g., "4 hours", "2 days", "30 minutes").
3. Assign a priority level: "P0" (critical/urgent), "P1" (normal), or "P2" (low priority/leisure).
4. Enhance the task title and description to make them clearer, more professional, and well-structured, but preserve the user's original intent.

You MUST respond ONLY with a valid JSON object matching this schema:
{
  "title": "enhanced title",
  "description": "enhanced description including AI analysis notes",
  "priority": "P0/P1/P2",
  "estimated_time": "estimated time",
  "sub_tasks": [
    {"title": "subtask 1", "completed": false},
    {"title": "subtask 2", "completed": false}
  ]
}

Ensure the output is 100% valid JSON, containing no markdown formatting (like ```json ... ```), no leading or trailing text, and no comments.
"""

    user_prompt = f"Task Title: {title}\nTask Description: {description}"
    
    try:
        # Call LLM with JSON Mode
        raw_response = execute_llm(
            config=config,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_format={"type": "json_object"},
            max_tokens=1000
        )
        
        # Clean response if it contains markdown code blocks
        clean_response = raw_response.strip()
        if clean_response.startswith("```"):
            # Remove leading and trailing fences
            lines = clean_response.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_response = "\n".join(lines).strip()
            
        # Parse and validate with Pydantic
        parsed_data = SplitTaskSchema.model_validate_json(clean_response)
        return parsed_data.model_dump()
        
    except Exception as e:
        print(f"[SplitService] Error splitting task or parsing JSON: {e}. Executing fallback...")
        # Defensive fallback response
        priority = "P1"
        title_lower = title.lower()
        if any(kw in title_lower for kw in ["紧急", "立刻", "核心", "重要", "urgent", "must"]):
            priority = "P0"
        elif any(kw in title_lower for kw in ["闲暇", "有空", "随便", "leisure", "when free"]):
            priority = "P2"
            
        return {
            "title": f"[AI 智能生成] {title}",
            "description": f"{description}\n\n[AI 提示：由于大模型响应或格式化异常，已启动本地规则引擎生成此方案。]",
            "priority": priority,
            "estimated_time": "4 hours (估算)",
            "sub_tasks": [
                {"title": "调研与步骤拆解", "completed": False},
                {"title": "核心模块开发与调试", "completed": False},
                {"title": "结果验证与总结记录", "completed": False}
            ]
        }

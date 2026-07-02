import argparse
import asyncio
import json
import traceback
import grpc
from concurrent import futures
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

import todo_ai_pb2
import todo_ai_pb2_grpc
from split_service import split_task
from rag_service import query_rag
from llm_client import execute_llm, execute_llm_stream

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start gRPC server
    print("Starting gRPC server on port 50051...")
    grpc_server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    todo_ai_pb2_grpc.add_AIServiceServicer_to_server(AIService(), grpc_server)
    grpc_server.add_insecure_port('0.0.0.0:50051')
    grpc_server.start()
    app.state.grpc_server = grpc_server
    print("gRPC server started successfully.")
    
    yield
    
    # Shutdown: Stop gRPC server gracefully
    print("Stopping gRPC server...")
    if hasattr(app.state, "grpc_server"):
        app.state.grpc_server.stop(grace=5)  # 5秒优雅关闭时间
        print("gRPC server stopped.")

app = FastAPI(title="SmartTodo AI Gateway", lifespan=lifespan)

# Why: gRPC uses ThreadPoolExecutor (sync threads), but llm_client is now async.
# We need asyncio.run() to bridge sync gRPC methods to async llm_client calls.
# Each gRPC thread gets its own event loop to avoid blocking the main async loop.

class AIService(todo_ai_pb2_grpc.AIServiceServicer):
    def Ping(self, request, context):
        print(f"[gRPC] Ping received: {request.value}")
        return todo_ai_pb2.PingResponse(value=f"Pong: {request.value}")

    def SplitTask(self, request, context):
        print(f"[gRPC] SplitTask received for title: '{request.title}'")
        try:
            result = asyncio.run(split_task(request.title, request.description, request.config))
            
            # Map subtasks to proto messages
            sub_tasks = [
                todo_ai_pb2.SubTask(title=st["title"], completed=st["completed"])
                for st in result.get("sub_tasks", [])
            ]
            
            return todo_ai_pb2.SplitTaskResponse(
                title=result.get("title", f"[AI] {request.title}"),
                description=result.get("description", request.description),
                priority=result.get("priority", "P1"),
                estimated_time=result.get("estimated_time", "4 hours"),
                sub_tasks=sub_tasks
            )
        except Exception as e:
            print(f"[gRPC] Error in SplitTask: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return todo_ai_pb2.SplitTaskResponse()

    def Chat(self, request, context):
        print(f"[gRPC] Chat received: '{request.message}'")
        try:
            # Build conversation history context
            history_context = ""
            if request.history:
                for msg in request.history:
                    role_name = "User" if msg.role == "user" else "Assistant"
                    history_context += f"{role_name}: {msg.content}\n"
            
            system_prompt = (
                "You are a helpful, professional, and friendly AI assistant built into the SmartTodo app. "
                "Keep your answers helpful, clear, and concise."
            )
            
            if history_context:
                user_prompt = f"Below is the conversation history:\n{history_context}\nUser: {request.message}\nAssistant:"
            else:
                user_prompt = request.message
                
            # Default chatbot to cloud model (with hybrid auto-failover to local Ollama)
            response_text = asyncio.run(execute_llm(
                config=request.config,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=1000
            ))
            
            return todo_ai_pb2.ChatResponse(response=response_text)
        except Exception as e:
            print(f"[gRPC] Error in Chat: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return todo_ai_pb2.ChatResponse()

    def RAGQuery(self, request, context):
        print(f"[gRPC] RAGQuery received: '{request.query}'")
        cfg = request.config
        if cfg and cfg.mode:
            print(f"[gRPC] RAGQuery config: mode={cfg.mode}, local_model={cfg.model_local}, cloud_model={cfg.model_cloud}")
        else:
            print("[gRPC] RAGQuery config: empty, will use default hybrid settings")
        try:
            answer = asyncio.run(query_rag(request.query, request.doc_content, request.config))
            return todo_ai_pb2.RAGQueryResponse(answer=answer)
        except Exception as e:
            print(f"[gRPC] Error in RAGQuery: {e}")
            traceback.print_exc()
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return todo_ai_pb2.RAGQueryResponse()

@app.get("/health")
def health():
    return {"status": "healthy", "service": "AI Gateway"}


# --- SSE Streaming Chat Endpoint ---

class StreamChatMessage(BaseModel):
    role: str
    content: str

class StreamChatRequest(BaseModel):
    message: str
    history: Optional[List[StreamChatMessage]] = None
    config: Optional[dict] = None

@app.post("/v1/chat/stream")
async def chat_stream(req: StreamChatRequest):
    """
    SSE streaming chat endpoint. Returns Server-Sent Events with token-by-token output.
    The Go backend proxies this to the frontend.
    """
    # Build conversation history context
    history_context = ""
    if req.history:
        for msg in req.history:
            role_name = "User" if msg.role == "user" else "Assistant"
            history_context += f"{role_name}: {msg.content}\n"

    system_prompt = (
        "You are a helpful, professional, and friendly AI assistant built into the SmartTodo app. "
        "Keep your answers helpful, clear, and concise."
    )

    if history_context:
        user_prompt = f"Below is the conversation history:\n{history_context}\nUser: {req.message}\nAssistant:"
    else:
        user_prompt = req.message

    # Build a config object from the dict
    class ConfigObj:
        pass
    config_obj = ConfigObj()
    if req.config:
        config_obj.mode = req.config.get("mode", "hybrid")
        config_obj.local_endpoint = req.config.get("localEndpoint", "http://localhost:11434")
        config_obj.cloud_endpoint = req.config.get("cloudEndpoint", "https://api.deepseek.com/v1")
        config_obj.api_key = req.config.get("apiKey", "")
        config_obj.model_local = req.config.get("modelLocal", "qwen2.5:7b")
        config_obj.model_cloud = req.config.get("modelCloud", "deepseek-chat")
    else:
        config_obj.mode = "hybrid"
        config_obj.local_endpoint = "http://localhost:11434"
        config_obj.cloud_endpoint = "https://api.deepseek.com/v1"
        config_obj.api_key = ""
        config_obj.model_local = "qwen2.5:7b"
        config_obj.model_cloud = "deepseek-chat"

    return StreamingResponse(
        execute_llm_stream(config_obj, system_prompt, user_prompt, max_tokens=1000),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )



def main():
    # Start FastAPI web server (blocking)
    # gRPC server will be started automatically via the lifespan context manager
    parser = argparse.ArgumentParser(description="SmartTodo AI Service")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()
    
    print("Starting FastAPI server on port 8000...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        reload=args.reload
    )

if __name__ == "__main__":
    main()

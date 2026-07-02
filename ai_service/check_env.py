#!/usr/bin/env python3
"""
SmartTodo AI 服务环境检查脚本
用于诊断和验证开发环境配置
"""

import sys
import subprocess
import importlib
import os

def check_python_version():
    """检查 Python 版本"""
    print("=" * 60)
    print("1. Python 版本检查")
    print("=" * 60)
    version = sys.version_info
    print(f"当前 Python 版本: {version.major}.{version.minor}.{version.micro}")
    if version.major < 3 or (version.major == 3 and version.minor < 12):
        print("[ERROR] Python 版本过低，需要 >= 3.12")
        return False
    print("[OK] Python 版本符合要求")
    return True

def check_protobuf_version():
    """检查 protobuf 版本"""
    print("\n" + "=" * 60)
    print("2. Protobuf 版本检查")
    print("=" * 60)
    try:
        import google.protobuf
        version = google.protobuf.__version__
        print(f"当前 protobuf 版本: {version}")

        # 检查是否满足桩代码要求
        major, minor, patch = map(int, version.split('.'))
        if major < 6 or (major == 6 and minor < 33):
            print("[ERROR] 错误: protobuf 版本过低，桩代码需要 >= 6.33.5")
            print("   请运行: uv pip install 'protobuf>=6.33.5'")
            return False
        print("[OK] protobuf 版本符合要求")
        return True
    except ImportError:
        print("[ERROR] 错误: protobuf 未安装")
        return False

def check_grpc_version():
    """检查 gRPC 版本"""
    print("\n" + "=" * 60)
    print("3. gRPC 版本检查")
    print("=" * 60)
    try:
        import grpc
        version = grpc.__version__
        print(f"当前 gRPC 版本: {version}")
        print("[OK] gRPC 已安装")
        return True
    except ImportError:
        print("[ERROR] 错误: grpcio 未安装")
        return False

def check_openai_version():
    """检查 OpenAI SDK 版本"""
    print("\n" + "=" * 60)
    print("4. OpenAI SDK 版本检查")
    print("=" * 60)
    try:
        import openai
        version = openai.__version__
        print(f"当前 OpenAI SDK 版本: {version}")
        print("[OK] OpenAI SDK 已安装")
        return True
    except ImportError:
        print("[ERROR] 错误: openai 未安装")
        return False

def check_fastapi_version():
    """检查 FastAPI 版本"""
    print("\n" + "=" * 60)
    print("5. FastAPI 版本检查")
    print("=" * 60)
    try:
        import fastapi
        version = fastapi.__version__
        print(f"当前 FastAPI 版本: {version}")
        print("[OK] FastAPI 已安装")
        return True
    except ImportError:
        print("[ERROR] 错误: fastapi 未安装")
        return False

def check_pydantic_version():
    """检查 Pydantic 版本"""
    print("\n" + "=" * 60)
    print("6. Pydantic 版本检查")
    print("=" * 60)
    try:
        import pydantic
        version = pydantic.__version__
        print(f"当前 Pydantic 版本: {version}")
        print("[OK] Pydantic 已安装")
        return True
    except ImportError:
        print("[ERROR] 错误: pydantic 未安装")
        return False

def check_pb2_module():
    """检查 protobuf 桩代码模块"""
    print("\n" + "=" * 60)
    print("7. Protobuf 桩代码模块检查")
    print("=" * 60)
    try:
        import todo_ai_pb2
        import todo_ai_pb2_grpc
        print("[OK] todo_ai_pb2 模块加载成功")
        print("[OK] todo_ai_pb2_grpc 模块加载成功")
        return True
    except Exception as e:
        print(f"[ERROR] 错误: 无法加载桩代码模块: {e}")
        return False

def check_uv_environment():
    """检查是否在 uv 虚拟环境中"""
    print("\n" + "=" * 60)
    print("8. UV 虚拟环境检查")
    print("=" * 60)

    # 检查是否有 .venv 目录
    if os.path.exists('.venv'):
        print("[OK] .venv 目录存在")
    else:
        print("[WARN]  警告: .venv 目录不存在")
        print("   请运行: uv sync")
        return False

    # 检查当前 Python 是否在 .venv 中
    python_path = sys.executable
    if '.venv' in python_path:
        print(f"[OK] 当前 Python 在虚拟环境中: {python_path}")
        return True
    else:
        print(f"[WARN]  警告: 当前 Python 不在虚拟环境中: {python_path}")
        print("   请使用: uv run python check_env.py")
        return False

def main():
    """主检查流程"""
    print("\n" + "=" * 60)
    print("SmartTodo AI 服务环境检查")
    print("=" * 60 + "\n")

    results = []

    # 运行所有检查
    results.append(("Python 版本", check_python_version()))
    results.append(("Protobuf 版本", check_protobuf_version()))
    results.append(("gRPC 版本", check_grpc_version()))
    results.append(("OpenAI SDK", check_openai_version()))
    results.append(("FastAPI", check_fastapi_version()))
    results.append(("Pydantic", check_pydantic_version()))
    results.append(("桩代码模块", check_pb2_module()))
    results.append(("UV 虚拟环境", check_uv_environment()))

    # 汇总结果
    print("\n" + "=" * 60)
    print("检查结果汇总")
    print("=" * 60)

    failed = []
    for name, result in results:
        status = "[OK] 通过" if result else "[ERROR] 失败"
        print(f"{name}: {status}")
        if not result:
            failed.append(name)

    print("\n" + "=" * 60)
    if failed:
        print(f"[ERROR] 发现 {len(failed)} 个问题需要修复:")
        for name in failed:
            print(f"   - {name}")
        print("\n建议:")
        print("1. 确保使用 uv 管理 Python 环境")
        print("2. 运行 'uv sync' 安装所有依赖")
        print("3. 使用 'uv run python main.py' 启动服务")
        return 1
    else:
        print("[OK] 所有检查通过！环境配置正确。")
        print("\n可以使用以下命令启动 AI 服务:")
        print("  uv run python main.py")
        return 0

if __name__ == "__main__":
    sys.exit(main())

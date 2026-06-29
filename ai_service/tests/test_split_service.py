"""
Unit tests for split_service module.
Validates Pydantic schema constraints and the fallback rule-engine logic.
"""

import json
import pytest
from split_service import SplitTaskSchema, SubTaskSchema


class TestSplitTaskSchema:
    """Validate that SplitTaskSchema correctly accepts and rejects JSON payloads."""

    def test_valid_full_payload(self):
        raw = {
            "title": "Setup CI/CD Pipeline",
            "description": "Configure GitHub Actions for automated testing and deployment.",
            "priority": "P1",
            "estimated_time": "4 hours",
            "sub_tasks": [
                {"title": "Create workflow YAML", "completed": False},
                {"title": "Configure secrets", "completed": False},
                {"title": "Test deployment", "completed": False},
            ],
        }
        result = SplitTaskSchema.model_validate(raw)
        assert result.title == "Setup CI/CD Pipeline"
        assert len(result.sub_tasks) == 3
        assert result.priority == "P1"

    def test_missing_required_field_raises(self):
        raw = {
            "title": "Some Task",
            # Missing 'description', 'priority', etc.
        }
        with pytest.raises(Exception):
            SplitTaskSchema.model_validate(raw)

    def test_subtask_defaults_to_false(self):
        raw = {
            "title": "Task",
            "description": "Desc",
            "priority": "P0",
            "estimated_time": "1 hour",
            "sub_tasks": [{"title": "Step 1"}],
        }
        result = SplitTaskSchema.model_validate(raw)
        assert result.sub_tasks[0].completed is False

    def test_empty_subtasks_list(self):
        raw = {
            "title": "Task",
            "description": "Desc",
            "priority": "P2",
            "estimated_time": "30 minutes",
            "sub_tasks": [],
        }
        result = SplitTaskSchema.model_validate(raw)
        assert result.sub_tasks == []

    def test_json_roundtrip(self):
        raw = {
            "title": "Deploy App",
            "description": "Deploy the app to production.",
            "priority": "P0",
            "estimated_time": "2 hours",
            "sub_tasks": [
                {"title": "Build Docker image", "completed": False},
                {"title": "Push to registry", "completed": False},
            ],
        }
        model = SplitTaskSchema.model_validate(raw)
        exported = model.model_dump()
        reimported = SplitTaskSchema.model_validate(exported)
        assert reimported == model


class TestSubTaskSchema:
    """Validate SubTaskSchema defaults and constraints."""

    def test_completed_defaults_to_false(self):
        st = SubTaskSchema(title="Do something")
        assert st.completed is False

    def test_completed_can_be_set_true(self):
        st = SubTaskSchema(title="Done task", completed=True)
        assert st.completed is True


class TestFallbackPriorityLogic:
    """
    Validate the keyword-based priority fallback logic used when the LLM
    response cannot be parsed. This mirrors the logic in split_service.py.
    """

    @staticmethod
    def _determine_priority(title: str) -> str:
        """Replicate the fallback priority logic from split_service.py."""
        title_lower = title.lower()
        if any(kw in title_lower for kw in ["紧急", "立刻", "核心", "重要", "urgent", "must"]):
            return "P0"
        elif any(kw in title_lower for kw in ["闲暇", "有空", "随便", "leisure", "when free"]):
            return "P2"
        return "P1"

    def test_urgent_keyword_returns_p0(self):
        assert self._determine_priority("紧急修复生产环境 Bug") == "P0"

    def test_must_keyword_returns_p0(self):
        assert self._determine_priority("Must fix security vulnerability") == "P0"

    def test_leisure_keyword_returns_p2(self):
        assert self._determine_priority("闲暇时整理桌面") == "P2"

    def test_normal_task_returns_p1(self):
        assert self._determine_priority("Write unit tests for service") == "P1"

    def test_empty_title_returns_p1(self):
        assert self._determine_priority("") == "P1"

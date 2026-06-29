from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class AIConfig(_message.Message):
    __slots__ = ("mode", "local_endpoint", "cloud_endpoint", "api_key", "model_local", "model_cloud")
    MODE_FIELD_NUMBER: _ClassVar[int]
    LOCAL_ENDPOINT_FIELD_NUMBER: _ClassVar[int]
    CLOUD_ENDPOINT_FIELD_NUMBER: _ClassVar[int]
    API_KEY_FIELD_NUMBER: _ClassVar[int]
    MODEL_LOCAL_FIELD_NUMBER: _ClassVar[int]
    MODEL_CLOUD_FIELD_NUMBER: _ClassVar[int]
    mode: str
    local_endpoint: str
    cloud_endpoint: str
    api_key: str
    model_local: str
    model_cloud: str
    def __init__(self, mode: _Optional[str] = ..., local_endpoint: _Optional[str] = ..., cloud_endpoint: _Optional[str] = ..., api_key: _Optional[str] = ..., model_local: _Optional[str] = ..., model_cloud: _Optional[str] = ...) -> None: ...

class PingRequest(_message.Message):
    __slots__ = ("value",)
    VALUE_FIELD_NUMBER: _ClassVar[int]
    value: str
    def __init__(self, value: _Optional[str] = ...) -> None: ...

class PingResponse(_message.Message):
    __slots__ = ("value",)
    VALUE_FIELD_NUMBER: _ClassVar[int]
    value: str
    def __init__(self, value: _Optional[str] = ...) -> None: ...

class SplitTaskRequest(_message.Message):
    __slots__ = ("title", "description", "config")
    TITLE_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    CONFIG_FIELD_NUMBER: _ClassVar[int]
    title: str
    description: str
    config: AIConfig
    def __init__(self, title: _Optional[str] = ..., description: _Optional[str] = ..., config: _Optional[_Union[AIConfig, _Mapping]] = ...) -> None: ...

class SubTask(_message.Message):
    __slots__ = ("title", "completed")
    TITLE_FIELD_NUMBER: _ClassVar[int]
    COMPLETED_FIELD_NUMBER: _ClassVar[int]
    title: str
    completed: bool
    def __init__(self, title: _Optional[str] = ..., completed: _Optional[bool] = ...) -> None: ...

class SplitTaskResponse(_message.Message):
    __slots__ = ("title", "description", "priority", "estimated_time", "sub_tasks")
    TITLE_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    PRIORITY_FIELD_NUMBER: _ClassVar[int]
    ESTIMATED_TIME_FIELD_NUMBER: _ClassVar[int]
    SUB_TASKS_FIELD_NUMBER: _ClassVar[int]
    title: str
    description: str
    priority: str
    estimated_time: str
    sub_tasks: _containers.RepeatedCompositeFieldContainer[SubTask]
    def __init__(self, title: _Optional[str] = ..., description: _Optional[str] = ..., priority: _Optional[str] = ..., estimated_time: _Optional[str] = ..., sub_tasks: _Optional[_Iterable[_Union[SubTask, _Mapping]]] = ...) -> None: ...

class ChatMessage(_message.Message):
    __slots__ = ("role", "content")
    ROLE_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    role: str
    content: str
    def __init__(self, role: _Optional[str] = ..., content: _Optional[str] = ...) -> None: ...

class ChatRequest(_message.Message):
    __slots__ = ("message", "history", "config")
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    HISTORY_FIELD_NUMBER: _ClassVar[int]
    CONFIG_FIELD_NUMBER: _ClassVar[int]
    message: str
    history: _containers.RepeatedCompositeFieldContainer[ChatMessage]
    config: AIConfig
    def __init__(self, message: _Optional[str] = ..., history: _Optional[_Iterable[_Union[ChatMessage, _Mapping]]] = ..., config: _Optional[_Union[AIConfig, _Mapping]] = ...) -> None: ...

class ChatResponse(_message.Message):
    __slots__ = ("response",)
    RESPONSE_FIELD_NUMBER: _ClassVar[int]
    response: str
    def __init__(self, response: _Optional[str] = ...) -> None: ...

class RAGQueryRequest(_message.Message):
    __slots__ = ("query", "doc_content", "config")
    QUERY_FIELD_NUMBER: _ClassVar[int]
    DOC_CONTENT_FIELD_NUMBER: _ClassVar[int]
    CONFIG_FIELD_NUMBER: _ClassVar[int]
    query: str
    doc_content: str
    config: AIConfig
    def __init__(self, query: _Optional[str] = ..., doc_content: _Optional[str] = ..., config: _Optional[_Union[AIConfig, _Mapping]] = ...) -> None: ...

class RAGQueryResponse(_message.Message):
    __slots__ = ("answer",)
    ANSWER_FIELD_NUMBER: _ClassVar[int]
    answer: str
    def __init__(self, answer: _Optional[str] = ...) -> None: ...

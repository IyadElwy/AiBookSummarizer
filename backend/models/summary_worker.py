from pydantic import BaseModel


class SummaryJob(BaseModel):
    id: int
    model: str
    language: str

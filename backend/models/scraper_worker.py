from pydantic import BaseModel


class ScraperJob(BaseModel):
    id: int
    isbn: str
    model: str
    language: str

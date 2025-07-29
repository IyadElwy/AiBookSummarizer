import isbnlib

from enums.main_server import Models
from errors.exceptions import (
    ValidationException,
)


def validate_summary_creation_body(isbn: str, language: str, model: str):
    if not isbnlib.is_isbn10(isbn) and not isbnlib.is_isbn13(isbn):
        raise ValidationException('Isbn not valid')
    if language not in ['en', 'de', 'fr', 'es', 'it']:
        raise ValidationException('Language not valid')
    if model not in [member.name for member in Models]:
        print(model)
        print([member.name for member in Models])
        raise ValidationException('Model not valid')


def validate_id(task_id: int):
    if task_id <= 0:
        raise ValidationException('id must be valid')


def validate_page(page: int):
    if page <= 0:
        raise ValidationException('page must be valid')

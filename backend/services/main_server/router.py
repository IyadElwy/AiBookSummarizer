import os

import pika
from dotenv import load_dotenv
from fastapi import Request
from fastapi.routing import APIRouter
from pydantic import BaseModel

from errors.exceptions import SummaryNotFoundException, ValidationException
from errors.http import SummaryNotFoundError, ValidationError
from models.postgres_metadata import Summary
from models.scraper_worker import ScraperJob
from validators.main_server import validate_id, validate_summary_creation_body

load_dotenv()


router = APIRouter()


@router.get('/status/{task_id}')
async def get_data_source(
    request: Request,
    task_id: int,
):
    try:
        validate_id(task_id)
        summary = Summary.get_by_id(request.state.config.db_conn, task_id)
        if summary.status != 'completed':
            return summary
        mongodb_client = request.state.config.mongodb_client
        db = mongodb_client['ekz']
        collection = db['data']
        summary_document = collection.find_one({'metadata_id': task_id})
        return {
            **summary.model_dump(),
            'language': summary_document['language'],
            'model': summary_document['model'],
            'title': summary_document['title'],
            'authors': summary_document['authors'],
            'sources': summary_document['sources'],
            'content_coverage': summary_document['content_coverage'],
            'cross_reference': summary_document['cross_reference'],
            'source_reliability': summary_document['source_reliability'],
            'generated_summary': summary_document['generated_summary'],
            'medium_confidence': summary_document['medium_confidence'],
        }
    except ValidationException as e:
        raise ValidationError(e.validation_error)
    except SummaryNotFoundException:
        raise SummaryNotFoundError


class SummaryRequest(BaseModel):
    isbn: str
    language: str
    model: str


@router.post('/')
async def create_summary(request: Request, payload: SummaryRequest):
    try:
        ekz_user_id = request.state.user_id
        validate_summary_creation_body(payload.isbn, payload.language, payload.model)
        summary = Summary.create(request.state.config.db_conn, ekz_user_id, payload.isbn)
        rabbitmq_client = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=os.getenv('RABBITMQ_HOST'),
                credentials=pika.PlainCredentials(os.getenv('RABBITMQ_USER'), os.getenv('RABBITMQ_PASSWORD')),
            )
        )
        channel = rabbitmq_client.channel()
        channel.queue_declare(queue='scraper')
        channel.basic_publish(
            exchange='',
            routing_key='scraper',
            body=ScraperJob(
                id=summary.id, isbn=payload.isbn, model=payload.model, language=payload.language
            ).model_dump_json(),
        )
        return summary
    except ValidationException as e:
        raise ValidationError(e.validation_error)


# @router.get('/pagination/{page}')
# async def get_summaries(request: Request, page: int):
#     try:
#         ekz_user_id = request.state.user_id
#         validate_page(page)
#         summaries = Summary.get_for_user(request.state.config.db_conn, ekz_user_id, page)
#         summary_ids = [summary.id for summary in summaries]

#         mongodb_client = request.state.config.mongodb_client
#         db = mongodb_client['ekz']
#         collection = db['data']
#         summary_documents = collection.find({'metadata_id': {'$in': summary_ids}})

#         mongo_docs_by_id = {doc['metadata_id']: doc for doc in summary_documents}

#         combined_summaries_list = []
#         for summary in summaries:
#             mongo_doc = mongo_docs_by_id.get(summary.id)
#             combined_summary = {
#                 **summary.model_dump(),
#                 'language': mongo_doc.get('language'),
#                 'model': mongo_doc.get('model'),
#                 'title': mongo_doc.get('title'),
#                 'authors': mongo_doc.get('authors'),
#                 'sources': mongo_doc.get('sources'),
#                 'content_coverage': mongo_doc.get('content_coverage'),
#                 'cross_reference': mongo_doc.get('cross_reference'),
#                 'source_reliability': mongo_doc.get('source_reliability'),
#                 'generated_summary': mongo_doc.get('generated_summary'),
#                 'medium_confidence': mongo_doc.get('medium_confidence'),
#             }

#             combined_summaries_list.append(combined_summary)

#         return combined_summaries_list

#     except ValidationException as e:
#         raise ValidationError(e.validation_error)


@router.get('/all')
async def get_summaries(request: Request):
    try:
        ekz_user_id = request.state.user_id
        summaries = Summary.get_all(request.state.config.db_conn, ekz_user_id)
        summary_ids = [summary.id for summary in summaries]
        mongodb_client = request.state.config.mongodb_client
        db = mongodb_client['ekz']
        collection = db['data']
        summary_documents = collection.find({'metadata_id': {'$in': summary_ids}})

        mongo_docs_by_id = {doc['metadata_id']: doc for doc in summary_documents}

        combined_summaries_list = []
        for summary in summaries:
            mongo_doc = mongo_docs_by_id.get(summary.id)
            combined_summary = {
                **summary.model_dump(),
                'language': mongo_doc.get('language'),
                'model': mongo_doc.get('model'),
                'title': mongo_doc.get('title'),
                'authors': mongo_doc.get('authors'),
                'sources': mongo_doc.get('sources'),
                'content_coverage': mongo_doc.get('content_coverage'),
                'cross_reference': mongo_doc.get('cross_reference'),
                'source_reliability': mongo_doc.get('source_reliability'),
                'generated_summary': mongo_doc.get('generated_summary'),
                'medium_confidence': mongo_doc.get('medium_confidence'),
            }

            combined_summaries_list.append(combined_summary)

        return combined_summaries_list

    except ValidationException as e:
        raise ValidationError(e.validation_error)

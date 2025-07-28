import json
import math
import os

import pika
import psycopg2
from dotenv import load_dotenv
from pymongo import MongoClient
from scrapers.goodreads import GoodreadsScraper
from scrapers.isbndb import ISBNdbConfig, ISBNdbScraper
from scrapers.openlibrary import OpenLibraryScraper
from utils import string_cross_reference_similarity

from enums.main_server import Status
from models.postgres_metadata import Summary
from models.scraper_worker import ScraperJob
from models.summary_worker import SummaryJob

load_dotenv()

conn = psycopg2.connect(
    dbname=os.getenv('POSTGRES_DB'),
    user=os.getenv('POSTGRES_USER'),
    password=os.getenv('POSTGRES_PASSWORD'),
    host=os.getenv('PGHOST'),
    port=os.getenv('PGPORT'),
)

username = os.getenv('MONGODB_USERNAME')
password = os.getenv('MONGODB_PASSWORD')
CONNECTION_URI = (
    os.getenv('MONGODB_BASE_URI').replace('{MONGODB_USERNAME}', username).replace('{MONGODB_PASSWORD}', password)
)
mongodb_client = MongoClient(CONNECTION_URI)
db = mongodb_client['ekz']
collection = db['data']


rabbitmq_client = pika.BlockingConnection(
    pika.ConnectionParameters(
        host=os.getenv('RABBITMQ_HOST'),
        credentials=pika.PlainCredentials(os.getenv('RABBITMQ_USER'), os.getenv('RABBITMQ_PASSWORD')),
    )
)


def scraper_callback(ch, method, properties, body):
    scraper_job = ScraperJob(**json.loads(body))

    # update status
    Summary.update_status(conn, scraper_job.id, Status.collecting_data)

    # scrape data
    sources = {'isnbd': None, 'openlibrary': None, 'goodreads': None}
    sources = []

    # isbndb
    try:
        config = ISBNdbConfig(
            api_key=os.getenv('ISBNDB_API_KEY'),
            plan='basic',
        )
        scraper = ISBNdbScraper(config)
        title, authors, isbndb_result = scraper.scrape_book(scraper_job.isbn)
        if isbndb_result:
            sources.append(
                {
                    'type': 'isnbd',
                    'url': 'https://isbndb.com/isbndb-api-documentation-v2',
                    'data': isbndb_result,
                    'reliability': 90,
                }
            )
    except Exception:
        pass

    # openlibrary
    try:
        scraper = OpenLibraryScraper()
        open_library_result, book_url = scraper.scrape_book(scraper_job.isbn)
        if open_library_result:
            sources.append(
                {
                    'type': 'openlibrary',
                    'url': book_url,
                    'data': open_library_result,
                    'reliability': 70,
                }
            )
    except Exception:
        pass

    # goodreads
    try:
        scraper = GoodreadsScraper()
        good_reads_result, book_url = scraper.scrape_book(title)
        if good_reads_result:
            sources.append(
                {
                    'type': 'goodreads',
                    'url': book_url,
                    'data': good_reads_result,
                    'reliability': 80,
                }
            )
        # check data is there or not and if not change status to failed
        if not title:
            Summary.update_status(conn, scraper_job.id, Status.failed)
            return
    except Exception:
        pass

    if len(sources) == 0:
        Summary.update_status(conn, scraper_job.id, Status.failed)
        return
    # calculate metrics
    # source_reliability
    source_reliability = math.floor(sum([src['reliability'] for src in sources]) / 3)

    # content_coverage
    def estimate_coverage_from_length(text: str) -> float:
        length = len(text)
        if length >= 2000:
            return 100
        if length >= 1000:
            return 75
        if length >= 500:
            return 50
        if length >= 250:
            return 25
        return 10

    content_coverage = math.floor(sum([estimate_coverage_from_length(src['data']) for src in sources]) / 3)

    # cross_reference
    cross_reference = string_cross_reference_similarity([src['data'] for src in sources])

    # save to mongodb
    collection.insert_one(
        {
            'metadata_id': scraper_job.id,
            'language': scraper_job.language,
            'model': scraper_job.model,
            'title': title,
            'authors': authors,
            'sources': sources,
            'source_reliability': source_reliability,
            'content_coverage': content_coverage,
            'cross_reference': cross_reference,
            'medium_confidence': math.floor(sum([source_reliability, content_coverage, cross_reference]) / 3),
        }
    )

    # update status
    Summary.update_status(conn, scraper_job.id, Status.data_collected)

    # put into summary queue
    channel = rabbitmq_client.channel()
    channel.queue_declare(queue='ai-summary')
    channel.basic_publish(
        exchange='',
        routing_key='ai-summary',
        body=SummaryJob(
            id=scraper_job.id,
            model=scraper_job.model,
            language=scraper_job.language,
        ).model_dump_json(),
    )


def main():
    channel = rabbitmq_client.channel()
    channel.queue_declare(queue='scraper')
    channel.basic_consume(queue='scraper', on_message_callback=scraper_callback, auto_ack=True)
    print(' [*] Waiting for messages...')
    channel.start_consuming()


if __name__ == '__main__':
    main()

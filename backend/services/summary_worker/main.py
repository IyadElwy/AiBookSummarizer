import json
import os

import pika
import psycopg2
from dotenv import load_dotenv
from pymongo import MongoClient

from enums.main_server import Languages, Models, Status
from models.postgres_metadata import Summary
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


def ai_summary_callback(ch, method, properties, body):
    summary_job = SummaryJob(**json.loads(body))

    # update status
    Summary.update_status(conn, summary_job.id, Status.generating_summary)

    # read source data from mongodb
    summary_document = collection.find_one({'metadata_id': summary_job.id})

    # make request to ai summary engine
    language = Languages[summary_document['language']]
    print(language.value)
    model = Models[summary_document['model']]
    print(model.value)
    sources = summary_document['sources']

    # save summary and metrics to mongodb
    new_fields = {
        'generated_summary': 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    }
    collection.update_one({'metadata_id': summary_job.id}, {'$set': new_fields})

    # update status
    Summary.update_status(conn, summary_job.id, Status.completed)


def main():
    channel = rabbitmq_client.channel()
    channel.queue_declare(queue='ai-summary')
    channel.basic_consume(queue='ai-summary', on_message_callback=ai_summary_callback, auto_ack=True)
    print(' [*] Waiting for messages...')
    channel.start_consuming()


if __name__ == '__main__':
    main()

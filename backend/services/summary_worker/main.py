import json
import os
import threading
import time

import pika
import psycopg2
from dotenv import load_dotenv
from pymongo import MongoClient
from utils import generate_book_summary

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
    model = Models[summary_document['model']]
    sources = summary_document['sources']
    ollama_model_name, characters_size = Models.get_model_name_and_char(model)
    try:
        summary = generate_book_summary(
            prompt='Please create a detailed book summary',
            language=language.value,
            character_size=int(characters_size),
            input_data='---'.join([src['data'] for src in sources]),
            model=ollama_model_name,
            ollama_host=os.getenv('OLLAMA_HOST'),
        )
    except Exception:
        Summary.update_status(conn, summary_job.id, Status.failed)
        return

    # save summary and metrics to mongodb
    new_fields = {
        'generated_summary': summary,
    }
    collection.update_one({'metadata_id': summary_job.id}, {'$set': new_fields})

    # update status
    Summary.update_status(conn, summary_job.id, Status.completed)


HEARTBEAT_FILE = '/tmp/worker_heartbeat'


def update_heartbeat():
    while True:
        try:
            with open(HEARTBEAT_FILE, 'w') as f:
                f.write(str(int(time.time())))
        except Exception:
            pass
        time.sleep(30)


def main():
    # Start heartbeat thread
    heartbeat_thread = threading.Thread(target=update_heartbeat, daemon=True)
    heartbeat_thread.start()

    # Initial heartbeat
    try:
        with open(HEARTBEAT_FILE, 'w') as f:
            f.write(str(int(time.time())))
    except Exception:
        pass

    channel = rabbitmq_client.channel()
    channel.queue_declare(queue='ai-summary')
    channel.basic_consume(queue='ai-summary', on_message_callback=ai_summary_callback, auto_ack=True)
    print(' [*] Waiting for messages...')
    channel.start_consuming()


if __name__ == '__main__':
    main()

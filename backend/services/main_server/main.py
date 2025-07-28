import os

import jwt
import psycopg2
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jwt.algorithms import RSAAlgorithm
from jwt.exceptions import PyJWTError
from pymongo import MongoClient
from router import router

from errors.http import UnAuthenticatedError

load_dotenv()

jwt_secret = os.getenv('JWT_SECRET')


class Config:
    def __init__(self) -> None:
        self.db_conn = None
        self.mongodb_client = None


config = Config()

conn = psycopg2.connect(
    dbname=os.getenv('POSTGRES_DB'),
    user=os.getenv('POSTGRES_USER'),
    password=os.getenv('POSTGRES_PASSWORD'),
    host=os.getenv('PGHOST'),
    port=os.getenv('PGPORT'),
)
config.db_conn = conn

username = os.getenv('MONGODB_USERNAME')
password = os.getenv('MONGODB_PASSWORD')
CONNECTION_URI = (
    os.getenv('MONGODB_BASE_URI').replace('{MONGODB_USERNAME}', username).replace('{MONGODB_PASSWORD}', password)
)
mongodb_client = MongoClient(CONNECTION_URI)
config.mongodb_client = mongodb_client


app = FastAPI()

origins = [
    'http://localhost:3000',
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.middleware('http')
async def authenticate_user(request: Request, call_next):
    if request.method == 'OPTIONS':
        response = JSONResponse(content={}, status_code=200)
        return await call_next(request)
    auth_header = request.headers.get('Authorization')
    if auth_header:
        token = auth_header.split('Bearer ')[1]
        try:
            jwks_url = 'https://dev-7dhk8h5kupq6ieu1.us.auth0.com/.well-known/jwks.json'
            jwks = requests.get(jwks_url).json()

            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header['kid']
            key = next(k for k in jwks['keys'] if k['kid'] == kid)

            public_key = RSAAlgorithm.from_jwk(key)

            decoded_token = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience=os.getenv('OAUTH0_AUDIENCE'),
                issuer=os.getenv('OAUTH0_ISSUER'),
            )
            request.state.user_id = decoded_token['sub']
            return await call_next(request)
        except PyJWTError:
            pass
        return UnAuthenticatedError()
    return UnAuthenticatedError()


@app.middleware('http')
async def config_middleware(request: Request, call_next):
    request.state.config = config
    return await call_next(request)


app.include_router(router)

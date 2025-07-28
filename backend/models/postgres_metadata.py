from __future__ import annotations

from datetime import datetime

from psycopg2.errors import NoDataFound
from psycopg2.extensions import connection
from pydantic import BaseModel

from enums.main_server import Status
from errors.exceptions import SummaryNotFoundException


class Summary(BaseModel):
    id: int
    ekz_user: str
    isbn: str
    status: str
    creation_date: datetime

    def __init__(self, id: int, ekz_user: str, isbn: str, status: str, creation_date: datetime):
        super().__init__(id=id, ekz_user=ekz_user, isbn=isbn, status=status, creation_date=creation_date)

    @classmethod
    def create(cls, db_conn: connection, ekz_user: str, isbn: str) -> Summary:
        stmt = """INSERT INTO Summary
                    (ekz_user, isbn)
                    VALUES (%s, %s)
                    RETURNING
                    id, ekz_user, isbn, status,
                    creation_date"""

        try:
            cursor = db_conn.cursor()
            cursor.execute(stmt, (ekz_user, isbn))
            summary = cursor.fetchone()
            db_conn.commit()
            cursor.close()
            return Summary(*summary)
        except Exception as e:
            db_conn.rollback()
            raise e

    @classmethod
    def get_by_id(cls, db_conn: connection, id: int) -> Summary:
        stmt = """SELECT * FROM
                    Summary WHERE
                    id = %s"""
        try:
            cursor = db_conn.cursor()
            cursor.execute(stmt, (id,))
            summary = cursor.fetchone()
            cursor.close()
            return Summary(*summary)
        except NoDataFound:
            raise SummaryNotFoundException
        except Exception:
            raise

    @classmethod
    def update_status(cls, db_conn: connection, id: int, status: Status):
        stmt = """UPDATE Summary
                  SET status=%s
                  WHERE id=%s"""
        try:
            cursor = db_conn.cursor()
            cursor.execute(stmt, (status.value, id))
            db_conn.commit()
            cursor.close()
        except NoDataFound:
            raise SummaryNotFoundException
        except Exception:
            db_conn.rollback()
            raise

    # @classmethod
    # def get_for_user(cls, db_conn: connection, user_id: str, page: int) -> list[Summary]:
    #     stmt = """SELECT * FROM Summary
    #                 WHERE ekz_user=%s
    #                 OFFSET %s LIMIT 5"""
    #     try:
    #         cursor = db_conn.cursor()
    #         cursor.execute(stmt, (user_id, (page - 1) * 5))
    #         res = cursor.fetchall()
    #         summaries = [Summary(*summary) for summary in res]
    #         cursor.close()
    #         return summaries
    #     except Exception:
    #         raise

    @classmethod
    def get_all(cls, db_conn: connection, user_id: str) -> list[Summary]:
        stmt = """SELECT * FROM Summary
                    WHERE ekz_user=%s"""
        try:
            cursor = db_conn.cursor()
            cursor.execute(stmt, (user_id,))
            res = cursor.fetchall()
            summaries = [Summary(*summary) for summary in res]
            cursor.close()
            return summaries
        except Exception:
            raise

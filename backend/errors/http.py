from fastapi import HTTPException
from fastapi.responses import JSONResponse


class ValidationError(HTTPException):
    def __init__(self, message) -> None:
        super().__init__(400, message)


def UnAuthenticatedError():
    return JSONResponse({'detail': 'User not authenticated'}, status_code=403)


class UnAuthorizedError(HTTPException):
    def __init__(self) -> None:
        super().__init__(401, 'User not authorized')


class SummaryNotFoundError(HTTPException):
    def __init__(self):
        super().__init__(404, 'Summary not found')

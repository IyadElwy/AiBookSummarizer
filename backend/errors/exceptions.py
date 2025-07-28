class ValidationException(Exception):
    def __init__(self, validation_error) -> None:
        self.validation_error = validation_error
        super().__init__(validation_error)


class UnAuthorizedException(Exception):
    def __init__(self) -> None:
        super().__init__('User not authorized')


class SummaryNotFoundException(Exception):
    def __init__(self):
        super().__init__('Summary not found')

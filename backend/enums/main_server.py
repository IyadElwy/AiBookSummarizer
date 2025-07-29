from __future__ import annotations

from enum import Enum


class Status(Enum):
    validating_isbn = 'validating_isbn'
    collecting_data = 'collecting_data'
    data_collected = 'data_collected'
    generating_summary = 'generating_summary'
    completed = 'completed'
    failed = 'failed'


class Languages(Enum):
    en = 'English'
    de = 'Deutsch'
    fr = 'Français'
    es = 'Español'
    it = 'Italiano'


class Models(Enum):
    mistral_latest__300 = 'mistral:latest__300'
    gemma3n_e2b__300 = 'gemma3n:e2b__300'
    llama3_1_latest__300 = 'llama3.1:latest__300'
    mistral_latest__1000 = 'mistral:latest__1000'
    gemma3n_e2b__1000 = 'gemma3n:e2b__1000'
    llama3_1_latest__1000 = 'llama3.1:latest__1000'

    @classmethod
    def get_model_name_and_char(cls, model: Models):
        return model.value.split('__')

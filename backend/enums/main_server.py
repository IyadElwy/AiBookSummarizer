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
    gpt4 = 'GPT-4 (Detailed)'
    claude = 'Claude (Balanced)'
    gemini = 'Gemini (Fast)'

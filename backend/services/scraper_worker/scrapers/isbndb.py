import time
from dataclasses import dataclass

import requests


@dataclass
class ISBNdbConfig:
    """Configuration for ISBNdb API access"""

    api_key: str
    plan: str = 'basic'  # "basic", "premium", "pro"

    @property
    def base_url(self) -> str:
        """Get the appropriate base URL based on subscription plan"""
        if self.plan == 'premium':
            return 'https://api.premium.isbndb.com'
        if self.plan == 'pro':
            return 'https://api.pro.isbndb.com'
        return 'https://api2.isbndb.com'

    @property
    def rate_limit(self) -> float:
        """Get rate limit delay based on plan"""
        if self.plan == 'pro':
            return 0.2  # 5 requests per second
        if self.plan == 'premium':
            return 0.33  # 3 requests per second
        return 1.0  # 1 request per second


class ISBNdbScraper:
    """Scraper for ISBNdb API to extract book metadata by ISBN"""

    def __init__(self, config: ISBNdbConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update(
            {'Authorization': config.api_key, 'Accept': 'application/json', 'User-Agent': 'BookScraper/1.0'}
        )
        self.last_request_time = 0

    def _make_request(self, endpoint: str, params: dict | None = None) -> dict:
        """Make rate-limited request to ISBNdb API"""
        # Enforce rate limiting
        time_since_last = time.time() - self.last_request_time
        if time_since_last < self.config.rate_limit:
            time.sleep(self.config.rate_limit - time_since_last)

        url = f'{self.config.base_url}{endpoint}'
        response = self.session.get(url, params=params)
        self.last_request_time = time.time()

        if response.status_code == 404:
            return None

        response.raise_for_status()
        return response.json()

    def get_book_by_isbn(self, isbn: str, with_prices: bool = False) -> dict | None:
        """Get book details by ISBN"""
        params = {}
        if with_prices and self.config.plan == 'pro':
            params['with_prices'] = '1'

        result = self._make_request(f'/book/{isbn}', params)
        return result.get('book') if result else None

    def format_book_data_for_ai(self, book_data: dict) -> str:
        """Format book data into a comprehensive string for AI analysis"""
        if not book_data:
            return 'No book data available.'

        sections = []

        # Basic Information
        title = book_data.get('title', 'Unknown Title')
        title_long = book_data.get('title_long', '')
        if title_long and title_long != title:
            sections.append(f'Title: {title} ({title_long})')
        else:
            sections.append(f'Title: {title}')

        # Authors
        authors = book_data.get('authors', [])
        if authors:
            authors_str = ', '.join(authors)
            sections.append(f'Author(s): {authors_str}')

        # Publication Details
        publisher = book_data.get('publisher', '')
        date_published = book_data.get('date_published', '')
        edition = book_data.get('edition', '')

        pub_details = []
        if publisher:
            pub_details.append(f'Publisher: {publisher}')
        if date_published:
            pub_details.append(f'Published: {date_published}')
        if edition:
            pub_details.append(f'Edition: {edition}')

        if pub_details:
            sections.append(' | '.join(pub_details))

        # Physical Details
        pages = book_data.get('pages', 0)
        binding = book_data.get('binding', '')
        language = book_data.get('language', '')

        physical_details = []
        if pages:
            physical_details.append(f'Pages: {pages}')
        if binding:
            physical_details.append(f'Binding: {binding}')
        if language:
            physical_details.append(f'Language: {language}')

        if physical_details:
            sections.append(' | '.join(physical_details))

        # ISBN Information
        isbn = book_data.get('isbn', '')
        isbn13 = book_data.get('isbn13', '')
        isbn_info = []
        if isbn:
            isbn_info.append(f'ISBN: {isbn}')
        if isbn13:
            isbn_info.append(f'ISBN-13: {isbn13}')
        if isbn_info:
            sections.append(' | '.join(isbn_info))

        # Classification
        dewey_decimal = book_data.get('dewey_decimal', [])
        subjects = book_data.get('subjects', [])

        if dewey_decimal:
            sections.append(f'Dewey Decimal: {", ".join(dewey_decimal)}')

        if subjects:
            # Clean up subjects for better readability
            clean_subjects = []
            for subject in subjects[:5]:  # Limit to first 5 subjects
                # Remove common prefixes and make more readable
                clean_subject = subject.replace('_', ' ').title()
                clean_subject = clean_subject.replace('Fiction ', '').replace('General', '').strip()
                if clean_subject and clean_subject not in clean_subjects:
                    clean_subjects.append(clean_subject)

            if clean_subjects:
                sections.append(f'Subjects: {", ".join(clean_subjects)}')

        # Synopsis/Overview
        synopsis = book_data.get('synopsis', '')
        overview = book_data.get('overview', '')
        excerpt = book_data.get('excerpt', '')

        # Choose the best description available
        description = synopsis or overview or excerpt
        if description:
            # Clean up HTML tags if present
            import re

            description = re.sub(r'<[^>]+>', ' ', description)
            description = re.sub(r'\s+', ' ', description).strip()
            sections.append(f'Description: {description}')

        # Price information (if available)
        msrp = book_data.get('msrp', 0)
        if msrp and float(msrp) > 0:
            sections.append(f'MSRP: ${msrp}')

        # Other editions
        other_isbns = book_data.get('other_isbns', [])
        if other_isbns:
            other_editions = []
            for other in other_isbns[:3]:  # Limit to 3 other editions
                isbn_other = other.get('isbn', '')
                binding_other = other.get('binding', '')
                if isbn_other:
                    edition_info = isbn_other
                    if binding_other:
                        edition_info += f' ({binding_other})'
                    other_editions.append(edition_info)

            if other_editions:
                sections.append(f'Other Editions: {", ".join(other_editions)}')

        return (title, authors, '\n'.join(sections))

    def scrape_book(self, isbn: str, with_prices: bool = False) -> str:
        """
        Main method to scrape book data by ISBN and return formatted string

        Args:
            isbn: ISBN-10 or ISBN-13 of the book
            with_prices: Include pricing data (Pro plan only)

        Returns:
            Formatted string containing all relevant book information for AI analysis

        """
        try:
            book_data = self.get_book_by_isbn(isbn, with_prices)

            if not book_data:
                return None, None, None

            return self.format_book_data_for_ai(book_data)

        except requests.exceptions.RequestException as e:
            return f'Error fetching book data for ISBN {isbn}: {e!s}'
        except Exception as e:
            return f'Unexpected error processing ISBN {isbn}: {e!s}'

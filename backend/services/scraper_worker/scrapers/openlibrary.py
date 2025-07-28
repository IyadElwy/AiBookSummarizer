import re
from typing import Any

import requests
from bs4 import BeautifulSoup


class OpenLibraryScraper:
    def __init__(self):
        self.base_url = 'https://openlibrary.org'
        self.session = requests.Session()
        self.session.headers.update(
            {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        )

    def search_by_isbn(self, isbn: str) -> str | None:
        """Search for a book by ISBN and return the work key."""
        search_url = f'{self.base_url}/search.json'
        params = {'q': isbn}

        try:
            response = self.session.get(search_url, params=params)
            response.raise_for_status()
            data = response.json()

            if data.get('docs') and len(data['docs']) > 0:
                return data['docs'][0].get('key')
            return None
        except Exception as e:
            print(f'Error searching for ISBN {isbn}: {e}')
            return None

    def get_book_page_html(self, work_key: str) -> str | None:
        """Get the HTML content of a book's main page."""
        if not work_key.startswith('/works/'):
            work_key = f'/works/{work_key}'

        url = f'{self.base_url}{work_key}'
        self.book_url = url

        try:
            response = self.session.get(url)
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f'Error fetching book page {url}: {e}')
            return None

    def extract_book_data(self, html: str) -> dict[str, Any]:
        """Extract important book data from the HTML."""
        soup = BeautifulSoup(html, 'html.parser')

        data = {}

        # Title and Author
        title_elem = soup.find('h1', class_='work-title')
        data['title'] = title_elem.get_text(strip=True) if title_elem else None

        author_link = soup.find('a', href=re.compile(r'/authors/'))
        data['author'] = author_link.get_text(strip=True) if author_link else None

        # Description - try multiple selectors
        description = None
        desc_selectors = [
            '.book-description .read-more__content',
            '.work-description .read-more__content',
            '.book-description',
            '.work-description',
        ]

        for selector in desc_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                # Remove HTML tags and clean up text
                desc_text = desc_elem.get_text(separator=' ', strip=True)
                # Remove common footer elements
                desc_text = re.sub(r'\(back cover\).*$', '', desc_text, flags=re.IGNORECASE)
                description = desc_text
                break

        data['description'] = description

        # Ratings and stats
        rating_elem = soup.find('span', itemprop='ratingValue')
        data['rating'] = rating_elem.get_text(strip=True) if rating_elem else None

        rating_count_elem = soup.find('meta', itemprop='ratingCount')
        data['rating_count'] = rating_count_elem.get('content') if rating_count_elem else None

        # Reading stats
        stats = {}
        stat_elements = soup.find_all('li', class_='reading-log-stat')
        for stat in stat_elements:
            stat_number = stat.find('span', class_='readers-stats__stat')
            stat_label = stat.find('span', class_='readers-stats__label')
            if stat_number and stat_label:
                label = stat_label.get_text(strip=True).lower().replace(' ', '_')
                stats[label] = stat_number.get_text(strip=True)

        data['reading_stats'] = stats

        # Publication info
        pub_date = soup.find('span', itemprop='datePublished')
        data['publish_date'] = pub_date.get_text(strip=True) if pub_date else None

        publisher_elem = soup.find('a', itemprop='publisher')
        data['publisher'] = publisher_elem.get_text(strip=True) if publisher_elem else None

        pages_elem = soup.find('span', itemprop='numberOfPages')
        data['pages'] = pages_elem.get_text(strip=True) if pages_elem else None

        language_elem = soup.find('span', itemprop='inLanguage')
        if language_elem:
            lang_link = language_elem.find('a')
            data['language'] = lang_link.get_text(strip=True) if lang_link else language_elem.get_text(strip=True)
        else:
            data['language'] = None

        # Subjects/Tags
        subjects = []
        subject_links = soup.select('.subjects a[href*="/subjects/"]')
        for link in subject_links:
            subject = link.get_text(strip=True)
            if subject and subject not in subjects:
                subjects.append(subject)

        data['subjects'] = subjects[:20]  # Limit to first 20 subjects

        # People (characters)
        people = []
        people_links = soup.select('a[href*="/subjects/person:"]')
        for link in people_links:
            person = link.get_text(strip=True)
            if person and person not in people:
                people.append(person)

        data['characters'] = people

        # Places
        places = []
        place_links = soup.select('a[href*="/subjects/place:"]')
        for link in place_links:
            place = link.get_text(strip=True)
            if place and place not in places:
                places.append(place)

        data['places'] = places

        # Time periods
        times = []
        time_links = soup.select('a[href*="/subjects/time:"]')
        for link in time_links:
            time = link.get_text(strip=True)
            if time and time not in times:
                times.append(time)

        data['time_periods'] = times

        # First published year
        first_pub = soup.find('span', class_='first-published-date')
        if first_pub:
            year_match = re.search(r'\d{4}', first_pub.get('title', ''))
            data['first_published_year'] = year_match.group() if year_match else None
        else:
            data['first_published_year'] = None

        # ISBN
        isbn_elem = soup.find('dd', itemprop='isbn')
        data['isbn'] = isbn_elem.get_text(strip=True) if isbn_elem else None

        # Excerpts/First lines
        excerpt_elem = soup.select_one('.excerpt .text')
        data['excerpt'] = excerpt_elem.get_text(strip=True) if excerpt_elem else None

        return data

    def format_for_ai(self, data: dict[str, Any]) -> str:
        """Format the extracted data into a string suitable for AI processing."""
        parts = []

        if data.get('title'):
            parts.append(f'Title: {data["title"]}')

        if data.get('author'):
            parts.append(f'Author: {data["author"]}')

        if data.get('first_published_year'):
            parts.append(f'First Published: {data["first_published_year"]}')

        if data.get('description'):
            parts.append(f'Description: {data["description"]}')

        if data.get('rating') and data.get('rating_count'):
            parts.append(f'Rating: {data["rating"]} ({data["rating_count"]} ratings)')

        if data.get('subjects'):
            subjects_str = ', '.join(data['subjects'])
            parts.append(f'Subjects/Themes: {subjects_str}')

        if data.get('characters'):
            characters_str = ', '.join(data['characters'])
            parts.append(f'Main Characters: {characters_str}')

        if data.get('places'):
            places_str = ', '.join(data['places'])
            parts.append(f'Setting/Places: {places_str}')

        if data.get('time_periods'):
            times_str = ', '.join(data['time_periods'])
            parts.append(f'Time Period: {times_str}')

        if data.get('excerpt'):
            parts.append(f'Opening Line: {data["excerpt"]}')

        # Add publication details
        pub_details = []
        if data.get('publisher'):
            pub_details.append(f'Publisher: {data["publisher"]}')
        if data.get('pages'):
            pub_details.append(f'Pages: {data["pages"]}')
        if data.get('language'):
            pub_details.append(f'Language: {data["language"]}')

        if pub_details:
            parts.append('Publication Details: ' + ', '.join(pub_details))

        # Add reading statistics
        if data.get('reading_stats'):
            stats_parts = []
            for key, value in data['reading_stats'].items():
                formatted_key = key.replace('_', ' ').title()
                stats_parts.append(f'{value} {formatted_key}')
            if stats_parts:
                parts.append('Reader Interest: ' + ', '.join(stats_parts))

        return '\n\n'.join(parts)

    def scrape_book(self, isbn: str) -> str | None:
        """Main method to scrape book data by ISBN and return formatted string."""
        # Step 1: Search for the book
        work_key = self.search_by_isbn(isbn)
        if not work_key:
            return None

        # Step 2: Get the HTML page
        html = self.get_book_page_html(work_key)
        if not html:
            return None

        # Step 3: Extract data
        data = self.extract_book_data(html)

        # Step 4: Format for AI
        return self.format_for_ai(data), self.book_url

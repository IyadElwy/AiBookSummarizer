import re
import time
from typing import Any

import requests
from bs4 import BeautifulSoup


class GoodreadsScraper:
    def __init__(self):
        self.base_url = 'https://www.goodreads.com'
        self.graphql_url = 'https://kxbwmqov6jgg3daaamb744ycu4.appsync-api.us-east-1.amazonaws.com/graphql'
        self.session = requests.Session()
        self.session.headers.update(
            {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        )

    def search_by_title(self, title: str, author: str = None) -> str | None:
        """Search for a book by title (and optionally author) and return the book URL."""
        # Construct search query
        search_query = title
        if author:
            search_query = f'{title} {author}'

        # First try the GraphQL endpoint
        try:
            query = {
                'operationName': 'getSearchSuggestions',
                'variables': {'searchQuery': search_query},
                'query': """query getSearchSuggestions($searchQuery: String!) {
                    getSearchSuggestions(query: $searchQuery) {
                        edges {
                            ... on SearchBookEdge {
                                node {
                                    id
                                    title
                                    primaryContributorEdge {
                                        node {
                                            name
                                            isGrAuthor
                                            __typename
                                        }
                                        __typename
                                    }
                                    webUrl
                                    imageUrl
                                    __typename
                                }
                                __typename
                            }
                            __typename
                        }
                        __typename
                    }
                }""",
            }

            response = self.session.post(self.graphql_url, json=query)
            if response.status_code == 200:
                data = response.json()
                edges = data.get('data', {}).get('getSearchSuggestions', {}).get('edges', [])
                if edges:
                    # If author is provided, try to find the best match
                    if author:
                        for edge in edges:
                            node = edge.get('node', {})
                            book_title = node.get('title', '').lower()
                            book_author = node.get('primaryContributorEdge', {}).get('node', {}).get('name', '').lower()

                            # Simple matching - check if titles are similar and author matches
                            if (title.lower() in book_title or book_title in title.lower()) and (
                                author.lower() in book_author or book_author in author.lower()
                            ):
                                return node.get('webUrl')

                    # Return first result if no author specified or no exact match found
                    return edges[0].get('node', {}).get('webUrl')
        except Exception as e:
            print(f'GraphQL search failed: {e}')

        # Fallback to web search
        try:
            search_url = f'{self.base_url}/search'
            params = {'q': search_query, 'search_type': 'books'}

            response = self.session.get(search_url, params=params)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Look for book links in search results
            book_containers = soup.select('tr[itemtype="http://schema.org/Book"]')
            if not book_containers:
                book_containers = soup.select('.tableList tr')

            for container in book_containers:
                # Get book title and author from this result
                title_elem = container.select_one('a.bookTitle')
                author_elem = container.select_one('a.authorName')

                if title_elem:
                    book_title = title_elem.get_text(strip=True).lower()
                    book_author = author_elem.get_text(strip=True).lower() if author_elem else ''

                    # Check if this matches our search
                    title_match = title.lower() in book_title or book_title in title.lower()
                    author_match = not author or author.lower() in book_author or book_author in author.lower()

                    if title_match and author_match:
                        href = title_elem.get('href')
                        if href:
                            if href.startswith('/'):
                                return f'{self.base_url}{href}'
                            return href

            # If no exact match, return first result
            first_link = soup.select_one('a.bookTitle')
            if first_link:
                href = first_link.get('href')
                if href:
                    if href.startswith('/'):
                        return f'{self.base_url}{href}'
                    return href

            return None

        except Exception as e:
            print(f'Error searching for title "{title}": {e}')
            return None

    def get_book_page_html(self, book_url: str) -> str | None:
        """Get the HTML content of a book's main page."""
        try:
            # Add a small delay to be respectful
            time.sleep(2)

            # Update headers for the book page request
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Referer': 'https://www.goodreads.com/',
            }

            response = self.session.get(book_url, headers=headers)
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f'Error fetching book page {book_url}: {e}')
            return None

    def extract_book_data(self, html: str) -> dict[str, Any]:
        """Extract important book data from the HTML."""
        soup = BeautifulSoup(html, 'html.parser')
        data = {}

        # Title
        title_elem = soup.find('h1', {'data-testid': 'bookTitle'})
        if not title_elem:
            title_elem = soup.find('h1', class_='Text Text__title1')
        data['title'] = title_elem.get_text(strip=True) if title_elem else None

        # Author
        author_elem = soup.find('span', {'data-testid': 'name'})
        if not author_elem:
            author_elem = soup.find('a', class_='authorName')
        if not author_elem:
            # Try alternative selector
            author_elem = soup.select_one('.ContributorLink__name')
        data['author'] = author_elem.get_text(strip=True) if author_elem else None

        # Rating
        rating_elem = soup.find('div', class_='RatingStatistics__rating')
        if not rating_elem:
            rating_elem = soup.find('span', itemprop='ratingValue')
        data['rating'] = rating_elem.get_text(strip=True) if rating_elem else None

        # Rating count
        rating_count_elem = soup.find('span', {'data-testid': 'ratingsCount'})
        if not rating_count_elem:
            rating_count_elem = soup.find('meta', itemprop='ratingCount')
            if rating_count_elem:
                data['rating_count'] = rating_count_elem.get('content')
            else:
                # Try to find in text
                rating_text = soup.find('span', string=re.compile(r'[\d,]+ ratings'))
                data['rating_count'] = rating_text.get_text(strip=True) if rating_text else None
        else:
            data['rating_count'] = rating_count_elem.get_text(strip=True)

        # Reviews count
        reviews_count_elem = soup.find('span', {'data-testid': 'reviewsCount'})
        if not reviews_count_elem:
            reviews_text = soup.find('span', string=re.compile(r'[\d,]+ reviews'))
            data['reviews_count'] = reviews_text.get_text(strip=True) if reviews_text else None
        else:
            data['reviews_count'] = reviews_count_elem.get_text(strip=True)

        # Description
        description = None
        desc_selectors = [
            '[data-testid="description"] .Formatted',
            '.BookPageMetadataSection__description .Formatted',
            '.DetailsLayoutRightParagraph__description',
            '#description span[style*="display:none"]',
            '#description span',
        ]

        for selector in desc_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                desc_text = desc_elem.get_text(separator=' ', strip=True)
                # Clean up common patterns
                desc_text = re.sub(r'\(less\)$', '', desc_text)
                desc_text = re.sub(r'\(more\)$', '', desc_text)
                description = desc_text
                break

        data['description'] = description

        # Publication details
        pub_info = {}

        # Try to find publication info in various locations
        details_section = soup.find('div', class_='FeaturedDetails')
        if details_section:
            details_text = details_section.get_text()

            # Extract year
            year_match = re.search(r'(\d{4})', details_text)
            if year_match:
                pub_info['year'] = year_match.group(1)

            # Extract pages
            pages_match = re.search(r'(\d+)\s+pages', details_text)
            if pages_match:
                pub_info['pages'] = pages_match.group(1)

        # Try alternative selectors for publication details
        if not pub_info.get('year'):
            year_elem = soup.find('p', {'data-testid': 'publicationInfo'})
            if year_elem:
                year_match = re.search(r'(\d{4})', year_elem.get_text())
                if year_match:
                    pub_info['year'] = year_match.group(1)

        if not pub_info.get('pages'):
            pages_elem = soup.find('p', {'data-testid': 'pagesFormat'})
            if pages_elem:
                pages_match = re.search(r'(\d+)', pages_elem.get_text())
                if pages_match:
                    pub_info['pages'] = pages_match.group(1)

        data['publication_info'] = pub_info

        # Genres/Shelves
        genres = []
        genre_selectors = [
            '[data-testid="genresList"] .Button--tag',
            '.BookPageMetadataSection__genres .Button',
            '.elementList .left .bookPageGenreLink',
        ]

        for selector in genre_selectors:
            genre_elems = soup.select(selector)
            for elem in genre_elems:
                genre = elem.get_text(strip=True)
                if genre and genre not in genres and len(genres) < 15:
                    genres.append(genre)
            if genres:
                break

        data['genres'] = genres

        # Awards (if any)
        awards = []
        award_elems = soup.select('.infoBoxRowItem a[href*="/award/"]')
        for elem in award_elems:
            award = elem.get_text(strip=True)
            if award and award not in awards:
                awards.append(award)

        data['awards'] = awards[:5]  # Limit to first 5 awards

        # Series information
        series_elem = soup.find('h3', class_='Text Text__title3')
        if series_elem:
            series_text = series_elem.get_text(strip=True)
            if '(' in series_text and ')' in series_text:
                data['series'] = series_text
        else:
            data['series'] = None

        # Publisher
        publisher_elem = soup.find('span', itemprop='publisher')
        data['publisher'] = publisher_elem.get_text(strip=True) if publisher_elem else None

        # ISBN
        isbn_elem = soup.find('span', itemprop='isbn')
        data['isbn'] = isbn_elem.get_text(strip=True) if isbn_elem else None

        # Similar books (if available)
        similar_books = []
        similar_elems = soup.select('.carouselRow .bookTitle')[:5]
        for elem in similar_elems:
            title = elem.get_text(strip=True)
            if title:
                similar_books.append(title)

        data['similar_books'] = similar_books

        # Extract reviews
        reviews = self.extract_reviews(soup)
        data['reviews'] = reviews

        return data

    def extract_reviews(self, soup: BeautifulSoup) -> list:
        """Extract user reviews from the book page."""
        reviews = []
        processed_reviews = set()  # To avoid duplicates

        # Debug: Print some HTML to understand structure

        # Try multiple approaches to find reviews

        # Approach 1: Look for review containers
        review_containers = []
        container_selectors = [
            'article[data-testid="review"]',
            '.ReviewsList .review',
            '.review',
            '[data-testid="review"]',
            '.friendReviews .review',
            '.stacked .review',
        ]

        for selector in container_selectors:
            containers = soup.select(selector)
            if containers:
                review_containers = containers
                break

        # Approach 2: If no containers found, look for review text directly
        if not review_containers:
            review_text_selectors = [
                '.reviewText .readable',
                '.ReviewText .Formatted',
                '[data-testid="review-text"]',
                '.review-text',
                '.review__text',
            ]

            for selector in review_text_selectors:
                text_elems = soup.select(selector)
                if text_elems:
                    for i, elem in enumerate(text_elems[:8]):  # Limit to 8 reviews
                        text = elem.get_text(strip=True)
                        if len(text) > 30:
                            reviews.append(
                                {
                                    'reviewer': f'Reader {i + 1}',
                                    'rating': None,
                                    'text': text.replace('...more', '').replace('(less)', '').strip(),
                                }
                            )
                    break

        # Approach 3: Process review containers
        for i, container in enumerate(review_containers[:10]):
            try:
                # Extract reviewer name
                reviewer_selectors = [
                    '[data-testid="name"]',
                    '.user a',
                    '.reviewer a',
                    'a[href*="/user/show/"]',
                    '.gr-h3--noMargin a',
                ]

                reviewer = 'Anonymous'
                for selector in reviewer_selectors:
                    reviewer_elem = container.select_one(selector)
                    if reviewer_elem:
                        reviewer = reviewer_elem.get_text(strip=True)
                        break

                # Extract rating
                rating = None
                rating_selectors = [
                    '.staticStars',
                    '[data-testid="rating"]',
                    '[title*="it was"]',
                    '[aria-label*="star"]',
                    '.gr-rating',
                ]

                for selector in rating_selectors:
                    rating_elem = container.select_one(selector)
                    if rating_elem:
                        rating_text = (
                            rating_elem.get('title', '')
                            or rating_elem.get('aria-label', '')
                            or rating_elem.get('class', '')
                        )
                        rating_match = re.search(r'(\d+)', str(rating_text))
                        if rating_match:
                            rating = rating_match.group(1)
                            break

                # Extract review text
                review_text = None
                text_selectors = [
                    '.ReviewText .Formatted',
                    '.reviewText .readable',
                    '[data-testid="review-text"]',
                    '.review-text',
                    '.Formatted',
                ]

                for selector in text_selectors:
                    text_elem = container.select_one(selector)
                    if text_elem:
                        review_text = text_elem.get_text(strip=True)
                        break

                # If still no text, try any span with substantial content
                if not review_text:
                    spans = container.select('span')
                    for span in spans:
                        text = span.get_text(strip=True)
                        if (
                            len(text) > 50
                            and 'more' not in text.lower()[-10:]
                            and 'less' not in text.lower()[-10:]
                            and 'flag' not in text.lower()
                            and not text.isdigit()
                        ):
                            review_text = text
                            break

                if review_text and len(review_text) > 30:
                    # Clean up the review text
                    review_text = re.sub(r'\s+', ' ', review_text)
                    review_text = review_text.replace('...more', '').replace('(less)', '').strip()

                    # Create a unique identifier to avoid duplicates
                    review_id = f'{reviewer}:{review_text[:50]}'
                    if review_id not in processed_reviews:
                        processed_reviews.add(review_id)

                        review_data = {'reviewer': reviewer, 'rating': rating, 'text': review_text}
                        reviews.append(review_data)

            except Exception:
                continue

        # Approach 4: Last resort - look for any text that looks like reviews
        if not reviews:
            all_text_elements = soup.find_all(['span', 'div', 'p'], string=re.compile(r'.{50,}'))
            for i, elem in enumerate(all_text_elements[:20]):
                text = elem.get_text(strip=True)
                if (
                    len(text) > 100
                    and len(text) < 500
                    and 'book' in text.lower()
                    and ('read' in text.lower() or 'story' in text.lower() or 'author' in text.lower())
                ):
                    reviews.append(
                        {
                            'reviewer': f'Reader {len(reviews) + 1}',
                            'rating': None,
                            'text': text[:300] + '...' if len(text) > 300 else text,
                        }
                    )
                    if len(reviews) >= 5:
                        break

        return reviews

    def format_for_ai(self, data: dict[str, Any]) -> str:
        """Format the extracted data into a string suitable for AI processing."""
        parts = []

        if data.get('title'):
            parts.append(f'Title: {data["title"]}')

        if data.get('author'):
            parts.append(f'Author: {data["author"]}')

        if data.get('series'):
            parts.append(f'Series: {data["series"]}')

        # Rating information
        rating_parts = []
        if data.get('rating'):
            rating_parts.append(f'Rating: {data["rating"]}')
        if data.get('rating_count'):
            rating_parts.append(f'({data["rating_count"]} ratings)')
        if data.get('reviews_count'):
            rating_parts.append(f'({data["reviews_count"]} reviews)')

        if rating_parts:
            parts.append(' '.join(rating_parts))

        # Publication details
        pub_info = data.get('publication_info', {})
        pub_details = []
        if pub_info.get('year'):
            pub_details.append(f'Published: {pub_info["year"]}')
        if pub_info.get('pages'):
            pub_details.append(f'Pages: {pub_info["pages"]}')
        if data.get('publisher'):
            pub_details.append(f'Publisher: {data["publisher"]}')

        if pub_details:
            parts.append('Publication Details: ' + ', '.join(pub_details))

        if data.get('description'):
            parts.append(f'Description: {data["description"]}')

        if data.get('genres'):
            genres_str = ', '.join(data['genres'])
            parts.append(f'Genres: {genres_str}')

        if data.get('awards'):
            awards_str = ', '.join(data['awards'])
            parts.append(f'Awards: {awards_str}')

        if data.get('similar_books'):
            similar_str = ', '.join(data['similar_books'])
            parts.append(f'Similar Books: {similar_str}')

        if data.get('isbn'):
            parts.append(f'ISBN: {data["isbn"]}')

        # Add user reviews
        if data.get('reviews'):
            reviews_section = self.format_reviews_for_ai(data['reviews'])
            if reviews_section:
                parts.append(reviews_section)

        return '\n\n'.join(parts)

    def format_reviews_for_ai(self, reviews: list) -> str:
        """Format user reviews for AI analysis."""
        if not reviews:
            return ''

        review_parts = ['User Reviews:']

        for i, review in enumerate(reviews, 1):
            reviewer = review.get('reviewer', 'Anonymous')
            rating = review.get('rating')
            text = review.get('text', '').strip()

            if text:
                # Truncate very long reviews for readability
                if len(text) > 300:
                    text = text[:297] + '...'

                review_line = f'{i}. {reviewer}'
                if rating:
                    review_line += f' ({rating}/5 stars)'
                review_line += f': {text}'

                review_parts.append(review_line)

        return '\n'.join(review_parts) if len(review_parts) > 1 else ''

    def scrape_book(self, title: str, author: str = None) -> str | None:
        """Main method to scrape book data by title and return formatted string."""
        try:
            # Step 1: Search for the book
            book_url = self.search_by_title(title, author)
            if not book_url:
                return None

            # Step 2: Get the HTML page
            html = self.get_book_page_html(book_url)
            if not html:
                return None

            # Step 3: Extract data
            data = self.extract_book_data(html)

            # Step 4: Format for AI
            formatted_data = self.format_for_ai(data)

            if not formatted_data.strip():
                search_term = f'"{title}"' + (f' by {author}' if author else '')
                return None

            return formatted_data, book_url

        except Exception as e:
            search_term = f'"{title}"' + (f' by {author}' if author else '')
            return f'Error scraping book data for {search_term}: {e!s}'

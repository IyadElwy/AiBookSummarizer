import json

import requests


def generate_book_summary(
    prompt: str,
    language: str,
    character_size: int,
    input_data: str,
    ollama_host: str,
    model: str,
    timeout: int = 1000,
) -> str | None:
    """
    Generate a book summary using Ollama API.

    Args:
        prompt (str): Base prompt for the summary request
        language (str): Language for the summary (e.g., "English", "German", "French")
        character_size (int): Approximate number of characters for the summary
        input_data (str): The book content or information to summarize
        ollama_host (str): Ollama server URL
        model (str): Model name to use
        timeout (int): Request timeout in seconds

    Returns:
        str: Generated summary or None if failed

    """
    # Construct the full prompt
    full_prompt = f"""
{prompt}

**Requirements:**
- Language: {language}
- Target length: approximately {character_size} characters
- Provide a comprehensive summary that captures the main themes, plot, and key insights

**Content to summarize:**
{input_data}

**Summary:**
"""

    # Prepare the request payload
    payload = {
        'model': model,
        'prompt': full_prompt,
        'stream': False,
        'options': {
            'temperature': 0.7,
            'top_p': 0.9,
            'max_tokens': max(character_size // 3, 500),
        },
    }

    try:
        # Make the API request
        response = requests.post(
            f'{ollama_host}/api/generate', json=payload, timeout=timeout, headers={'Content-Type': 'application/json'}
        )

        # Check if request was successful
        response.raise_for_status()

        # Parse the response
        result = response.json()

        if 'response' in result:
            summary = result['response'].strip()

            # Basic validation
            if len(summary) < 50:
                print(f'Warning: Summary seems too short ({len(summary)} characters)')

            return summary
        print(f'Error: Unexpected response format: {result}')
        return None

    except requests.exceptions.Timeout:
        print(f'Error: Request timed out after {timeout} seconds')
        raise
    except requests.exceptions.ConnectionError:
        print(f'Error: Could not connect to Ollama server at {ollama_host}')
        raise
    except requests.exceptions.HTTPError as e:
        print(f'Error: HTTP error {e.response.status_code}: {e.response.text}')
        raise
    except json.JSONDecodeError:
        print('Error: Could not parse JSON response')
        raise
    except Exception as e:
        print(f'Error: Unexpected error: {e!s}')
        raise

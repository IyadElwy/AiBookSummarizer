import difflib


def string_cross_reference_similarity(strings: list[str], method: str = 'sequence_matcher') -> int:
    """
    Compare similarity between all strings in a list and return a single cross-reference score.

    Args:
        strings: List of strings to compare
        method: Similarity method to use ('sequence_matcher', 'jaccard', 'levenshtein', 'combined')

    Returns:
        Single integer score (0-100 scale) representing overall similarity across all strings
        - 100: All strings are identical
        - 0: All strings are completely different

    """
    if len(strings) < 2:
        return 100  # Single string or empty list is perfectly similar

    n = len(strings)
    total_score = 0.0
    total_comparisons = 0

    # Calculate pairwise similarities (upper triangle of matrix, excluding diagonal)
    for i in range(n):
        for j in range(i + 1, n):
            if method == 'sequence_matcher':
                score = difflib.SequenceMatcher(None, strings[i], strings[j]).ratio()
            elif method == 'jaccard':
                score = jaccard_similarity(strings[i], strings[j])
            elif method == 'levenshtein':
                score = levenshtein_similarity(strings[i], strings[j])
            elif method == 'combined':
                seq_score = difflib.SequenceMatcher(None, strings[i], strings[j]).ratio()
                jac_score = jaccard_similarity(strings[i], strings[j])
                lev_score = levenshtein_similarity(strings[i], strings[j])
                score = (seq_score + jac_score + lev_score) / 3
            else:
                raise ValueError("Method must be 'sequence_matcher', 'jaccard', 'levenshtein', or 'combined'")

            total_score += score
            total_comparisons += 1

    # Return average similarity as integer percentage (0-100)
    avg_similarity = total_score / total_comparisons if total_comparisons > 0 else 1.0
    return round(avg_similarity * 100)


def jaccard_similarity(str1: str, str2: str) -> float:
    """Calculate Jaccard similarity between two strings based on character n-grams."""

    def get_ngrams(string: str, n: int = 2) -> set:
        return set(string[i : i + n] for i in range(len(string) - n + 1)) if len(string) >= n else {string}

    ngrams1 = get_ngrams(str1.lower())
    ngrams2 = get_ngrams(str2.lower())

    if not ngrams1 and not ngrams2:
        return 1.0
    if not ngrams1 or not ngrams2:
        return 0.0

    intersection = len(ngrams1.intersection(ngrams2))
    union = len(ngrams1.union(ngrams2))

    return intersection / union


def levenshtein_similarity(str1: str, str2: str) -> float:
    """Calculate normalized Levenshtein similarity between two strings."""

    def levenshtein_distance(s1: str, s2: str) -> int:
        if len(s1) < len(s2):
            s1, s2 = s2, s1

        if len(s2) == 0:
            return len(s1)

        previous_row = list(range(len(s2) + 1))
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    max_len = max(len(str1), len(str2))
    if max_len == 0:
        return 1.0

    distance = levenshtein_distance(str1.lower(), str2.lower())
    return 1 - (distance / max_len)


def get_similarity_breakdown(strings: list[str]) -> dict[str, int]:
    """Get similarity scores using all methods for comparison."""
    methods = ['sequence_matcher', 'jaccard', 'levenshtein', 'combined']
    return {method: string_cross_reference_similarity(strings, method) for method in methods}

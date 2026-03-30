/**
 * Parse hymn content into verses.
 * Each verse is an array of lines.
 * Returns: { lines: string[], isChorus: boolean }[]
 */
export function parseVerses(content) {
  const blocks = content.split(/\n\s*\n/);
  return blocks
    .map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l !== '');
      if (lines.length === 0) return null;
      const isChorus = !/^\d/.test(lines[0]);
      return { lines, isChorus };
    })
    .filter(Boolean);
}

/**
 * Get a short preview (first verse lines) from content.
 */
export function getPreview(content, maxLines = 2) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l !== '');
  // Skip the number prefix line label if present
  const preview = lines
    .filter(l => !/^\d+\.\s*$/.test(l))
    .slice(0, maxLines)
    .map(l => l.replace(/^\d+\.\s*/, ''))
    .join(' / ');
  return preview;
}

/**
 * Highlight search matches in text, returning HTML string.
 */
export function highlightMatch(text, query) {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 rounded px-0.5">$1</mark>');
}

/**
 * Share via Web Share API or fallback to clipboard.
 */
export async function shareSong(number, title, baseUrl) {
  const url = `${baseUrl}/song/${number}`;
  const text = `Harpa Cristã #${number} - ${title}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: text, url });
      return true;
    } catch {
      // User cancelled or error
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return true;
  } catch {
    return false;
  }
}

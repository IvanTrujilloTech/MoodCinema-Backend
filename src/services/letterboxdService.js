const Parser = require('rss-parser');
const parser = new Parser({
  customFields: {
    item: [
      ['letterboxd:filmTitle', 'filmTitle'],
      ['letterboxd:filmYear', 'filmYear'],
      ['letterboxd:memberRating', 'memberRating'],
      ['letterboxd:watchedDate', 'watchedDate'],
    ],
  },
});

// Simple in-memory cache to avoid hammering Letterboxd
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class LetterboxdService {
  /**
   * Fetches and parses the Letterboxd RSS feed for a user
   * @param {string} username - The Letterboxd username
   * @returns {Promise<Array>} - Array of watched films with ratings
   */
  async getWatchedList(username) {
    if (!username) {
      throw new Error('Username is required');
    }

    const cacheKey = `letterboxd_${username}`;
    if (cache.has(cacheKey)) {
      const { data, timestamp } = cache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log(`[Cache Hit] Letterboxd RSS for ${username}`);
        return data;
      }
    }

    try {
      console.log(`[Fetching] Letterboxd RSS for ${username}`);
      const feed = await parser.parseURL(`https://letterboxd.com/${username}/rss/`);
      
      const watchedFilms = feed.items.map(item => ({
        title: item.filmTitle || item.title.replace(/, \d{4} - .*/, ''),
        year: item.filmYear,
        rating: item.memberRating ? parseFloat(item.memberRating) : null,
        watchedDate: item.watchedDate || item.pubDate,
        link: item.link
      }));

      cache.set(cacheKey, { data: watchedFilms, timestamp: Date.now() });
      return watchedFilms;
    } catch (error) {
      console.error(`Error fetching Letterboxd RSS for ${username}:`, error.message);
      // If user not found or RSS disabled, Letterboxd usually returns 404
      if (error.message.includes('404')) {
         const notFoundError = new Error(`User ${username} not found or has no public RSS`);
         notFoundError.statusCode = 404;
         throw notFoundError;
      }
      throw new Error('Failed to parse Letterboxd data');
    }
  }

  /**
   * Extracts just the titles (for easy exclusion checking)
   */
  async getWatchedTitles(username) {
    const list = await this.getWatchedList(username);
    return new Set(list.map(film => film.title.toLowerCase()));
  }
}

module.exports = new LetterboxdService();

const axios = require('axios');

const TMDB_API_URL = 'https://api.themoviedb.org/3';

class TMDBService {
  constructor() {
    this.api = axios.create({
      baseURL: TMDB_API_URL,
      headers: {
        Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
        accept: 'application/json'
      }
    });
  }

  /**
   * Discover movies based on genres
   */
  async discoverMovies(genres = [], language = 'es-ES', page = 1) {
    try {
      const response = await this.api.get('/discover/movie', {
        params: {
          language,
          page,
          with_genres: genres.join(','),
          'vote_average.gte': 7.0,
          'vote_count.gte': 200,
          sort_by: 'popularity.desc',
          include_adult: false,
          include_video: false
        }
      });
      return response.data.results;
    } catch (error) {
      console.error('TMDB Discover Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch recommendations from TMDB');
    }
  }

  /**
   * Get random cult movies for the Chaos Roulette
   */
  async getRandomCultMovies(language = 'es-ES') {
    try {
      const fetchPage = async (page) => {
        const response = await this.api.get('/discover/movie', {
          params: {
            language,
            page,
            'vote_average.gte': 7.5,
            'vote_count.gte': 500,
            'primary_release_date.lte': '1999-12-31',
            sort_by: 'vote_average.desc',
            include_adult: false
          }
        });
        return response.data.results;
      };

      // Pick a random page between 1 and 5
      const randomPage = Math.floor(Math.random() * 5) + 1;
      let results = await fetchPage(randomPage);
      
      // Fallback if the random page is somehow empty
      if (results.length === 0 && randomPage !== 1) {
         results = await fetchPage(1);
      }
      
      return results;
    } catch (error) {
      console.error('TMDB Cult Random Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch cult movies');
    }
  }

  /**
   * Search for a specific movie (useful for Comfort mode to get TMDB data from Letterboxd title)
   */
  async searchMovie(title, year, language = 'es-ES') {
    try {
      const response = await this.api.get('/search/movie', {
        params: {
          query: title,
          year,
          language,
          page: 1,
          include_adult: false
        }
      });
      return response.data.results[0]; // Return best match
    } catch (error) {
      console.error(`TMDB Search Error for ${title}:`, error.message);
      return null;
    }
  }

  /**
   * Get YouTube trailer for a movie
   */
  async getMovieVideos(movieId, language = 'es-ES') {
    try {
      // Try with requested language first
      let response = await this.api.get(`/movie/${movieId}/videos`, {
        params: { language }
      });
      
      let results = response.data.results;

      // If no videos found in requested language, fallback to English (en-US)
      if (results.length === 0 && language !== 'en-US') {
         const fallbackResponse = await this.api.get(`/movie/${movieId}/videos`, {
            params: { language: 'en-US' }
         });
         results = fallbackResponse.data.results;
      }

      // Filter for YouTube trailers
      const trailers = results.filter(v => v.site === 'YouTube' && v.type === 'Trailer');
      return trailers.length > 0 ? trailers[0] : null;
    } catch (error) {
      console.error(`TMDB Video Error for ${movieId}:`, error.message);
      return null;
    }
  }

  /**
   * Get full details for a movie, including credits and watch providers
   */
  async getMovieDetails(movieId, language = 'es-ES') {
    try {
      const response = await this.api.get(`/movie/${movieId}`, {
        params: {
          language,
          append_to_response: 'credits,watch/providers'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`TMDB Details Error for ${movieId}:`, error.message);
      throw new Error('Failed to fetch movie details');
    }
  }

  /**
   * Discover movies by a specific actor (cast ID)
   */
  async getMoviesByActor(actorId, language = 'es-ES', page = 1) {
    try {
      const response = await this.api.get('/discover/movie', {
        params: {
          language,
          page,
          with_cast: actorId,
          sort_by: 'popularity.desc',
          include_adult: false
        }
      });
      return response.data;
    } catch (error) {
      console.error(`TMDB Actor Movies Error for actor ${actorId}:`, error.message);
      throw new Error('Failed to fetch movies for actor');
    }
  }
  /**
   * Search for a person (actor/director)
   */
  async searchPerson(query, language = 'es-ES') {
    try {
      const response = await this.api.get('/search/person', {
        params: {
          query,
          language,
          page: 1,
          include_adult: false
        }
      });
      return response.data.results[0]; // Best match
    } catch (error) {
      console.error(`TMDB Search Person Error for ${query}:`, error.message);
      return null;
    }
  }
}

module.exports = new TMDBService();

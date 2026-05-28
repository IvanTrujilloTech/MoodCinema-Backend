const express = require('express');
const router = express.Router();
const tmdbService = require('../services/tmdbService');
const letterboxdService = require('../services/letterboxdService');
const { getMoodConfig } = require('../services/moodEngine');

/**
 * GET /api/movies/recommend
 * Recommends movies based on mood, filtering out what the user already watched
 */
router.get('/recommend', async (req, res, next) => {
  try {
    const { mood, username, lang = 'es-ES' } = req.query;

    if (!mood) {
      return res.status(400).json({ error: { message: 'Mood parameter is required', status: 400 } });
    }

    const config = getMoodConfig(mood);
    let watchedTitles = new Set();
    let watchedList = [];

    // Fetch watched list if username is provided
    if (username) {
      try {
        watchedList = await letterboxdService.getWatchedList(username);
        watchedTitles = new Set(watchedList.map(f => f.title.toLowerCase()));
      } catch (err) {
        console.warn(`Could not fetch watched list for ${username}:`, err.message);
        // Continue even if RSS fails, just won't filter
      }
    }

    let recommendations = [];

    if (mood === 'comfort') {
      // Special logic: Pick from highly rated watched movies
      const highlyRated = watchedList.filter(f => f.rating >= config.minRating);
      if (highlyRated.length === 0) {
        return res.json({ 
          success: true, 
          message: 'No 4+ star movies found in recent watched list. Try another mood!',
          data: []
        });
      }
      
      // Sort descending by rating (5 down to 4)
      const sortedComfort = highlyRated.sort((a, b) => b.rating - a.rating);
      
      // Fetch TMDB details for all of them
      recommendations = await Promise.all(sortedComfort.map(async (movie) => {
        const tmdbData = await tmdbService.searchMovie(movie.title, movie.year, lang);
        return tmdbData ? { ...tmdbData, letterboxdRating: movie.rating } : null;
      }));
      
      recommendations = recommendations.filter(r => r !== null);
      
    } else {
      // Standard logic: Fetch by genre and exclude watched
      const pageNum = parseInt(req.query.page) || 1;
      const tmdbResults = await tmdbService.discoverMovies(config.genres, lang, pageNum);
      
      if (config.excludeWatched && watchedTitles.size > 0) {
        recommendations = tmdbResults.filter(movie => !watchedTitles.has(movie.title.toLowerCase()));
        
        // If we filtered out too many, fetch next page (simple pagination strategy)
        if (recommendations.length < 5) {
          const page2 = await tmdbService.discoverMovies(config.genres, lang, pageNum + 1);
          recommendations = [...recommendations, ...page2.filter(movie => !watchedTitles.has(movie.title.toLowerCase()))];
        }
      } else {
        recommendations = tmdbResults;
      }
    }

    res.json({
      success: true,
      mood: config.label,
      count: recommendations.length,
      data: mood === 'comfort' ? recommendations : recommendations.slice(0, 10)
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/movies/roulette
 * Chaos mode: Random cult classic
 */
router.get('/roulette', async (req, res, next) => {
  try {
    const { lang = 'es-ES' } = req.query;
    const movies = await tmdbService.getRandomCultMovies(lang);
    
    if (movies.length === 0) {
       return res.status(404).json({ error: { message: 'No cult movies found', status: 404 } });
    }
    
    // Pick a random movie from the list
    const randomMovie = movies[Math.floor(Math.random() * movies.length)];

    res.json({
      success: true,
      data: randomMovie
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/movies/:id/trailer
 * Gets the YouTube trailer for a movie
 */
router.get('/:id/trailer', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang = 'es-ES' } = req.query;
    
    const trailer = await tmdbService.getMovieVideos(id, lang);
    
    if (!trailer) {
      return res.json({ success: true, data: null, message: 'No trailer found' });
    }
    
    res.json({
      success: true,
      data: trailer
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/movies/:id/details
 * Gets full details including cast and watch providers
 */
router.get('/:id/details', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang = 'es-ES' } = req.query;
    
    const details = await tmdbService.getMovieDetails(id, lang);
    res.json({ success: true, data: details });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/movies/actor/:actorId
 * Gets movies for a specific actor, filtering watched ones
 */
router.get('/actor/:actorId', async (req, res, next) => {
  try {
    const { actorId } = req.params;
    const { username, lang = 'es-ES', page = 1 } = req.query;

    let watchedTitles = new Set();
    
    if (username) {
      try {
        const watchedList = await letterboxdService.getWatchedList(username);
        watchedTitles = new Set(watchedList.map(f => f.title.toLowerCase()));
      } catch (err) {
        console.warn(`Could not fetch watched list for ${username}:`, err.message);
      }
    }

    const tmdbResponse = await tmdbService.getMoviesByActor(actorId, lang, page);
    
    let recommendations = tmdbResponse.results;
    if (watchedTitles.size > 0) {
      recommendations = recommendations.filter(movie => !watchedTitles.has(movie.title.toLowerCase()));
    }

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations.slice(0, 10),
      total_pages: tmdbResponse.total_pages
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/movies/actor-search
 * Searches for an actor by name, then gets their movies filtering watched ones
 */
router.get('/actor-search', async (req, res, next) => {
  try {
    const { query, username, lang = 'es-ES', page = 1 } = req.query;

    if (!query) {
      return res.status(400).json({ error: { message: 'Query is required', status: 400 } });
    }

    const person = await tmdbService.searchPerson(query, lang);
    if (!person) {
      return res.status(404).json({ error: { message: 'Actor not found', status: 404 } });
    }

    let watchedTitles = new Set();
    if (username) {
      try {
        const watchedList = await letterboxdService.getWatchedList(username);
        watchedTitles = new Set(watchedList.map(f => f.title.toLowerCase()));
      } catch (err) {
        console.warn(`Could not fetch watched list for ${username}:`, err.message);
      }
    }

    const tmdbResponse = await tmdbService.getMoviesByActor(person.id, lang, page);
    
    let recommendations = tmdbResponse.results;
    if (watchedTitles.size > 0) {
      recommendations = recommendations.filter(movie => !watchedTitles.has(movie.title.toLowerCase()));
    }

    res.json({
      success: true,
      actor: person,
      count: recommendations.length,
      data: recommendations.slice(0, 10),
      total_pages: tmdbResponse.total_pages
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;

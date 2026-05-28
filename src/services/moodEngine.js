/**
 * Maps mood keys to TMDB genre IDs and defines special behaviors
 */
const moodMapping = {
  cry: {
    label: 'Drama',
    genres: [18], // Drama
    excludeWatched: true,
  },
  adrenaline: {
    label: 'Acción y Thriller',
    genres: [28, 53], // Action, Thriller
    excludeWatched: true,
  },
  braindead: {
    label: 'Comedia y Animación',
    genres: [35, 16], // Comedy, Animation
    excludeWatched: true,
  },
  psycho: {
    label: 'Terror y Misterio',
    genres: [27, 9648], // Horror, Mystery
    excludeWatched: true,
  },
  comfort: {
    label: 'Favoritas (Comfort)',
    genres: [], // All genres
    excludeWatched: false, // Special case: we WANT watched movies
    minRating: 4.0, // Only 4 or 5 stars from their watched list
  },
  chaos: {
    label: 'Cine de Culto (Aleatorio)',
    genres: [],
    excludeWatched: true,
    isRandom: true,
  },
  romance: {
    label: 'Romance y Amor',
    genres: [10749, 18], // Romance, Drama
    excludeWatched: true,
  },
  adventure: {
    label: 'Aventura y Ciencia Ficción',
    genres: [12, 878], // Adventure, Sci-Fi
    excludeWatched: true,
  }
};

const getMoodConfig = (moodKey) => {
  return moodMapping[moodKey] || moodMapping['chaos'];
};

module.exports = {
  moodMapping,
  getMoodConfig
};

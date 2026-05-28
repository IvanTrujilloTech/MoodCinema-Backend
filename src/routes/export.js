const express = require('express');
const router = express.Router();

/**
 * POST /api/export/csv
 * Generates a CSV file in Letterboxd format from an array of movies
 */
router.post('/csv', (req, res, next) => {
  try {
    const { movies } = req.body;
    
    if (!movies || !Array.isArray(movies) || movies.length === 0) {
      return res.status(400).json({ error: { message: 'Array of movies is required', status: 400 } });
    }

    // Letterboxd import format expects: Title,Year,Directors,Rating10,Tags,WatchedDate,Review
    // We can at least provide Title, Year, and a Tag indicating it was recommended by Mood-Fi
    const csvData = movies.map(movie => {
       const year = movie.release_date ? movie.release_date.substring(0, 4) : '';
       return {
         Title: movie.title,
         Year: year,
         Tags: 'MoodCinema Recommendation'
       };
    });

    const fields = ['Title', 'Year', 'Tags'];
    const opts = { fields };
    
    try {
      // Manual CSV string generation to avoid adding another dependency
      const header = 'Title,Year,Tags\n';
      const rows = csvData.map(row => `"${row.Title.replace(/"/g, '""')}","${row.Year}","${row.Tags}"`).join('\n');
      const csv = header + rows;

      res.header('Content-Type', 'text/csv');
      res.attachment('moodcinema-recommendations.csv');
      return res.send(csv);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: { message: 'Error generating CSV', status: 500 } });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const letterboxdService = require('../services/letterboxdService');

/**
 * GET /api/letterboxd/:username
 * Fetches the recently watched films for a Letterboxd user
 */
router.get('/:username', async (req, res, next) => {
  try {
    const { username } = req.params;
    
    // Validate username
    if (!username || username.trim() === '') {
      return res.status(400).json({ error: { message: 'Username is required', status: 400 } });
    }

    const watchedList = await letterboxdService.getWatchedList(username);
    
    res.json({
      success: true,
      username,
      count: watchedList.length,
      data: watchedList
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

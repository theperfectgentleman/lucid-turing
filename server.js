const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const db = require('./db');
const { extractWordsFromImage, extractWordsFromText } = require('./gemini');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Setup Multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images (jpeg, jpg, png, webp) are allowed"));
  }
});

// APIs

// 1. Get dashboard statistics
app.get('/api/words/stats', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  try {
    const totalResult = await db.query('SELECT COUNT(*) FROM words');
    const categoriesResult = await db.query('SELECT category, COUNT(*) FROM words GROUP BY category');
    const boxResult = await db.query(`
      SELECT COALESCE(p.box, 1) as box, COUNT(*) 
      FROM words w
      LEFT JOIN user_word_progress p ON p.word_id = w.id AND p.user_id = $1
      GROUP BY COALESCE(p.box, 1)
      ORDER BY box
    `, [userId]);
    const dueResult = await db.query(`
      SELECT COUNT(*) 
      FROM words w
      LEFT JOIN user_word_progress p ON p.word_id = w.id AND p.user_id = $1
      WHERE p.next_review_date <= NOW() OR p.attempts IS NULL OR p.attempts = 0
    `, [userId]);
    
    res.json({
      total: parseInt(totalResult.rows[0].count),
      due: parseInt(dueResult.rows[0].count),
      categories: categoriesResult.rows.map(row => ({ category: row.category, count: parseInt(row.count) })),
      boxes: boxResult.rows.map(row => ({ box: parseInt(row.box), count: parseInt(row.count) }))
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

// 1.5. Get distinct tags
app.get('/api/words/tags', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT tag 
      FROM words 
      WHERE tag IS NOT NULL AND tag != '' 
      ORDER BY tag ASC
    `);
    res.json({ tags: result.rows.map(row => row.tag) });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Server error fetching tags' });
  }
});

// 2. OCR and extract words from booklet image
app.post('/api/admin/extract-words', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    const tag = req.body.tag || '';
    const extractionResult = await extractWordsFromImage(req.file.buffer, req.file.mimetype);
    
    // Check which words are already in the database
    const extractedWordsList = extractionResult.words || [];
    const enrichedWords = [];
    
    for (const w of extractedWordsList) {
      const dbCheck = await db.query('SELECT id FROM words WHERE LOWER(word) = LOWER($1)', [w.word.trim()]);
      enrichedWords.push({
        ...w,
        tag: tag,
        alreadyExists: dbCheck.rows.length > 0
      });
    }
    
    res.json({ words: enrichedWords });
  } catch (error) {
    console.error('Error in word extraction:', error);
    res.status(500).json({ error: error.message || 'Error extracting words' });
  }
});

// 2b. Extract words from pasted text
app.post('/api/admin/extract-pasted-words', async (req, res) => {
  try {
    const { text, category, tag } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    const extractionResult = await extractWordsFromText(text, category);
    
    // Check which words are already in the database
    const extractedWordsList = extractionResult.words || [];
    const enrichedWords = [];
    
    for (const w of extractedWordsList) {
      if (!w.word) continue;
      const dbCheck = await db.query('SELECT id FROM words WHERE LOWER(word) = LOWER($1)', [w.word.trim()]);
      enrichedWords.push({
        ...w,
        tag: tag || '',
        alreadyExists: dbCheck.rows.length > 0
      });
    }
    
    res.json({ words: enrichedWords });
  } catch (error) {
    console.error('Error in text word extraction:', error);
    res.status(500).json({ error: error.message || 'Error extracting words from text' });
  }
});

// 3. Save a batch of words (Admin)
app.post('/api/admin/save-words', async (req, res) => {
  const { words } = req.body;
  if (!Array.isArray(words)) {
    return res.status(400).json({ error: 'Invalid payload, words array required' });
  }
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const w of words) {
      // Clean word formatting
      const cleanWord = w.word.trim();
      
      // Perform strict check if word exists
      const checkResult = await client.query('SELECT id FROM words WHERE LOWER(word) = LOWER($1)', [cleanWord]);
      
      if (checkResult.rows.length > 0) {
        skippedCount++;
        continue;
      }
      
      // Insert new word
      await client.query(`
        INSERT INTO words (
          word, definition, sentence, category, part_of_speech, 
          morphemes, alternate_pronunciations, spelling_tip, tag
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        cleanWord,
        w.definition,
        w.sentence,
        w.category || 'Other',
        w.part_of_speech,
        JSON.stringify(w.morphemes || []),
        w.alternate_pronunciations || [],
        w.spelling_tip || '',
        w.tag || ''
      ]);
      
      addedCount++;
    }
    
    await client.query('COMMIT');
    res.json({ success: true, addedCount, skippedCount });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving words:', error);
    res.status(500).json({ error: 'Database transaction failed' });
  } finally {
    client.release();
  }
});

// 4. Get all words with pagination and filters (Admin Dashboard list)
app.get('/api/admin/words', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50, tag } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM words WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }
    
    if (tag) {
      query += ` AND tag = $${paramIndex++}`;
      params.push(tag);
    }
    
    if (search) {
      query += ` AND word ILIKE $${paramIndex++}`;
      params.push(`%${search}%`);
    }
    
    // Get total count for pagination
    let countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const totalResult = await db.query(countQuery, params);
    const total = parseInt(totalResult.rows[0].count);
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), offset);
    
    const result = await db.query(query, params);
    
    res.json({
      words: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching admin words:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. Delete word (Admin)
app.delete('/api/admin/words/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM words WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting word:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. Update individual word details (Admin)
app.put('/api/admin/words/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { word, definition, sentence, category, part_of_speech, morphemes, alternate_pronunciations, spelling_tip, tag } = req.body;
    
    await db.query(`
      UPDATE words SET 
        word = $1, definition = $2, sentence = $3, category = $4, 
        part_of_speech = $5, morphemes = $6, alternate_pronunciations = $7, 
        spelling_tip = $8, tag = $9
      WHERE id = $10
    `, [
      word.trim(),
      definition,
      sentence,
      category,
      part_of_speech,
      JSON.stringify(morphemes || []),
      alternate_pronunciations || [],
      spelling_tip || '',
      tag || '',
      id
    ]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating word:', error);
    res.status(500).json({ error: 'Server error updating word' });
  }
});

// 7. Get due review words or new words (Practice and Study mode)
app.get('/api/words/due', async (req, res) => {
  try {
    const { limit = 20, category, userId, tag } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    let query = `
      SELECT w.*, 
             COALESCE(p.box, 1) as box, 
             COALESCE(p.interval, 0) as interval, 
             COALESCE(p.ease_factor, 2.5) as ease_factor, 
             COALESCE(p.attempts, 0) as attempts,
             COALESCE(p.correct_attempts, 0) as correct_attempts
      FROM words w
      LEFT JOIN user_word_progress p ON p.word_id = w.id AND p.user_id = $1
      WHERE (p.next_review_date <= NOW() OR p.attempts IS NULL OR p.attempts = 0)
    `;
    const params = [userId];
    
    if (category) {
      query += ` AND w.category = $${params.length + 1}`;
      params.push(category);
    }
    
    if (tag) {
      query += ` AND w.tag = $${params.length + 1}`;
      params.push(tag);
    }
    
    query += ` ORDER BY COALESCE(p.box, 1) ASC, COALESCE(p.next_review_date, CURRENT_TIMESTAMP) ASC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    res.json({ words: result.rows });
  } catch (error) {
    console.error('Error fetching due words:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. Get random words for testing modes (Standard Round or Speed Round)
app.get('/api/words/random', async (req, res) => {
  try {
    const { limit = 20, category, userId, tag } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    let query = `
      SELECT w.*, 
             COALESCE(p.box, 1) as box, 
             COALESCE(p.interval, 0) as interval, 
             COALESCE(p.ease_factor, 2.5) as ease_factor, 
             COALESCE(p.attempts, 0) as attempts,
             COALESCE(p.correct_attempts, 0) as correct_attempts
      FROM words w
      LEFT JOIN user_word_progress p ON p.word_id = w.id AND p.user_id = $1
      WHERE 1=1
    `;
    const params = [userId];
    
    if (category) {
      query += ` AND w.category = $${params.length + 1}`;
      params.push(category);
    }
    
    if (tag) {
      query += ` AND w.tag = $${params.length + 1}`;
      params.push(tag);
    }
    
    query += ` ORDER BY RANDOM() LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await db.query(query, params);
    res.json({ words: result.rows });
  } catch (error) {
    console.error('Error fetching random words:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Shuffles an array in place
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 8.5 Get history of practiced words for this user
app.get('/api/words/history', async (req, res) => {
  try {
    const { userId, category, limit = 50, page = 1, tag } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT w.*, 
             p.box, 
             p.attempts, 
             p.correct_attempts, 
             p.next_review_date, 
             p.last_quality
      FROM user_word_progress p
      JOIN words w ON p.word_id = w.id
      WHERE p.user_id = $1 AND p.attempts > 0
    `;
    const params = [userId];
    let paramIndex = 2;
    
    if (category) {
      query += ` AND w.category = $${paramIndex++}`;
      params.push(category);
    }
    
    if (tag) {
      query += ` AND w.tag = $${paramIndex++}`;
      params.push(tag);
    }
    
    // Get total for pagination
    const countQuery = `SELECT COUNT(*) FROM (${query}) as total`;
    const totalRes = await db.query(countQuery, params);
    const total = parseInt(totalRes.rows[0].count);
    
    query += ` ORDER BY p.next_review_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), offset);
    
    const result = await db.query(query, params);
    
    res.json({
      words: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Server error fetching practice history' });
  }
});

// 8.6 Get custom words query (random/sequential settings, categories filtering, history source option)
app.get('/api/words/custom', async (req, res) => {
  try {
    const { userId, source = 'all', category = 'all', tag = 'all', orderWords = 'random', orderCategories = 'random', limit = 20 } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    let query = '';
    const params = [userId];
    
    if (source === 'history') {
      // Query words already practiced
      query = `
        SELECT w.*, 
               COALESCE(p.box, 1) as box, 
               COALESCE(p.attempts, 0) as attempts,
               COALESCE(p.correct_attempts, 0) as correct_attempts
        FROM user_word_progress p
        JOIN words w ON p.word_id = w.id
        WHERE p.user_id = $1 AND p.attempts > 0
      `;
    } else if (source === 'srs') {
      // Query due / new words
      query = `
        SELECT w.*, 
               COALESCE(p.box, 1) as box, 
               COALESCE(p.attempts, 0) as attempts,
               COALESCE(p.correct_attempts, 0) as correct_attempts
        FROM words w
        LEFT JOIN user_word_progress p ON p.word_id = w.id AND p.user_id = $1
        WHERE (p.next_review_date <= NOW() OR p.attempts IS NULL OR p.attempts = 0)
      `;
    } else {
      // Query all words
      query = `
        SELECT w.*, 
               COALESCE(p.box, 1) as box, 
               COALESCE(p.attempts, 0) as attempts,
               COALESCE(p.correct_attempts, 0) as correct_attempts
        FROM words w
        LEFT JOIN user_word_progress p ON p.word_id = w.id AND p.user_id = $1
        WHERE 1=1
      `;
    }
    
    if (category && category !== 'all') {
      query += ` AND w.category = $${params.length + 1}`;
      params.push(category);
    }
    
    if (tag && tag !== 'all') {
      query += ` AND w.tag = $${params.length + 1}`;
      params.push(tag);
    }
    
    const result = await db.query(query, params);
    let words = result.rows;
    
    // Group words by category for custom sorting
    const groups = {};
    words.forEach(w => {
      const cat = w.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(w);
    });
    
    // Process words in each category
    Object.keys(groups).forEach(cat => {
      if (orderWords === 'random') {
        shuffleArray(groups[cat]);
      } else {
        // Sequential (Alphabetical)
        groups[cat].sort((a, b) => a.word.localeCompare(b.word));
      }
    });
    
    // Order categories
    let categoriesList = Object.keys(groups);
    if (orderCategories === 'random') {
      shuffleArray(categoriesList);
    } else {
      // Sequential by category name
      categoriesList.sort((a, b) => a.localeCompare(b));
    }
    
    // Flatten list
    let resultWords = [];
    categoriesList.forEach(cat => {
      resultWords = resultWords.concat(groups[cat]);
    });
    
    // Slice by limit
    res.json({ words: resultWords.slice(0, parseInt(limit)) });
  } catch (error) {
    console.error('Error fetching custom words:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 9. Update SRS status of a word (SuperMemo-2 SM2)
app.post('/api/words/:id/review', async (req, res) => {
  const { id } = req.params;
  const { quality, userId } = req.body; // Scale 0-5
  
  if (quality === undefined || quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'Quality score (0-5) is required' });
  }
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    // Check if word exists
    const wordExists = await db.query('SELECT id FROM words WHERE id = $1', [id]);
    if (wordExists.rows.length === 0) {
      return res.status(404).json({ error: 'Word not found' });
    }

    // Fetch user progress for this word
    const fetchRes = await db.query(`
      SELECT attempts, correct_attempts, box, interval, ease_factor 
      FROM user_word_progress 
      WHERE user_id = $1 AND word_id = $2
    `, [userId, id]);
    
    let attempts = 0;
    let correct_attempts = 0;
    let box = 1;
    let interval = 0;
    let ease_factor = 2.5;

    if (fetchRes.rows.length > 0) {
      attempts = fetchRes.rows[0].attempts;
      correct_attempts = fetchRes.rows[0].correct_attempts;
      box = fetchRes.rows[0].box;
      interval = fetchRes.rows[0].interval;
      ease_factor = fetchRes.rows[0].ease_factor;
    }
    
    attempts += 1;
    let isCorrect = quality >= 3;
    if (isCorrect) {
      correct_attempts += 1;
    }
    
    // SuperMemo-2 calculations
    if (isCorrect) {
      if (box === 1) {
        interval = 1; // 1 day
      } else if (box === 2) {
        interval = 4; // 4 days
      } else {
        interval = Math.round(interval * ease_factor);
      }
      box = Math.min(box + 1, 5); // Max box 5
    } else {
      box = 1;
      interval = 1;
    }
    
    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    ease_factor = Math.max(1.3, ease_factor);
    
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    
    // Upsert user progress
    await db.query(`
      INSERT INTO user_word_progress (
        user_id, word_id, attempts, correct_attempts, box, interval, ease_factor, next_review_date, last_quality
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, word_id) DO UPDATE SET
        attempts = EXCLUDED.attempts,
        correct_attempts = EXCLUDED.correct_attempts,
        box = EXCLUDED.box,
        interval = EXCLUDED.interval,
        ease_factor = EXCLUDED.ease_factor,
        next_review_date = EXCLUDED.next_review_date,
        last_quality = EXCLUDED.last_quality
    `, [userId, id, attempts, correct_attempts, box, interval, ease_factor, nextReviewDate, quality]);
    
    res.json({
      success: true,
      srs: {
        attempts,
        correct_attempts,
        box,
        interval,
        ease_factor,
        next_review_date: nextReviewDate
      }
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Authentication endpoints
app.post('/api/auth/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'pass123') {
    res.json({ success: true, role: 'admin' });
  } else {
    res.status(401).json({ error: 'Invalid admin credentials' });
  }
});

app.get('/api/auth/profiles', async (req, res) => {
  try {
    const result = await db.query("SELECT id, name FROM user_profiles ORDER BY name ASC");
    res.json({ profiles: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error fetching user profiles' });
  }
});

app.post('/api/auth/user-login', async (req, res) => {
  const { profileId, pin } = req.body;
  if (!profileId || !pin) {
    return res.status(400).json({ error: 'Profile ID and PIN are required' });
  }
  try {
    const result = await db.query("SELECT id, name, pin FROM user_profiles WHERE id = $1", [profileId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const profile = result.rows[0];
    if (profile.pin.trim() === pin.trim()) {
      res.json({ success: true, user: { id: profile.id, name: profile.name } });
    } else {
      res.status(401).json({ error: 'Invalid PIN code' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error during authentication' });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await db.query("SELECT id, name, pin, created_at FROM user_profiles ORDER BY name ASC");
    res.json({ users: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users', async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: 'Name and PIN are required' });
  }
  try {
    const check = await db.query("SELECT id FROM user_profiles WHERE LOWER(name) = LOWER($1)", [name.trim()]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'A profile with this name already exists' });
    }
    const result = await db.query(
      "INSERT INTO user_profiles (name, pin) VALUES ($1, $2) RETURNING id, name, pin, created_at",
      [name.trim(), pin.trim()]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const countRes = await db.query("SELECT COUNT(*) FROM user_profiles");
    if (parseInt(countRes.rows[0].count) <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last user profile' });
    }
    await db.query("DELETE FROM user_profiles WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve frontend static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
  });
}

// Initialize database and start server
db.initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to start application because DB connection failed:', err);
  process.exit(1);
});

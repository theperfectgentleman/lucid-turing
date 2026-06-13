const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test connection and initialize tables
const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Successfully connected to the PostgreSQL database.');
    
    // Create words table
    await client.query(`
      CREATE TABLE IF NOT EXISTS words (
        id SERIAL PRIMARY KEY,
        word VARCHAR(255) UNIQUE NOT NULL,
        definition TEXT,
        sentence TEXT,
        category VARCHAR(100),
        part_of_speech VARCHAR(100),
        morphemes JSONB,
        alternate_pronunciations TEXT[],
        spelling_tip TEXT,
        
        -- Spaced Repetition (SRS) fields (SuperMemo-2 algorithm)
        box INTEGER DEFAULT 1,
        interval INTEGER DEFAULT 0,
        ease_factor DOUBLE PRECISION DEFAULT 2.5,
        next_review_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        attempts INTEGER DEFAULT 0,
        correct_attempts INTEGER DEFAULT 0,
        last_quality INTEGER,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create index on word for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
    `);
    
    // Create user_profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        pin VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create user_word_progress table for per-user tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_word_progress (
        user_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
        word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
        box INTEGER DEFAULT 1,
        interval INTEGER DEFAULT 0,
        ease_factor DOUBLE PRECISION DEFAULT 2.5,
        next_review_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        attempts INTEGER DEFAULT 0,
        correct_attempts INTEGER DEFAULT 0,
        last_quality INTEGER,
        PRIMARY KEY (user_id, word_id)
      );
    `);

    // Create index on next_review_date for speed
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_progress_next_review ON user_word_progress(next_review_date);
    `);
    
    // Seed default user profile
    await client.query(`
      INSERT INTO user_profiles (name, pin) 
      VALUES ('Student', '1234') 
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log('Database tables initialized successfully.');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initDb
};

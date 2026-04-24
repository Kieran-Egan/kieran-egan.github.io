const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'change-this-in-production';

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Using insecure default. Set it before going to production.');
}

// Uploads directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR);

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter
});

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: AVATARS_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `user-${req.userId}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter
});

// Middleware
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://kieranegan.com',
  'https://www.kieranegan.com',
  'https://kieran-egan.github.io'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(bodyParser.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static('.'));

// Database files
const DB_DIR = path.join(__dirname, 'db');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const POSTS_FILE = path.join(DB_DIR, 'posts.json');
const LIKES_FILE = path.join(DB_DIR, 'likes.json');
const BOOKS_FILE = path.join(DB_DIR, 'books.json');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR);
}

// Seed books from static books.json if db copy doesn't exist yet
if (!fs.existsSync(BOOKS_FILE)) {
  const staticBooks = path.join(__dirname, 'books.json');
  if (fs.existsSync(staticBooks)) {
    fs.copyFileSync(staticBooks, BOOKS_FILE);
  } else {
    fs.writeFileSync(BOOKS_FILE, '[]', 'utf8');
  }
}

// Helper: Read JSON file
const readDB = (file, defaultValue = []) => {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
  }
  return defaultValue;
};

// Helper: Write JSON file
const writeDB = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
  }
};

// Helper: Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, SECRET_KEY, { expiresIn: '7d' });
};

// Middleware: Verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware: Verify admin
const verifyAdmin = (req, res, next) => {
  const users = readDB(USERS_FILE, []);
  const user = users.find(u => u.id === req.userId);

  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
};

// Routes: Authentication

app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const users = readDB(USERS_FILE, []);
  
  // Check if user already exists
  if (users.find(u => u.email === email || u.username === username)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const newUser = {
    id: Date.now(),
    username,
    email,
    password: hashedPassword,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
    isAdmin: email === 'kieran.fo.egan@gmail.com',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeDB(USERS_FILE, users);

  const token = generateToken(newUser.id);
  res.status(201).json({
    token,
    user: { id: newUser.id, username, email, avatar: newUser.avatar, isAdmin: newUser.isAdmin }
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const users = readDB(USERS_FILE, []);
  const user = users.find(u => u.email === email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, isAdmin: user.isAdmin }
  });
});

app.get('/api/me', verifyToken, (req, res) => {
  const users = readDB(USERS_FILE, []);
  const user = users.find(u => u.id === req.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ id: user.id, username: user.username, email: user.email, avatar: user.avatar, isAdmin: user.isAdmin });
});

// Routes: Posts (Socials)

app.get('/api/posts', (req, res) => {
  let posts = readDB(POSTS_FILE, []);
  const likes = readDB(LIKES_FILE, []);
  const users = readDB(USERS_FILE, []);

  // Enrich posts with author info and like counts
  posts = posts.map(post => {
    const author = users.find(u => u.id === post.authorId);
    const postLikes = likes.filter(l => l.postId === post.id);
    return {
      ...post,
      author: {
        id: author?.id,
        username: author?.username,
        avatar: author?.avatar
      },
      likeCount: postLikes.length,
      liked: req.headers['x-user-id'] ? postLikes.some(l => l.userId === parseInt(req.headers['x-user-id'])) : false
    };
  });

  res.json(posts.reverse());
});

app.post('/api/posts', verifyToken, verifyAdmin, (req, res) => {
  const { content, media } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Post content required' });
  }

  const posts = readDB(POSTS_FILE, []);
  const users = readDB(USERS_FILE, []);
  const author = users.find(u => u.id === req.userId);

  const newPost = {
    id: Date.now(),
    authorId: req.userId,
    content,
    media: media || [],
    createdAt: new Date().toISOString(),
    commentCount: 0
  };

  posts.push(newPost);
  writeDB(POSTS_FILE, posts);

  res.status(201).json({
    ...newPost,
    author: {
      id: author?.id,
      username: author?.username,
      avatar: author?.avatar
    },
    likeCount: 0,
    liked: false
  });
});

// Routes: Likes

app.post('/api/posts/:postId/like', verifyToken, (req, res) => {
  const { postId } = req.params;
  const likes = readDB(LIKES_FILE, []);

  // Check if already liked
  const existingLike = likes.find(l => l.postId === parseInt(postId) && l.userId === req.userId);

  if (existingLike) {
    // Unlike
    const newLikes = likes.filter(l => !(l.postId === parseInt(postId) && l.userId === req.userId));
    writeDB(LIKES_FILE, newLikes);
    return res.json({ liked: false });
  } else {
    // Like
    const newLike = {
      id: Date.now(),
      postId: parseInt(postId),
      userId: req.userId,
      createdAt: new Date().toISOString()
    };
    likes.push(newLike);
    writeDB(LIKES_FILE, likes);
    return res.json({ liked: true });
  }
});

app.get('/api/posts/:postId/likes', (req, res) => {
  const { postId } = req.params;
  const likes = readDB(LIKES_FILE, []);
  const users = readDB(USERS_FILE, []);

  const postLikes = likes
    .filter(l => l.postId === parseInt(postId))
    .map(l => {
      const user = users.find(u => u.id === l.userId);
      return {
        userId: user?.id,
        username: user?.username,
        avatar: user?.avatar
      };
    });

  res.json(postLikes);
});

// Routes: Users (for profile viewing)

app.get('/api/users/:userId', (req, res) => {
  const users = readDB(USERS_FILE, []);
  const user = users.find(u => u.id === parseInt(req.params.userId));

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    createdAt: user.createdAt
  });
});

// Routes: Books

app.get('/api/books', (req, res) => {
  const books = readDB(BOOKS_FILE, []);
  res.json(books);
});

app.post('/api/books', verifyToken, verifyAdmin, (req, res) => {
  const { title, author, status, pages, rating, note, link, cover, started_reading, finished_reading } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const books = readDB(BOOKS_FILE, []);
  const maxId = books.reduce((max, b) => Math.max(max, b.id || 0), 0);

  const newBook = {
    id: maxId + 1,
    title: title.trim(),
    author: author || 'Unknown',
    status: status || 'to-read',
    pages: parseInt(pages) || 0,
    rating: parseInt(rating) || 0,
    note: note || '',
    link: link || '',
    cover: cover || 'placeholder.jpg',
    started_reading: started_reading || new Date().toISOString().split('T')[0]
  };

  if (finished_reading) newBook.finished_reading = finished_reading;

  books.push(newBook);
  writeDB(BOOKS_FILE, books);

  res.status(201).json(newBook);
});

// Routes: File Upload

app.post('/api/upload', verifyToken, verifyAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Routes: Profile

app.post('/api/profile/avatar', verifyToken, avatarUpload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  const users = readDB(USERS_FILE, []);
  const idx = users.findIndex(u => u.id === req.userId);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  // Delete old avatar file if it was a local upload
  const oldAvatar = users[idx].avatar;
  if (oldAvatar && oldAvatar.startsWith('/uploads/avatars/')) {
    const oldPath = path.join(__dirname, oldAvatar);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  users[idx].avatar = `/uploads/avatars/${req.file.filename}`;
  writeDB(USERS_FILE, users);

  const u = users[idx];
  res.json({ id: u.id, username: u.username, email: u.email, avatar: u.avatar, isAdmin: u.isAdmin });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /api/register - Register new user');
  console.log('  POST /api/login - Login user');
  console.log('  GET /api/me - Get current user (requires token)');
  console.log('  GET /api/posts - Get all posts');
  console.log('  POST /api/posts - Create new post (requires token)');
  console.log('  POST /api/posts/:postId/like - Like/unlike post (requires token)');
  console.log('  GET /api/posts/:postId/likes - Get likes for a post');
  console.log('  GET /api/users/:userId - Get user profile');
});

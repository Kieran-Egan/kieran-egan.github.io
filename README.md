# Multi-User Social & Books Platform

This is an enhanced version of your website with user authentication, multi-user support, and backend persistence.

## Setup Instructions

### 1. Install Dependencies

```bash
cd /path/to/kieran-egan.github.io
npm install
```

This will install:
- `express` - Web server
- `cors` - Cross-origin requests
- `bcryptjs` - Password hashing
- `jsonwebtoken` - User authentication
- `body-parser` - Parse JSON requests

### 2. Start the Backend Server

```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 3. Access the Application

Open your browser and navigate to:
- **http://localhost:3000/auth.html** - Login/Register page
- **http://localhost:3000/social.html** - Social feed (requires login)
- **http://localhost:3000/bestbooks.html** - Books app

## Admin Setup

**Only you (Kieran) should have admin privileges.**

### To Register as Admin:
1. Go to http://localhost:3000/auth.html
2. Click "Register"
3. Use email: **`kieran@admin.com`**
4. Create your account with any password

This email is automatically marked as admin. You will see:
- 👑 Admin badge next to your name
- Ability to create social posts
- Ability to add/update books

### For Other Users:
1. They register with any other email
2. They will NOT have admin privileges
3. They can like, comment, and share posts
4. They cannot create posts or add books

## Features

### Authentication
- User registration with email and password
- Secure login with JWT tokens
- Password hashing with bcryptjs
- Token stored in browser localStorage
- Admin privileges for `kieran@admin.com`

### Social Features
- **Admin Only**: Create posts
- All users: Like/unlike posts by other users
- All users: View who liked posts
- All users: Add comments to posts
- Real-time like count updates
- All users: Share posts

### Books App
- View shared books list (all users)
- Search and filter books (all users)
- Sort by recent, title, or rating (all users)
- View reading statistics (all users)
- **Admin Only**: Add/update books

## Data Storage

All data is stored in JSON files in the `db/` directory:

```
db/
├── users.json       # User accounts (passwords hashed)
├── posts.json       # All social posts
└── likes.json       # Post likes with user info
```

These files are created automatically on first run.

## API Endpoints

### Authentication
- `POST /api/register` - Create new account
- `POST /api/login` - Login user
- `GET /api/me` - Get current user profile

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post (requires auth)

### Likes
- `POST /api/posts/:postId/like` - Like/unlike a post (requires auth)
- `GET /api/posts/:postId/likes` - Get users who liked a post

### Users
- `GET /api/users/:userId` - Get user profile

## Testing

1. **Create Test Accounts**
   - Go to http://localhost:3000/auth.html
   - Click "Register" and create 2 test accounts
   - Remember the credentials

2. **Test Social Feed**
   - Log in with first account
   - Create a post in the composer
   - Open incognito window and log in with second account
   - Like/comment on the first user's post
   - Switch back to first account to see updates

3. **Test Like Feature**
   - User A creates a post
   - User B likes it
   - See like count update in real-time
   - Click on like count to see who liked it

## Troubleshooting

### "Cannot GET /auth.html"
- Make sure you're running the server: `npm start`
- Visit `http://localhost:3000/auth.html` (with port 3000)

### "CORS error"
- Make sure the server is running on port 3000
- Check that the frontend is accessing `http://localhost:3000` (not file://)

### Cannot create posts
- Make sure you're logged in (token in localStorage)
- Check browser console for error messages

### Likes not working
- Verify token is saved in localStorage after login
- Check that authorization header is being sent

## Future Enhancements

- [ ] Persistent storage in a real database (MongoDB, PostgreSQL)
- [ ] User profiles with follow/unfollow
- [ ] Image uploads for posts
- [ ] Nested comments and replies
- [ ] Direct messaging
- [ ] Notifications
- [ ] Post editing and deletion
- [ ] Books per-user reading lists
- [ ] Email verification
- [ ] Password reset

## File Structure

```
kieran-egan.github.io/
├── server.js              # Express backend
├── package.json           # Dependencies
├── auth.html              # Login/Register page
├── social.html            # Social feed page
├── social-client.js       # Frontend social logic
├── socials.css            # Social page styles
├── bestbooks.html         # Books page
├── bestbooks.js           # Books logic
├── bestbooks.css          # Books styles
├── books.json             # Books data (for books page)
├── db/                    # Database (auto-created)
│   ├── users.json
│   ├── posts.json
│   └── likes.json
└── README.md              # This file
```

## Security Notes

⚠️ **For Production:**
- Change `SECRET_KEY` in `server.js` to a strong secret
- Use environment variables for secrets
- Set up HTTPS
- Add input validation and sanitization
- Move to a real database
- Add rate limiting
- Add CSRF protection

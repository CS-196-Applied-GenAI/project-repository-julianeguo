# Piece of Cake - Social Media Application

## Overview
"Piece of Cake" is a Twitter/X-style social media application with a warm, friendly design aesthetic. The tagline is "socializing is a piece of cake!" and features a chibi-style cake logo as its mascot.

## Design Theme
- **Colors**: Beige/warm-toned background (#f5f0e8) with dark brown borders (#3d2914)
- **Accent Colors**:
  - Likes: Pink/Red (#f91880)
  - Comments: Blue (#1da1f2)
  - Reposts: Green (#17bf63)
- **Typography**: Bubblegum Sans font for branding (falls back to Comic Sans MS)
- **Style**: Simplistic, friendly design with thin dark brown outlines on all boxes and posts

## Core Features

### Authentication & Security
- **Account Creation**: Username (3-20 chars, letters/numbers/underscores only), email (unique), password (8+ chars with uppercase, lowercase, number, symbol)
- **Login**: Session-based authentication
- **Logout**: Confirmation dialog with redirect to login
- **Forgot Password**: Email-based password reset flow
- **Inactivity Timeout**: 30-minute automatic logout for idle sessions
- **Protected Routes**: All app pages require authentication

### Navigation
- **Smart Navigation Bar**: 
  - Left: Clickable logo + "piece of cake" text (returns to feed)
  - Center: User profile picture (navigates to own profile)
  - Right: "Post Slice" button
  - Behavior: Hides on scroll down, reappears on scroll up or refresh

### Pages

#### 1. Login/Signup Page
- Single page with tabs to toggle between login and signup
- Large cake logo with tagline
- Form validation with error messages
- "Forgot password?" link

#### 2. Feed Page
- **Two Tabs**:
  - "For You": Global timeline (20 most recent slices)
  - "Following": Followed users' slices and reposts (20 items)
- **Refresh Options**:
  - Pull-to-refresh (mobile)
  - Manual refresh button at bottom of feed
- Each slice shows: author, timestamp, content, like/repost/reply counts

#### 3. Profile Page
- Profile picture (avatar with initial)
- Username, bio, follower/following counts
- **Own Profile**: Logout button
- **Other Profiles**: Follow/Unfollow and Block/Unblock buttons
- All user's slices displayed below

#### 4. Slice Detail Page
- Full slice view with larger text
- Complete replies thread below (oldest first)
- Reply button opens modal
- Like/repost/reply actions
- Users can delete their own replies (with confirmation)

#### 5. Forgot/Reset Password Pages
- Email submission for password reset
- Token-based reset form
- Success confirmation screens

#### 6. 404 Error Page
- Friendly error message with cake logo
- Options to go back or return to feed

### Core Functionality

#### Slices (Posts)
- 280 character limit with live counter (0/280)
- Counter turns red when exceeding limit
- Error message: "Please write 1-280 characters!"
- Timestamps shown in full date/time format
- Actions: Like, Reply, Repost

#### Replies (Comments)
- Same 280 character limit as slices
- Posted via modal (under slice threads)
- Shown in chronological order (oldest first)
- Can be liked
- Users can delete their own replies

#### Interactions
- **Like**: Toggle heart icon (pink when liked)
- **Repost**: Toggle repost icon (green when reposted)
- **Reply**: Opens modal to compose reply
- All counts update in real-time

#### Social Features
- **Follow/Unfollow**: Follow other users (no self-follow)
- **Block/Unblock**: Block users (automatically unfollows both ways)
- View any user's profile by clicking username or avatar

### Post Slice Modal
- Overlay modal that appears on top of current page
- Shows current user's avatar
- Live character counter (0/280)
- Validates content length before posting
- Can be used for both new slices and replies

## Mock Data
The application includes 5 mock users, each with 3 slices:
1. **baker_bella** - Professional pastry chef
2. **chef_charlie** - Home cook and coffee enthusiast
3. **foodie_finn** - Food blogger
4. **sweet_sophia** - Dessert lover and cake decorator
5. **kitchen_kai** - Culinary student

## Technical Implementation

### State Management
- React Context API for authentication
- Local state for UI interactions
- LocalStorage for session persistence

### Routing
- React Router for navigation
- Protected route wrapper for authenticated pages
- Automatic redirects based on auth state

### UI Components
- Shadcn/ui component library
- Custom cake logo SVG
- Responsive design
- Smooth animations and transitions

### User Experience
- Pull-to-refresh on mobile
- Scroll-aware navigation
- Loading states
- Confirmation dialogs for destructive actions
- Real-time character counting
- Inline validation

## File Structure
```
/src/app/
├── components/
│   ├── CakeLogo.tsx              # Chibi cake mascot
│   ├── Navigation.tsx             # Smart nav bar
│   ├── SliceCard.tsx              # Individual slice display
│   ├── PostSliceModal.tsx         # Compose modal
│   ├── ProtectedRoute.tsx         # Auth wrapper
│   └── ui/                        # Shadcn components
├── pages/
│   ├── LoginPage.tsx              # Auth page
│   ├── FeedPage.tsx               # Main feed
│   ├── ProfilePage.tsx            # User profiles
│   ├── SliceDetailPage.tsx        # Slice with replies
│   ├── ForgotPasswordPage.tsx     # Password reset request
│   ├── ResetPasswordPage.tsx      # Password reset form
│   └── NotFoundPage.tsx           # 404 error
├── context/
│   └── AuthContext.tsx            # Auth state management
├── data/
│   └── mockData.ts                # Mock users and slices
└── App.tsx                        # Root component with routing
```

## Routes
- `/` - Redirects to `/feed` (authenticated) or `/login` (guest)
- `/login` - Login/signup page
- `/feed` - Main feed (protected)
- `/profile/:username` - User profile (protected)
- `/slice/:id` - Slice detail with replies (protected)
- `/forgot-password` - Password reset request
- `/reset-password?token=...` - Password reset form
- `/404` or `/*` - Error page

## Future Backend Integration
The frontend is designed to work with the backend specified in `/src/imports/spec.md` and `/src/imports/README.md`. All API endpoints are documented and the frontend structure matches the expected data models.

To integrate with the real backend:
1. Replace mock data with API calls
2. Update AuthContext to use session cookies
3. Implement real file upload for profile pictures
4. Connect all CRUD operations to backend endpoints
5. Add WebSocket support for real-time updates (optional)

## Notes
- Terminology: "Slices" instead of "tweets/posts"
- All borders are thin (2px) dark brown
- Character limit enforced on both frontend and (future) backend
- Session timeout monitors user activity
- Pull-to-refresh works on touch devices

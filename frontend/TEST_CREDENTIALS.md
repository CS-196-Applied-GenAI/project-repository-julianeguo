# Test Credentials for Piece of Cake

## Pre-existing Users (Mock Data)
You can log in as any of these users with **any password that meets the requirements** (min 8 chars with uppercase, lowercase, number, and symbol):

### Test User 1: Baker Bella
- **Username**: `baker_bella`
- **Test Password**: `Password123!`
- **Bio**: Professional pastry chef 🍰 | Sharing my daily baking adventures
- **Slices**: 3 posts about baking

### Test User 2: Chef Charlie
- **Username**: `chef_charlie`
- **Test Password**: `Password123!`
- **Bio**: Home cook | Experimenting with recipes | Coffee enthusiast ☕
- **Slices**: 3 posts about cooking and coffee

### Test User 3: Foodie Finn
- **Username**: `foodie_finn`
- **Test Password**: `Password123!`
- **Bio**: Food blogger | Restaurant reviews | Living my best life one bite at a time 🍕
- **Slices**: 3 posts about restaurants and food

### Test User 4: Sweet Sophia
- **Username**: `sweet_sophia`
- **Test Password**: `Password123!`
- **Bio**: Dessert lover | Cake decorator | Making the world sweeter 🧁
- **Slices**: 3 posts about desserts and decorating

### Test User 5: Kitchen Kai
- **Username**: `kitchen_kai`
- **Test Password**: `Password123!`
- **Bio**: Culinary student | Learning new techniques every day | Aspiring chef 👨‍🍳
- **Slices**: 3 posts about culinary school

## Creating a New Account

You can also create a new account using the Sign Up tab:

### Username Requirements:
- 3-20 characters
- Only letters, numbers, and underscores allowed
- Case-insensitive (e.g., "John" and "john" cannot both exist)

### Password Requirements:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 symbol (!@#$%^&*(),.?":{}|<>)

### Email Requirements:
- Must be unique
- Valid email format

### Example New Account:
- **Username**: `cake_lover`
- **Email**: `cake@example.com`
- **Password**: `MyPassword123!`

## Quick Test Flow

1. **Login**: Use `baker_bella` / `Password123!`
2. **View Feed**: See all 15 slices in the "For You" tab
3. **Post a Slice**: Click "Post Slice" button, write something (1-280 chars)
4. **Like/Repost**: Try liking and reposting some slices
5. **View Profile**: Click the profile picture in the nav bar (center)
6. **Follow Someone**: Click on another user's name → Click "Follow"
7. **View Replies**: Click on a slice that has replies (e.g., the pineapple pizza debate)
8. **Reply to Slice**: Click on a slice → Click reply button → Write a reply
9. **Try Other Users**: Click on usernames to view their profiles
10. **Logout**: Go to your profile → Click "Logout" → Confirm

## Features to Test

### Navigation
- ✓ Click logo to return to feed
- ✓ Scroll down to hide nav bar
- ✓ Scroll up to show nav bar
- ✓ Click profile picture to go to your profile

### Feed
- ✓ Switch between "For You" and "Following" tabs
- ✓ Pull down at top of page to refresh (mobile)
- ✓ Click refresh button at bottom of feed

### Interactions
- ✓ Like a slice (heart turns pink)
- ✓ Unlike a slice (heart becomes empty)
- ✓ Repost a slice (icon turns green)
- ✓ Unrepost a slice (icon returns to normal)
- ✓ Reply to a slice

### Security
- ✓ Wait 30 minutes of inactivity → automatic logout
- ✓ Close browser → Session persists
- ✓ Try accessing `/feed` without login → Redirected to `/login`

### Password Reset
- ✓ Click "Forgot password?" on login page
- ✓ Enter email → See confirmation message
- ✓ (In production, would receive email with reset link)

### Error Handling
- ✓ Type invalid URL → See 404 page
- ✓ Try to post empty slice → See error message
- ✓ Try to post 281+ character slice → Counter turns red, can't post

## Notes
- Mock data persists in localStorage between sessions
- New slices and replies are stored in component state (won't persist on refresh)
- Follow/Unfollow and Block/Unblock actions are in component state
- All timestamps are shown in local timezone

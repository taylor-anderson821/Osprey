# Authentication System Implementation - TODO

## Current Status: Foundation Laid ✅

The groundwork for a full authentication system has been prepared but not yet activated. The application currently uses a hardcoded `demo_user` for all operations.

## What's Been Done

### Backend Files Created/Modified:
1. **backend/auth.py** - Complete authentication module with:
   - Password hashing (bcrypt)
   - JWT token creation/validation
   - Email verification token generation
   - Password reset token generation
   - User authentication helpers
   - Placeholder email sending functions

2. **backend/models.py** - User model updated with:
   - `hashed_password` - Securely stored password hash
   - `email_verified` - Email verification status
   - `verification_token` - Token for email verification
   - `reset_token` - Token for password reset
   - `reset_token_expires` - Expiration for reset token

3. **backend/schemas.py** - New schemas added:
   - `UserRegister` - Registration data
   - `UserLogin` - Login credentials
   - `Token` - JWT token response
   - `PasswordReset` - Password reset request
   - `PasswordResetConfirm` - Password reset confirmation

4. **backend/requirements.txt** - Dependencies added:
   - `passlib[bcrypt]` - Password hashing
   - `python-jose[cryptography]` - JWT tokens
   - `python-dotenv` - Environment variables
   - `emails` - Email sending

## What Needs to Be Done

### Phase 1: Database Migration
```bash
# Add new columns to existing users table
docker-compose exec db psql -U osprey -d osprey -c "
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS hashed_password VARCHAR,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_token VARCHAR,
  ADD COLUMN IF NOT EXISTS reset_token VARCHAR,
  ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;
"

# Update existing demo_user with a hashed password
# (You'll need to generate this in Python first)
```

### Phase 2: Backend API Endpoints
Add to `backend/main.py`:

```python
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
import auth

# Registration endpoint
@app.post("/api/auth/register", response_model=schemas.Token)
async def register(user: schemas.UserRegister, db: Session = Depends(get_db)):
    # Check if username exists
    # Check if email exists
    # Hash password
    # Create user with verification token
    # Send verification email
    # Return JWT tokens
    pass

# Login endpoint
@app.post("/api/auth/login", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Validate credentials
    # Check email verified
    # Create JWT tokens
    # Return tokens
    pass

# Email verification endpoint
@app.get("/api/auth/verify-email/{token}")
async def verify_email(token: str, db: Session = Depends(get_db)):
    # Find user by verification token
    # Mark email as verified
    # Clear verification token
    pass

# Password reset request
@app.post("/api/auth/reset-password")
async def request_password_reset(reset: schemas.PasswordReset, db: Session = Depends(get_db)):
    # Find user by email
    # Generate reset token
    # Send reset email
    pass

# Password reset confirmation
@app.post("/api/auth/reset-password-confirm")
async def confirm_password_reset(reset: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    # Validate reset token
    # Check expiration
    # Update password
    pass

# Refresh token endpoint
@app.post("/api/auth/refresh", response_model=schemas.Token)
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    # Validate refresh token
    # Create new access token
    pass
```

### Phase 3: Update Existing Endpoints
Replace all instances of `user_id: str = "demo_user"` with:
```python
current_user: models.User = Depends(auth.get_current_active_user)
```

Then use `current_user.id` instead of `user_id`.

### Phase 4: Email Service Setup
Choose and configure an email service:

**Option A: SendGrid (Recommended)**
```bash
pip install sendgrid
```
```python
# In auth.py
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_verification_email(email: str, token: str, base_url: str):
    message = Mail(
        from_email='noreply@yourdomain.com',
        to_emails=email,
        subject='Verify your email',
        html_content=f'<a href="{base_url}/verify-email?token={token}">Verify Email</a>'
    )
    sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
    sg.send(message)
```

**Option B: AWS SES**
**Option C: SMTP Server**

### Phase 5: Frontend Implementation

#### 5.1 Create Authentication Pages
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Register.jsx`
- `frontend/src/pages/VerifyEmail.jsx`
- `frontend/src/pages/ResetPassword.jsx`

#### 5.2 Token Management
Create `frontend/src/utils/auth.js`:
```javascript
export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

export const getAccessToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');
export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const isAuthenticated = () => !!getAccessToken();
```

#### 5.3 API Client with Auth
Update API calls to include JWT token:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = {
  async fetch(endpoint, options = {}) {
    const token = getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (response.status === 401) {
      // Token expired, try refresh
      await refreshAccessToken();
      // Retry request
    }
    
    return response;
  }
};
```

#### 5.4 Protected Routes
```javascript
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from './utils/auth';

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  return children;
}
```

### Phase 6: Environment Variables
Create `.env` file in backend:
```
SECRET_KEY=your-super-secret-key-change-this
DATABASE_URL=postgresql://osprey:osprey_dev_password@db:5432/osprey
SENDGRID_API_KEY=your-sendgrid-api-key
BASE_URL=http://localhost:3000
```

### Phase 7: Security Considerations
- [ ] Use HTTPS in production
- [ ] Set secure cookie flags
- [ ] Implement rate limiting on auth endpoints
- [ ] Add CAPTCHA to registration
- [ ] Implement account lockout after failed attempts
- [ ] Add 2FA (optional)
- [ ] Secure password requirements (min length, complexity)

## Testing Checklist
- [ ] User can register with username/email/password
- [ ] Verification email is sent
- [ ] User can verify email via link
- [ ] User can login with credentials
- [ ] JWT token is stored and used for API calls
- [ ] Token refresh works when access token expires
- [ ] User can request password reset
- [ ] Password reset email is sent
- [ ] User can reset password via link
- [ ] Protected routes redirect to login
- [ ] Logout clears tokens
- [ ] Email verification is required before full access

## Current Workaround
The application currently uses `user_id = "demo_user"` throughout. This works for development and single-user scenarios. When you're ready to implement authentication:

1. Start with Phase 1 (database migration)
2. Implement Phase 2 (backend endpoints)
3. Test with Postman/curl
4. Then move to frontend implementation

## Files to Review When Resuming
- `backend/auth.py` - Authentication logic
- `backend/models.py` - User model with auth fields
- `backend/schemas.py` - Auth-related schemas
- `backend/main.py` - Will need auth endpoints added
- All frontend components - Will need to use auth tokens

## Estimated Implementation Time
- Backend: 4-6 hours
- Frontend: 6-8 hours
- Email service setup: 2-3 hours
- Testing & debugging: 4-6 hours
- **Total: 16-23 hours**

## Questions to Answer Before Implementation
1. Which email service will you use?
2. What are the password requirements?
3. Do you want social login (Google, GitHub)?
4. Should email verification be required or optional?
5. What's the token expiration policy?
6. Do you need "Remember Me" functionality?

---

**Note**: The current system works perfectly for development and demo purposes. Implement authentication when you're ready to deploy to production or support multiple users.

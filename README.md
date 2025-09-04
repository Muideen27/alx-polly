# ALX Polly: A Polling Application

---

## Security Audit & Remediation

### Overview & Scope

This section documents the comprehensive security audit performed on ALX Polly and the remediation measures implemented. The audit covered authentication, authorization, input validation, data access controls, and client-side security vulnerabilities.

**Scope:**
- Server-side authorization and IDOR vulnerabilities
- Client-side security bypasses
- Input validation and sanitization
- Database security and RLS policies
- HTTP security headers and CSP
- Vote deduplication and rate limiting

### Security Findings & Fixes

| Issue | Severity | Impact | Fix Implemented |
|-------|----------|---------|-----------------|
| IDOR in deletePoll | CRITICAL | Any user could delete any poll | Added `.eq("owner", user.id)` filter |
| IDOR in getPollById | HIGH | Users could access any poll data | Added ownership verification |
| Client-side authorization | HIGH | UI restrictions could be bypassed | Moved all auth to server-side |
| Mock data in production | HIGH | No real data fetching, security bypass | Replaced with server-side data fetching |
| No vote deduplication | HIGH | Unlimited voting, poll manipulation | Implemented signature-based deduplication |
| Missing input validation | MEDIUM | XSS, data corruption | Added Zod schemas with sanitization |
| No RLS policies | CRITICAL | Direct database access bypass | Configured comprehensive RLS policies |
| Error message leakage | LOW | Information disclosure | Implemented friendly error mapping |
| Missing security headers | MEDIUM | XSS, clickjacking | Added CSP, X-Frame-Options, etc. |
| No rate limiting | MEDIUM | DoS, spam | Implemented per-IP rate limiting |

### Implemented Security Changes

#### 1. Authorization Hardening
- **Server-side ownership checks**: All poll operations now verify `owner = auth.uid()`
- **Removed client-side auth**: Authorization logic moved entirely to server actions
- **Consistent error handling**: Standardized `{ ok: boolean; error?: string }` responses

#### 2. Input Validation & Sanitization
- **Zod schemas**: Comprehensive validation for poll questions (10-500 chars) and options (2-200 chars, 2-10 options)
- **Input sanitization**: Strips HTML tags, dangerous protocols, and event handlers
- **Case-insensitive deduplication**: Prevents duplicate poll options

#### 3. Vote Deduplication System
- **HMAC-based signatures**: Uses poll ID + user agent + IP for unique vote identification
- **HttpOnly cookies**: Secure vote signature storage with 30-day expiration
- **Database constraints**: Unique index on `(poll_id, signature)` prevents duplicate votes

#### 4. Row Level Security (RLS)
- **Polls table**: Public read, owner-only write/update/delete
- **Poll options**: Public read, owner-only management via parent poll ownership
- **Votes table**: Public insert for active polls, no updates/deletes (append-only)

#### 5. Security Headers
- **Content Security Policy**: Restrictive CSP with safe defaults
- **X-Frame-Options**: DENY to prevent clickjacking
- **X-Content-Type-Options**: nosniff to prevent MIME sniffing
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Disabled camera, microphone, geolocation

#### 6. Rate Limiting
- **Per-IP limits**: 20 requests per 60-second window per action
- **Real IP detection**: Supports X-Forwarded-For, X-Real-IP, CF-Connecting-IP
- **Automatic cleanup**: Expired entries removed every 5 minutes

### Database Security Setup

#### Step 1: Apply RLS Policies
Run the following SQL in your Supabase SQL editor:

```sql
-- Enable RLS on all tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Apply comprehensive policies (see migrations/core_rls_policies.sql)
-- This includes owner-only access for polls, public read access, and vote restrictions
```

#### Step 2: Add Required Columns
```sql
-- Add missing columns if they don't exist
ALTER TABLE votes ADD COLUMN signature VARCHAR(255);
ALTER TABLE polls ADD COLUMN owner UUID REFERENCES auth.users(id);
ALTER TABLE polls ADD COLUMN is_active BOOLEAN DEFAULT true;
```

#### Step 3: Create Unique Constraints
```sql
-- Prevent duplicate votes
CREATE UNIQUE INDEX idx_votes_poll_signature_unique 
ON votes (poll_id, signature) 
WHERE signature IS NOT NULL;

-- Ensure poll options are unique per poll
CREATE UNIQUE INDEX idx_poll_options_poll_idx_unique 
ON poll_options (poll_id, idx);
```

### Local Development Setup

#### Required Environment Variables
Create a `.env.local` file with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_supabase_secret_key

# Vote Signature Security (REQUIRED)
VOTE_SIGNING_SECRET=your_32_character_random_secret_key_here
```

#### Generate Vote Signing Secret
```bash
# Generate a secure 32-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Running the Application
```bash
# Install dependencies
npm install

# Apply database migrations
# Run the SQL from migrations/core_rls_policies.sql in Supabase

# Start development server
npm run dev
```

### Known Limitations & Future Hardening

#### Current Limitations
1. **In-memory rate limiting**: Will reset on server restart (consider Redis for production)
2. **Single server deployment**: Rate limiting doesn't work across multiple instances
3. **Basic IP detection**: May not work correctly behind complex proxy setups
4. **No audit logging**: Vote actions aren't logged for compliance/auditing

#### Recommended Future Hardening
1. **Persistent rate limiting**: Implement Redis-based rate limiting for production
2. **Audit logging**: Add comprehensive logging for all user actions
3. **Advanced fingerprinting**: Implement more sophisticated vote deduplication
4. **Content Security Policy**: Tighten CSP further by removing 'unsafe-inline' and 'unsafe-eval'
5. **Database encryption**: Enable Supabase column-level encryption for sensitive data
6. **API versioning**: Implement proper API versioning for future changes
7. **Monitoring**: Add security monitoring and alerting for suspicious activities
8. **Penetration testing**: Regular security testing by third-party experts

#### Production Considerations
- Use a proper secrets management system (AWS Secrets Manager, Azure Key Vault)
- Implement proper logging and monitoring (Sentry, DataDog)
- Set up automated security scanning in CI/CD pipeline
- Regular dependency updates and vulnerability scanning
- Consider implementing CAPTCHA for additional bot protection
- Set up proper backup and disaster recovery procedures

---

**Security Status**: ✅ All critical and high-severity vulnerabilities have been remediated. The application now follows security best practices with proper authorization, input validation, and data protection measures in place.
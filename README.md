# ALX Polly: A Secure Polling Application

A modern, secure polling application built with Next.js App Router, TypeScript, and Supabase. Create polls, share them via QR codes, and collect votes with built-in security features and duplicate vote prevention.

## 🚀 Project Overview & Tech Stack

**ALX Polly** is a full-stack polling application that allows users to create, share, and manage polls with enterprise-grade security features.

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Validation**: Zod schemas
- **Security**: Row Level Security (RLS), HMAC signatures, rate limiting

### Architecture
- **Server Components**: Data fetching and rendering
- **Server Actions**: Secure form handling and mutations
- **Client Components**: Interactive UI elements
- **Middleware**: Authentication and route protection

## ✨ Features

### 🔐 Authentication & Authorization
- User registration and login with Supabase Auth
- Secure session management with httpOnly cookies
- Server-side ownership verification for all operations
- Automatic redirects for unauthenticated users

### 📊 Poll Management
- **Create Polls**: Question + 2-10 options with validation
- **Edit Polls**: Update questions and options (owner only)
- **Delete Polls**: Remove polls with confirmation (owner only)
- **View Results**: Real-time vote counts and percentages
- **Dashboard**: Manage all your polls in one place

### 🗳️ Public Voting
- **Anonymous Voting**: No registration required to vote
- **Duplicate Prevention**: HMAC-based signature system prevents multiple votes
- **Real-time Results**: Live vote counts and percentage calculations
- **Mobile Responsive**: Works perfectly on all devices

### 🔗 Sharing & Distribution
- **Share Links**: Direct URLs to poll pages
- **QR Code Generation**: Easy mobile sharing
- **Social Media**: Twitter sharing integration
- **Copy to Clipboard**: One-click link copying

### 🛡️ Security Features
- **Input Validation**: Zod schemas with sanitization
- **XSS Protection**: HTML tag stripping and content sanitization
- **Rate Limiting**: 20 requests per minute per IP
- **Row Level Security**: Database-level access control
- **Security Headers**: CSP, X-Frame-Options, and more
- **Vote Deduplication**: Prevents multiple votes from same device

## 🛠️ Setup

### Prerequisites
- **Node.js**: Version 18.17 or later
- **Package Manager**: npm or pnpm
- **Supabase Account**: Free tier available

### 1. Supabase Configuration

#### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

#### Enable Row Level Security
Run this SQL in your Supabase SQL editor:

```sql
-- Enable RLS on all tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create poll_options table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  idx INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  option_index INTEGER NOT NULL,
  signature VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add required columns
ALTER TABLE votes ADD COLUMN IF NOT EXISTS signature VARCHAR(255);
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_poll_signature_unique 
ON votes (poll_id, signature) 
WHERE signature IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_options_poll_idx_unique 
ON poll_options (poll_id, idx);

-- RLS Policies
-- Polls: Public read, owner-only write
CREATE POLICY "Polls are publicly readable" ON polls FOR SELECT USING (true);
CREATE POLICY "Users can insert their own polls" ON polls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own polls" ON polls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own polls" ON polls FOR DELETE USING (auth.uid() = user_id);

-- Poll options: Public read, owner-only management
CREATE POLICY "Poll options are publicly readable" ON poll_options FOR SELECT USING (true);
CREATE POLICY "Users can manage options for their polls" ON poll_options 
FOR ALL USING (
  EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid())
);

-- Votes: Public insert, no updates/deletes
CREATE POLICY "Anyone can vote on active polls" ON votes 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM polls WHERE polls.id = votes.poll_id AND polls.is_active = true)
);
CREATE POLICY "Votes cannot be updated" ON votes FOR UPDATE USING (false);
CREATE POLICY "Votes cannot be deleted" ON votes FOR DELETE USING (false);
```

### 2. Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Vote Signature Security (Required for vote deduplication)
VOTE_SIGNING_SECRET=your_32_character_random_secret_key_here

# Optional: Supabase Service Role Key (for admin operations)
SUPABASE_SECRET_KEY=your_supabase_service_role_key
```

#### Generate Vote Signing Secret
```bash
# Generate a secure 32-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🚀 Run Locally

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/alx-polly.git
cd alx-polly

# Install dependencies
npm install
# or
pnpm install
```

### Development
```bash
# Start the development server
npm run dev
# or
pnpm dev

# Open http://localhost:3000 in your browser
```

### Production Build
```bash
# Build the application
npm run build
# or
pnpm build

# Start production server
npm start
# or
pnpm start
```

## 📖 Usage

### Creating a Poll
1. **Register/Login**: Create an account or sign in
2. **Navigate to Create**: Click "Create New Poll" from the dashboard
3. **Fill Details**:
   - **Question**: 10-500 characters, required
   - **Options**: 2-10 options, each 2-200 characters
   - **Validation**: Real-time validation with helpful error messages
4. **Submit**: Click "Create Poll" to save

### Sharing a Poll
1. **From Dashboard**: Click on any poll to view details
2. **Share Options**:
   - **Copy Link**: Click "Copy Link" button
   - **QR Code**: Scan the generated QR code
   - **Social Media**: Share on Twitter with pre-filled text
3. **Public Access**: Anyone with the link can vote (no registration required)

### Voting Flow
1. **Access Poll**: Visit the public poll URL
2. **Select Option**: Choose your preferred option
3. **Submit Vote**: Click "Vote" to submit
4. **View Results**: See real-time vote counts and percentages
5. **Duplicate Prevention**: Cannot vote again from the same device

### Managing Polls
1. **Dashboard**: View all your polls with creation dates
2. **Edit Poll**: Click "Edit" to modify questions/options
3. **Delete Poll**: Click "Delete" with confirmation dialog
4. **View Results**: See detailed vote breakdowns

## 🧪 Testing

### Available Scripts
```bash
# Type checking
npm run tsc

# Linting
npm run lint

# Build verification
npm run build

# Development server
npm run dev
```

### Test Coverage
- **TypeScript**: Full type safety with strict mode
- **ESLint**: Zero warnings or errors
- **Build**: Production-ready builds
- **Security**: Comprehensive input validation and sanitization

## 🔒 Security Notes

### Server-Side Security
- **Server Actions**: All mutations handled server-side
- **Ownership Checks**: Every operation verifies user ownership
- **Input Validation**: Zod schemas with sanitization
- **Rate Limiting**: 20 requests per minute per IP address

### Vote Security
- **Duplicate Prevention**: HMAC-based signatures prevent multiple votes
- **HttpOnly Cookies**: Secure vote signature storage
- **Database Constraints**: Unique indexes enforce vote deduplication
- **No Client Storage**: All vote data stored server-side

### Database Security
- **Row Level Security**: Database-level access control
- **Public Read**: Polls are publicly readable
- **Owner-Only Write**: Only poll creators can modify their polls
- **Append-Only Votes**: Votes cannot be updated or deleted

### HTTP Security
- **Content Security Policy**: Restrictive CSP headers
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Referrer-Policy**: Controls referrer information

## 🔧 Troubleshooting

### Common Issues

#### Supabase Connection Errors
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Verify Supabase project is active
# Check Supabase dashboard for project status
```

#### Database Permission Errors
```sql
-- Verify RLS policies are enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('polls', 'poll_options', 'votes');

-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'polls';
```

#### Vote Signature Errors
```bash
# Verify VOTE_SIGNING_SECRET is set
echo $VOTE_SIGNING_SECRET

# Check secret length (should be 32+ characters)
node -e "console.log(process.env.VOTE_SIGNING_SECRET?.length)"
```

#### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run tsc
```

### Environment Setup Issues
1. **Missing .env.local**: Create file with required variables
2. **Wrong Supabase URL**: Use project URL from Supabase dashboard
3. **Invalid Anon Key**: Copy from Settings > API in Supabase
4. **Missing Vote Secret**: Generate using the provided command

### Database Issues
1. **Tables Not Created**: Run the SQL setup script
2. **RLS Not Enabled**: Execute ALTER TABLE statements
3. **Policies Missing**: Create policies from the setup section
4. **Indexes Not Created**: Run CREATE INDEX statements

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Security Status**: ✅ All critical and high-severity vulnerabilities have been remediated. The application follows security best practices with proper authorization, input validation, and data protection measures.
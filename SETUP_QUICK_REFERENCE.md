# ⚡ Supabase Setup Quick Reference

## 🎯 Essential Steps (5 minutes)

### 1. Create Supabase Project
```
supabase.com → New Project → brainbased-emdr-platform
```

### 2. Get Credentials
```
Settings → API → Copy:
- Project URL
- anon key  
- service_role key
```

### 3. Run Database Schema
```
SQL Editor → Paste supabase/schema.sql → Run
```

### 4. Create Environment Files
```bash
cp env.example .env
cp client/env.example client/.env
```

### 5. Update Environment Variables
```env
# .env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-generated-secret

# client/.env  
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 6. Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 7. Test Setup
```bash
npm install
npm run dev
curl http://localhost:5000/api/health
```

## 🔑 Required Credentials

| Variable | Location | Example |
|----------|----------|---------|
| `SUPABASE_URL` | Settings → API | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Settings → API | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `JWT_SECRET` | Generated | `a1b2c3d4e5f6...` |

## 📁 Required Files

- ✅ `supabase/schema.sql` - Database schema
- ✅ `env.example` - Server environment template
- ✅ `client/env.example` - Client environment template
- ✅ `SUPABASE_SETUP_GUIDE.md` - Detailed guide

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module '@supabase/supabase-js'" | Run `npm install` |
| "Invalid API key" | Check credentials in .env files |
| "Table doesn't exist" | Run schema.sql in Supabase SQL Editor |
| "JWT secret not found" | Generate and add JWT_SECRET to .env |

## ✅ Success Indicators

- [ ] `curl http://localhost:5000/api/health` returns `{"status":"ok"}`
- [ ] Supabase dashboard shows all tables created
- [ ] No TypeScript errors in terminal
- [ ] Frontend loads without console errors

## 🆘 Need Help?

1. Check `SUPABASE_SETUP_GUIDE.md` for detailed steps
2. Verify all environment variables are set correctly
3. Ensure schema.sql was executed successfully
4. Check Supabase dashboard for error logs 
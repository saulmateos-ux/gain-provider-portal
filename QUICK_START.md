# 🚀 Quick Start - Run Locally in 5 Minutes

Get the GAIN Provider Portal running on your local machine with sample data.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL client (`psql`) installed
  - macOS: `brew install postgresql`
  - Ubuntu: `sudo apt-get install postgresql-client`
  - Windows: Download from postgresql.org

## Step 1: Get a Free Neon Database (30 seconds)

1. Go to **https://neon.tech**
2. Sign up (free tier, no credit card)
3. Create a new project
4. Copy the connection string (looks like `postgresql://user:pass@ep-...neon.tech/neondb`)

## Step 2: Get Free Clerk Auth Keys (1 minute)

1. Go to **https://dashboard.clerk.com**
2. Sign up (free tier)
3. Create a new application
4. Go to **API Keys** in sidebar
5. Copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_`)

## Step 3: Configure Environment (30 seconds)

Open `.env.local` and update with your actual keys:

```env
DATABASE_URL=postgresql://your-neon-connection-string-here

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE

# These can stay as-is
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Set Up Database (1 minute)

```bash
# Export your database URL
export DATABASE_URL="postgresql://your-connection-string"

# Run setup script (creates all tables, indexes, views)
./scripts/setup-database.sh
```

## Step 5: Seed Sample Data (30 seconds)

```bash
# Create 500 sample invoices across 167 cases
node scripts/seed-sample-data.js
```

You'll see:
```
✅ Sample data seeded successfully!

📊 Summary:
  Total Invoices: 500
  Total Cases: 167
  Total Invoiced: $1,234,567
  Total Collected: $789,012
  Total Open: $445,555
```

## Step 6: Start Development Server (10 seconds)

```bash
npm run dev
```

## Step 7: Open in Browser

Go to **http://localhost:3000**

You'll be redirected to sign-in.

## Step 8: Create Your Account

Since Clerk is in restricted mode:

1. Go to **https://dashboard.clerk.com**
2. Click your application
3. Go to **Users** in sidebar
4. Click **Invite User**
5. Enter your email
6. Click the invitation link in your email
7. Create your account

Now you can sign in at **http://localhost:3000**!

---

## 🎉 You're Done!

You should see:
- **5 KPI cards** with sample data
- **Aging analysis chart** showing receivables by age
- **Summary statistics** at the bottom

---

## 🔧 Troubleshooting

### "psql: command not found"
Install PostgreSQL client:
- macOS: `brew install postgresql`
- Ubuntu: `sudo apt-get install postgresql-client`

### "connection refused" or database errors
- Check your `DATABASE_URL` is correct
- Make sure you exported it: `export DATABASE_URL="..."`
- Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

### Build errors
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Clerk authentication errors
- Verify keys in `.env.local` match Clerk dashboard
- Make sure you used the **test** keys (pk_test_ and sk_test_)
- Restart dev server after changing .env.local

---

## 📊 Sample Data Details

The seed script creates:
- **500 invoices** across **~167 cases**
- **5 law firms** with varying performance
- **8 different case statuses**
- **Realistic financial data** (invoices $500-$5,500)
- **Collection rates** between 20-80%
- **Date ranges** spanning last 2 years

---

## 🚀 Next Steps

1. **Explore the dashboard** - Check out KPIs and aging analysis
2. **Import real data** - Use `scripts/upload-data.js` with your CSV
3. **Add more pages** - Follow EXECUTION_PLAN.md for Phase 2
4. **Deploy to production** - Push to GitHub, deploy on Vercel

---

## 📚 Documentation

- **CLAUDE.md** - Critical rules and architecture
- **EXECUTION_PLAN.md** - Full 4-phase roadmap
- **README.md** - Complete documentation
- **TECHNICAL_SPECIFICATIONS.md** - Detailed tech specs

---

**Need help?** Check CLAUDE.md for architecture rules and troubleshooting!

# 🚨 CRITICAL SECURITY FIX INSTRUCTIONS

## What Happened
Two Apple Sign In private keys were accidentally committed to git history in:
- `generate-apple-jwt.js`
- `generate-apple-jwt.cjs`

These files have been **deleted** and added to `.gitignore`, but they still exist in git history.

---

## ⚠️ IMMEDIATE ACTIONS REQUIRED

### 1. Revoke the Exposed Keys in Apple Developer Console

**YOU MUST DO THIS NOW** to prevent unauthorized use:

1. Go to [Apple Developer Console](https://developer.apple.com/account/resources/authkeys/list)
2. Find and **revoke** the following keys:
   - Key ID: `5M59T4NP79`
   - Key ID: `YGYBT3QLDA`
3. Click "Revoke" on each key
4. Confirm the revocation

### 2. Generate New Apple Sign In Keys

1. In Apple Developer Console, click "+" to create a new key
2. Name it "Apple Sign In Key" (or similar)
3. Check "Sign In with Apple"
4. Click "Continue" → "Register"
5. **Download the `.p8` file immediately** (you can only download it once!)
6. Save it securely (NOT in this repository)

### 3. Generate a New JWT Token

```bash
# Copy the template
cp generate-apple-jwt.template.js generate-apple-jwt.js

# Edit the file and fill in your new credentials:
# - TEAM_ID (your Apple Team ID)
# - KEY_ID (from the new key you created)
# - CLIENT_ID (your Services ID)
# - PRIVATE_KEY (content from the new .p8 file)

# Run it to generate the JWT
node generate-apple-jwt.js

# Copy the output token
```

### 4. Update Supabase Configuration

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **Authentication** → **Providers** → **Apple**
3. Paste the NEW JWT token into the "Secret Key" field
4. Click "Save"

---

## 🛡️ Purge Secrets from Git History

The files are deleted but still exist in git history. You have two options:

### Option A: Force Push (Destructive - Recommended for this case)

```bash
# Create a backup branch first
git branch backup-before-purge

# Remove files from all history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch generate-apple-jwt.js generate-apple-jwt.cjs" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to remote (⚠️ THIS REWRITES HISTORY)
git push origin --force --all
git push origin --force --tags
```

### Option B: Use BFG Repo-Cleaner (Faster, safer)

```bash
# Install BFG
brew install bfg  # macOS
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Clone a fresh copy
cd ..
git clone --mirror https://github.com/YOUR-USERNAME/dashboard.git dashboard-mirror
cd dashboard-mirror

# Remove the files from history
bfg --delete-files generate-apple-jwt.js
bfg --delete-files generate-apple-jwt.cjs

# Clean up and push
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push
```

---

## ✅ Prevention Measures Applied

1. ✅ Files deleted from repository
2. ✅ `.gitignore` updated with comprehensive rules:
   - `generate-apple-jwt.js` and `.cjs` variants
   - `*.p8` files (Apple private keys)
   - Any `*secret*` or `*private*` named files
3. ✅ Template file created: `generate-apple-jwt.template.js`
4. ✅ This security guide created

---

## 🔐 Best Practices Going Forward

1. **Never commit credentials** - Use environment variables or secret managers
2. **Use templates** - Always commit `.template` files instead of real configs
3. **Review before committing** - Check `git diff` before every commit
4. **Enable secret scanning** - GitHub/GitLab can auto-detect secrets
5. **Rotate keys regularly** - Even if not exposed (Apple recommends every 6 months)

---

## 📝 Notes

- The template file (`generate-apple-jwt.template.js`) is safe to commit
- Always copy the template before filling in real values
- Never run `git add .` blindly - review what you're adding
- Consider using a secret manager like 1Password, AWS Secrets Manager, or Doppler

---

## Need Help?

If you're unsure about any step, especially the git history purging, reach out to your team lead or security officer before proceeding.


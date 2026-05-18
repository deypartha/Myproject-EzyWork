# Troubleshooting: Problem Verification Failed

## Issue: "AI verification temporarily unavailable"

This error occurs when the Gemini API call fails. Here are the solutions:

## ✅ Quick Fix

### 1. **Verify Your Environment Setup**

Check that your `.env` file has:

```env
GEMINI_API_KEY=AIzaSyA3YmHCzEoKQAmG1oLpaOrhABUnLw0xNhQ
```

**Location:** `backend/.env`

### 2. **Restart Your Backend Server**

The changes to the verification logic need a server restart:

```bash
# Terminal 1: Stop existing server
Ctrl + C

# Terminal 2: Restart server
npm start
# or
node server.js
```

### 3. **Clear Browser Cache & Restart**

```bash
# Clear frontend cache
Ctrl + Shift + Delete  (or Cmd + Shift + Delete on Mac)
# Then hard refresh the page: Ctrl + F5 (or Cmd + Shift + R)
```

---

## 🔍 What Changed

### Before

- Only detected skill type (Plumber, Electrician)
- Simple keyword matching
- No problem verification

### After

- **Gemini AI** analyzes problem details
- Extracts: problem type, severity, urgency, estimated cost
- **Fallback system** if Gemini API fails (uses keywords)
- **Better error messages** and logging

### Smart Fallback System

If Gemini API is unavailable:

1. System automatically tries **keyword-based detection**
2. Still finds matching workers
3. Shows you it's using fallback method
4. Problem is still created successfully ✓

---

## 🐛 Debugging Steps

### Step 1: Check Backend Logs

When you restart the server, look for these messages:

**Good:**

```
Attempting to verify problem: My tap is leak...
Successfully parsed verification: { isValidProblem: true, problemType: ...}
Found 5 matching workers for Plumber
```

**Fallback:**

```
Attempting to verify problem: My tap is leak...
Gemini verification failed, using keyword fallback
Problem detected using keyword matching
```

**Error:**

```
Gemini API error: 401 Unauthorized
Error verifying problem with Gemini: ...
```

### Step 2: Check Browser Console (F12)

Look for:

- Verification request details
- Response status codes
- Worker suggestions
- Any network errors

### Step 3: Test API Directly

```bash
# PowerShell
$body = @{
    description = "My kitchen tap is leaking"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5002/api/problems/verify" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

---

## 🔐 Common Issues & Fixes

### Issue 1: API Key Invalid

**Error:** `401 Unauthorized` from Gemini API

**Fix:**

1. Go to https://aistudio.google.com/apikey
2. Verify your API key is correct
3. Check there are no extra spaces
4. Update `.env` file
5. Restart server

### Issue 2: API Key Not Set

**Error:** `GEMINI_API_KEY not set, skipping AI verification`

**Fix:**

1. Ensure `.env` file exists in `backend/` folder
2. Add `GEMINI_API_KEY=your_key_here`
3. Save file
4. Restart server

### Issue 3: JSON Parsing Error

**Error:** `Unexpected token } in JSON`

**Fix:** The system now handles this automatically! If you see this in old logs, it's been fixed. Restart server.

### Issue 4: Network Timeout

**Error:** Timeout waiting for Gemini API response

**Fix:**

1. Check internet connection
2. Try with simpler problem description
3. Check Gemini API status at https://status.cloud.google.com
4. If still fails, system uses fallback detection

---

## ✨ How to Test

### Test 1: Valid Problem (Should Work)

```
Input: "My kitchen tap is leaking badly and I see water stains on the counter"
Expected: Verified as Water Leak → Plumber recommended
```

### Test 2: Simple Problem (Uses Fallback)

```
Input: "fix my leak"
Expected: Detected as Water Leak → Plumber (using keyword detection)
```

### Test 3: Complex Problem

```
Input: "I need to install new electrical outlets and also fix my plumbing"
Expected: Multiple workers suggested (Electrician + Plumber)
```

### Test 4: Invalid Problem (Should Reject)

```
Input: "help me"
Expected: Rejected as too vague
```

---

## 📊 Verification Details Returned

When successful, you'll see:

```json
{
  "isValid": true,
  "message": "Problem verified successfully",
  "verification": {
    "problemType": "Water Leak",
    "severity": "High",
    "urgency": "Urgent",
    "estimatedCost": "$50-$150",
    "skillsRequired": ["Plumbing"],
    "keyIssues": ["Leaking tap", "Water damage risk"],
    "recommendedWorkerTypes": ["Plumber"],
    "confidence": 0.95
  },
  "suggestedWorkers": [
    {
      "name": "John Plumber",
      "yearsOfExperience": 10,
      "matchScore": 95
    }
  ],
  "usingFallback": false
}
```

---

## 🔧 Server Restart Commands

### Option 1: Using npm

```bash
cd backend
npm start
```

### Option 2: Direct Node

```bash
cd backend
node server.js
```

### Option 3: Kill & Restart

```bash
# PowerShell - Kill any existing node processes
Get-Process node | Stop-Process

# Then restart
npm start
```

---

## 📞 Still Not Working?

1. **Check all errors in browser console** (F12 → Console tab)
2. **Check server logs** (PowerShell terminal where server runs)
3. **Verify API key is in .env file**
4. **Make sure server is restarted AFTER changes**
5. **Try a different problem description** (more detailed)

If still stuck:

- The system will fall back to keyword detection automatically
- You can still book workers (it will still work!)
- Come back to fix Gemini API key when you have time

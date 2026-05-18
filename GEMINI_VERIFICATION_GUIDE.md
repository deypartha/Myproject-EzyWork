# Gemini API Problem Verification Guide

## Overview

The system now uses **Gemini AI to verify and analyze home service problems** before selecting appropriate workers. This ensures that:

- Only legitimate home service problems are accepted
- Problem details are extracted and structured
- Workers are intelligently matched based on verified problem requirements
- User gets detailed problem analysis before booking

## How It Works

### 1. **Problem Verification Flow**

When a user submits a problem:

```
User submits problem description
        ↓
Gemini AI verifies and analyzes problem
        ↓
AI extracts problem details (type, severity, skills needed, etc.)
        ↓
System finds & scores matching workers
        ↓
Top 10 best-matched workers are suggested to user
```

### 2. **Verification Details Extracted by Gemini**

The AI analyzes each problem and returns:

```json
{
  "problemType": "Water Leak", // Specific problem type
  "severity": "High", // High/Medium/Low
  "urgency": "Urgent", // Urgent/Normal/Can Wait
  "estimatedCost": "$50-$150", // Price estimate
  "skillsRequired": ["Plumbing"], // Required skills
  "keyIssues": ["Leaking tap", "Water damage risk"], // Main issues
  "recommendedWorkerTypes": ["Plumber"], // Worker types needed
  "confidence": 0.95 // AI confidence score
}
```

### 3. **Worker Matching Algorithm**

After verification, the system:

1. Finds workers with recommended types
2. **Scores each worker** based on:
   - Matching skills (25 points each skill)
   - Recommended worker type match (30 points)
   - Years of experience (5 points per year)
   - Worker rating (5 points per star)
3. **Returns top 10** best-matched workers sorted by score

### 4. **Problem Rejection**

If the problem is **not valid**, the user gets:

- Clear rejection reason
- Cannot proceed to worker selection
- Examples of rejected problems:
  - Generic/non-specific descriptions
  - Not related to home services
  - Suspicious or spam requests

## Backend Changes

### New Endpoint: `/api/problems/verify`

**POST** `http://localhost:5000/api/problems/verify`

**Request:**

```json
{
  "description": "My kitchen tap is leaking badly and there's water damage on the counter",
  "title": "Leaking kitchen tap" (optional)
}
```

**Success Response (200):**

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
    "keyIssues": ["Leaking tap", "Water damage"],
    "recommendedWorkerTypes": ["Plumber"],
    "confidence": 0.98
  },
  "suggestedWorkers": [
    {
      "_id": "worker_id_1",
      "fullName": "John Plumber",
      "typeOfWork": ["Plumber"],
      "yearsOfExperience": 10,
      "rating": 4.8,
      "mobileNumber": "1234567890",
      "matchScore": 95
    }
    // ... more workers
  ]
}
```

**Error Response (400):**

```json
{
  "isValid": false,
  "message": "Invalid problem description",
  "reason": "Problem does not appear to be a valid home service request",
  "verification": {
    "isValidProblem": false,
    "reason": "Too vague or not a home service request"
  }
}
```

### Updated Database Schema

**Problem Model** now includes:

```javascript
{
  // ... existing fields ...

  // New verification fields
  isVerified: Boolean,                    // Was problem verified?
  verificationDetails: {
    problemType: String,
    severity: String,
    urgency: String,
    estimatedCost: String,
    skillsRequired: [String],
    keyIssues: [String],
    recommendedWorkerTypes: [String],
    workerScores: [{
      workerId: ObjectId,
      score: Number,
      reason: String
    }]
  }
}
```

### Updated `createProblem` Function

Now accepts `verificationDetails`:

**Request:**

```json
{
  "title": "Kitchen tap leak...",
  "description": "My kitchen tap is leaking...",
  "category": "Plumber",
  "createdBy": "user_id",
  "location": { "city": "Unknown" },
  "verificationDetails": {
    /* from verification endpoint */
  }
}
```

## Frontend Changes

### Updated Problem Submission Flow

**Old Flow:**

1. User submits problem
2. Detect skill (Gemini or keywords)
3. Fetch all workers of that skill
4. Show workers to user

**New Flow:**

1. User submits problem
2. **Verify problem with Gemini** ← NEW
3. **Get suggested workers from AI analysis** ← NEW
4. **Score workers based on verification details** ← NEW
5. Show best-matched workers to user

### Code Implementation in `User.jsx`

```javascript
const handleProblemSubmit = () => {
  // Step 1: Verify problem
  const verifyRes = await fetch(`${API_BASE_URL}/api/problems/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: problem,
      title: problem.substring(0, 50),
    }),
  });

  // Step 2: Handle verification result
  const verificationData = await verifyRes.json();
  const { verification, suggestedWorkers } = verificationData;

  // Step 3: Create problem with verification details
  const createRes = await fetch(`${API_BASE_URL}/api/problems/create`, {
    method: "POST",
    body: JSON.stringify({
      // ... other fields ...
      verificationDetails: verification,  // Store verification
    }),
  });

  // Step 4: Display suggested workers
  setWorkerSuggestions(suggestedWorkers);
};
```

## Environment Setup

Make sure your `.env` file has:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**To get a Gemini API Key:**

1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy the key to your `.env` file

## Testing the Feature

### Test Case 1: Valid Problem

```
Input: "My bathroom has a serious water leak from the ceiling and I'm worried about mold"
Expected: Verified as "Water Leak", severity "High", recommended worker type "Plumber"
```

### Test Case 2: Invalid Problem

```
Input: "Help me with something"
Expected: Rejected as too vague, not a home service request
```

### Test Case 3: Multiple Skills

```
Input: "I need to install a new ceiling light and also fix my plumbing"
Expected: Verified as multiple issues, recommended workers: "Electrician", "Plumber"
```

## Troubleshooting

### "GEMINI_API_KEY not set"

- **Problem:** Gemini verification is skipped
- **Solution:** Set `GEMINI_API_KEY` in `.env` file
- **Fallback:** System uses keyword-based detection (less accurate)

### "Failed to verify problem"

- **Problem:** API call failed
- **Possible Causes:**
  - Invalid API key
  - Network error
  - Gemini API service down
- **Solution:** Check API key, retry, or contact support

### Workers not being suggested correctly

- **Problem:** Suggested workers don't match the problem
- **Possible Causes:**
  - Worker skill types don't match AI recommendations
  - No workers available for recommended skill
- **Solution:**
  - Verify worker `typeOfWork` field has correct values
  - Add more workers with required skills

### Problem rejected but it's valid

- **Problem:** Legitimate problem being rejected
- **Solution:**
  - Be more specific in problem description
  - Include details about what's wrong, where, and impact
  - Example: "My bedroom tap is leaking and I see water stains" (better)
  - Instead of: "help with tap" (too vague)

## Best Practices

1. **For Users:**
   - Provide detailed problem descriptions
   - Mention specific locations (kitchen, bathroom, etc.)
   - Describe the impact (water damage, safety risk, etc.)
   - Include any error messages or symptoms

2. **For Developers:**
   - Always handle verification errors gracefully
   - Show verification details to user for transparency
   - Use worker match scores to sort suggestions
   - Store verification details for future reference
   - Consider confidence score when auto-selecting workers

3. **For System:**
   - Monitor verification accuracy
   - Track which problems get rejected
   - Analyze worker-to-problem matching success
   - Adjust prompt if verification is too strict/loose

## Future Enhancements

Planned improvements:

- [ ] Auto-select top worker if confidence > 95%
- [ ] Multi-language problem verification
- [ ] Image-based problem verification (from camera)
- [ ] Historical data used to improve matching
- [ ] User feedback loop to refine AI prompts
- [ ] Real-time worker availability in verification
- [ ] Estimated cost comparison with worker rates

## Support

For issues or questions:

1. Check troubleshooting section above
2. Verify Gemini API key is valid
3. Check console logs for detailed error messages
4. Contact development team with error details

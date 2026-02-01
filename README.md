# Rumac Fit Sales Dashboard

## Deploy to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Deploy manually"
3. Drag this entire folder into the drop zone
4. Wait for deployment (~30 seconds)
5. Get your live URL!

## What's Included

- **Draft Queue** (homepage) - All Email 2 drafts ready to send
- **Pipeline** - Visual funnel with conversion rates
- **Tasks** - Daily prioritized actions
- **Metrics** - Revenue, leads, Pack 6 vs Pack 7 performance

## Features

- ✅ Real-time updates from Firebase (refreshes every second)
- ✅ Mobile-friendly (works on phone)
- ✅ Copy drafts to clipboard with one click
- ✅ Mark as sent (updates lead stage automatically)
- ✅ No build process needed - pure HTML/JS

## Firebase Structure Required

The dashboard expects this structure in Firebase:

```
rumacfit/
├── leads/
│   └── {leadId}/
│       ├── name
│       ├── email
│       ├── source (pack6 / pack7)
│       ├── stage (assessment_complete / email2_sent / replied / converted / cold)
│       ├── painPoint
│       ├── dateAdded
│       └── lastUpdated
├── drafts/
│   └── {draftId}/
│       ├── leadId
│       ├── leadName
│       ├── painPoint
│       ├── subject
│       ├── body
│       ├── createdAt
│       └── status (pending / sent)
```

## Initialize Test Data

Run this from the workspace:

```bash
cd ~/.openclaw/workspace
node scripts/initialize-firebase-dashboard.js
```

This will create test lead + draft so you can verify the dashboard works.

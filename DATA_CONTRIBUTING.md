# Scholarship Data Contribution Guide

ApplyMate India is an informational scholarship helper. Scholarship rules, deadlines, income limits, and application links can change, so every correction should be easy to review and verify.

## What contributors can improve

Contributors can help by opening issues or pull requests for:

- Incorrect scholarship deadline
- Broken official link
- Wrong income limit
- Wrong category, gender, disability, or education eligibility
- Outdated source name
- Missing official source note
- Duplicate scholarship entry
- Scholarship marked active after the official window closed

## Required verification before changing data

Every scholarship correction should include:

1. Scholarship name
2. Official source link
3. What changed
4. Date checked
5. Screenshot or public notice reference when available

Do not use random social media posts, WhatsApp forwards, or unofficial blogs as the only source for scholarship data.

## Recommended scholarship fields

When the open dataset is added, each record should follow the validator schema used by `scholarship-validator.js`:

```js
{
  name: "Scholarship name",
  state: "national",
  stateLabel: "National",
  education: ["engineering"],
  categories: ["general", "obc"],
  genders: ["any"],
  disability: "any",
  maxIncome: 250000,
  minPercentage: 60,
  amount: "Up to ₹50,000",
  deadline: "Check official portal",
  link: "https://official-portal.example",
  sourceName: "Official Portal",
  eligibilityNote: "Short student-friendly eligibility note.",
  incomeNote: "Short income rule note.",
  priority: 10
}
```

## Local checks

Run these before opening a pull request:

```bash
npm test
npm run validate:data
```

The data-quality GitHub Action runs the same checks automatically on pull requests.

## Review rule

A scholarship record should not be treated as verified unless the official source was checked. If the official source is unclear, mark the note clearly as needing verification instead of guessing.

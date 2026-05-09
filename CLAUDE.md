@AGENTS.md

# Before pushing to production (Railway)
Always run `npx tsc --noEmit` before pushing. Railway runs `next build` on deploy — type errors will fail the build in production.

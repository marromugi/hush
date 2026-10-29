---
name: why-wrong
description: "What to do when a design assumption turns out wrong while building, running, or reviewing: an API behaves differently, a platform doesn't allow something, existing code isn't what it seemed. Use as soon as an assumption written down for the round breaks."
---

# Why wrong?

When an assumption breaks, two things happen at once.

**Fix the design here.** The main conversation redraws the design and carries on. If the fix changes what was agreed with the developer, tell them before continuing. Record the broken assumption and what replaced it in the PR description and the commit message.

**Find out why, in parallel.** Hand a subagent:

- the assumption as it was written,
- what actually happened,
- where the assumption came from: what was read, what was skipped, what was guessed.

Ask it what information would have caught this earlier, and which skill should have said so.

**Improve the skill in a separate PR.** Turn the investigation into a change to the skill it points at. Keep it out of the round's PR: the skills carry the developer's intent, so that PR's merge is the developer's agreement, and it stays readable as a record of why the change was made.

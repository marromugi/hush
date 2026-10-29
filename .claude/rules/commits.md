# Commits

Use Conventional Commits for the subject line: `type(scope): summary`. Write the summary and body in Japanese.

The log is read later to trace why the code ended up the way it is. The code and the diff already show what changed, so the message carries what they cannot:

- Why the change was needed: the problem, what triggered it, which part of the spec it serves.
- What else was considered, and why it was not chosen.
- Assumptions, constraints, or gaps left in on purpose.
- How it was verified, when that is not obvious from the change.

Leave out what the diff already says, such as file lists, renamed identifiers, or a line-by-line retelling.

Keep one purpose per commit. Mark a change to the stored data format (`vault.json`, entry files) with `!`, and say what happens to existing data.

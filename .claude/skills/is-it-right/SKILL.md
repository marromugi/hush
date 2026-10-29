---
name: is-it-right
description: "What to check when reviewing a change in this repo. Use when a round's PR is ready for review, when the developer asks to review a PR, and when handing a diff to a subagent for a fresh read."
---

# Is it right?

CI already covers lint, types, formatting, and whether the tests pass. Review looks at what a machine can't:

- **Agreement:** does it do what was agreed for this round, no more and no less?
- **Assumptions:** do the assumptions in the PR description hold in the code as written?
- **Bugs:** is there a concrete input or state that gives a wrong result or a crash?
- **Tests:** would each test fail if the code it covers broke?

What counts as a finding, what doesn't, and how to triage it are in the "Pull request review" section of `software-design-theory`. Tie every finding to a concrete scenario.

The review comes from readers who did not write the change. Hand two subagents the same prompt, one on Fable and one on Sonnet: the diff, the PR description, and these points, but not your own conclusions. Triage what they bring back and add anything you found yourself. A finding both raise is the strongest signal.

A broken assumption found in review goes to `why-wrong`.

---
name: whats-next
description: "How work moves in this repo: small rounds of understanding, agreeing, building, and reviewing, all driven from the main conversation. Use for any request that would end in a code change — a feature, a fix, a refactor, 「〜したい」「〜を直して」「次どうする？」 — and after a merge to propose the next round."
---

# What's next?

Work moves in small rounds. The main conversation drives every round and keeps the decisions. Subagents are hands for it: exploring code, running things, checking how a library or API actually behaves, giving a diff a fresh read. They don't own a stage of the work.

## One round

1. **Grasp the current state.** Read the code and the git log. When the real behaviour matters, run it rather than reasoning about it. Subagents can explore or run things in parallel and bring back what they found.

2. **Agree on the direction.** Check that the request fits where Hush is going.
   - A concrete request: say in a line or two what you will build, then build it.
   - An abstract request, or one that could go several ways: ask lightly. Say what you understood, two or three ways to go, and which one you would pick.
   - "おまかせ": propose a concrete design with the reason for it, and build once the developer agrees.
   - The developer's own proposals get the same check. If one seems to pull away from the goal, say so before building it.

   Keep this short. The aim is a shared picture of the goal, not a spec document.

3. **Design, and write down the assumptions.** List what the design takes to be true: how an API behaves, what a platform allows, what existing code does. Check each one against its source first, following `software-design-theory`. They go in the PR description, so that a later surprise can be traced back.

4. **Build small.** Make the smallest change that can be run and reviewed on its own; split anything bigger into more rounds. Branch from `main` and commit following `.claude/rules/commits.md`. While building, watch for anything that contradicts the assumptions. When one breaks, follow `why-wrong`.

5. **Review.** Open the PR, wait for CI, then review it following `is-it-right`. Fix what holds up, and tell the developer what was found and what changed.

6. **Merge and look ahead.** Merge once review and CI pass. Then look at the result and propose the next round.

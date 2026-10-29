---
name: principle-structure
description: "Where frontend files go in this repo: one directory per component, hook, and function, kept next to the one component that uses it and moved to src/hooks or src/lib once something else uses it. Use whenever creating, moving, renaming, or deleting a file under src/, and when deciding where a new component, hook, function, test, or story belongs."
---

# Principle: Structure

Each rule carries its reason. A rule whose reason no longer holds for Hush should be changed, not followed.

This covers the frontend under `src/`. The Rust side under `src-tauri/` is not covered yet.

## One unit, one directory

Every component, hook, and function lives in its own directory, named after it, with its test (and story) beside it and an `index.ts` as its entrance.

```
DiaryEditor/
  DiaryEditor.tsx          # the component
  type.ts                  # its props and other types
  DiaryEditor.test.tsx
  DiaryEditor.stories.tsx
  index.ts

useDiaryEditor/
  useDiaryEditor.ts
  useDiaryEditor.test.ts
  index.ts
```

Why: everything about one unit is in one place. Opening the directory shows what it is, how it is tested, and how it looks, and deleting it removes all of it at once.

**`index.ts` re-exports only its own unit.** No `index.ts` collects several units (no `components/index.ts`, no `hooks/diary/index.ts`).
Why: a collecting index makes every import pull in its siblings and hides which unit a file actually depends on. A one-unit entrance has neither cost.

**Import a unit through its directory from outside; inside the directory, import files directly.**
`import { DiaryEditor } from "../DiaryEditor"`, but `DiaryEditor.tsx` imports `./type`.
Why: the directory is the unit's boundary. What goes through `index.ts` is its public face; the files behind it can be reshaped without touching callers.

## Close to where it is used

**Something used by one component lives inside that component's directory.**

```
DiaryEditor/
  DiaryEditor.tsx
  index.ts
  hooks/
    useDiaryEditor/
      useDiaryEditor.ts
      useDiaryEditor.test.ts
      index.ts
  lib/
    toEntryHtml/
      toEntryHtml.ts
      toEntryHtml.test.ts
      index.ts
  components/
    EditorToolbar/
      EditorToolbar.tsx
      index.ts
```

Hooks go in `hooks/`, plain functions in `lib/`, child components in `components/`, each in the same one-unit shape.
Why: the unit's only user is right next to it, so it is obvious who depends on it, and it disappears with the component.

**Once a second component (or anything else) uses it, move it to the shared place for its kind.**

| Kind | Shared place |
|---|---|
| Hook | `src/hooks/{feature}/useXXX/` |
| Plain function | `src/lib/{feature}/xxx/` |
| Component | `src/components/{feature}/Xxx/` |

`{feature}` is the part of Hush it belongs to, such as `diary` or `vault`. Components with no feature, such as a button, go under `ui`.
Why: grouping by feature keeps related units together as the app grows, and a shared place tells the reader "more than one thing depends on this; change it with care".

**Logic that has nothing to do with the screen starts in `src/lib/{feature}/`.**
Talking to Tauri commands, formatting dates for entry file names, and the like.
Why: it was never going to belong to one component, so there is nothing to move later.

## Tests and stories

**A test sits next to the file it tests, named after it.**
`useDiaryEditor.test.ts` beside `useDiaryEditor.ts`.
Why: the test is found by looking at the code, and moving the unit moves its test.

**Every component in `src/components/` has a story.** A component colocated inside another component may skip it.
Why: shared components are the ones looked at on their own; a colocated child is seen through its parent's story.

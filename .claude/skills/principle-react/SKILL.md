---
name: principle-react
description: "How React code is written in this repo: components only render, logic lives in hooks and plain functions, and Effects are a last resort. Use whenever writing, changing, or reviewing a React component or hook (.tsx files, anything under src/ that renders), and whenever an Effect or a new piece of state is about to be added."
---

# Principle: React

Each rule carries its reason. A rule whose reason no longer holds for Hush should be changed, not followed.

## Components render; logic lives elsewhere

**A component turns values into markup and wires events to handlers. It holds no logic of its own.**
Logic means state transitions, derived values, Effects, talking to Tauri or other outside systems, and anything with a branch worth testing.
Why: a component then reads top to bottom as "what is on screen", and the logic can be read and tested without rendering anything.

**Logic that needs React (state, Effects, context, other hooks) goes in a custom hook. Everything else goes in a plain function.**
Prefer the plain function when both would work.
Why: a plain function is the easiest thing to test (Vitest, no DOM) and to move. A hook is only worth its rules (call order, dependencies) when it needs React.

**A component calls hooks and passes their results down; it does not rework them.**
If the markup needs a value the hook doesn't give, add it to the hook (or a function) instead of computing it inline.
Why: once computation creeps into the component, the line between "screen" and "logic" disappears.

## Effects: you might not need one

Source: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect). An Effect is for synchronizing with something outside React. If no outside system is involved, there is almost always a better place for the code.

| Situation | Do this instead of an Effect | Why |
|---|---|---|
| A value can be computed from props or state | Compute it during render (in the hook or a function) | An Effect renders once with a stale value, then again; the copied state can drift out of sync |
| That computation is measurably slow | `useMemo`, after measuring | It only skips recomputation on unrelated updates; measure first, since it does nothing for the first render |
| All state should reset when a prop changes | Give the child a `key` from that prop | React treats each key as a new component; an Effect renders stale state first and must be repeated in every stateful child |
| Some state should adjust when a prop changes | Store an ID and derive the rest during render | Same stale render as above, and the data flow becomes hard to follow |
| Something should happen because the user did something | Put it in the event handler; share a function between handlers if needed | An Effect runs because the component is on screen, not because of the action, so it can fire again on remount |
| A request should be sent on submit or click | Send it in the handler | It must happen once, for that interaction |
| One state change should lead to several others | Compute all next state in the handler, derive the rest during render | Chained Effects add a render per link and break when old values are set again |
| Something should run once when the app starts | Module-level code or a module-level "done" flag, in the root module | Effects run twice in development under Strict Mode, and components must survive remounting |
| A parent should learn about a child's state change | Call the parent's callback in the same handler, or lift the state up | The Effect runs after the screen updates and forces an extra render; handler updates are batched |
| A parent needs data a child loaded | Load it in the parent (or a hook it calls) and pass it down | Data flowing up through Effects is hard to trace |
| A value lives in an outside store (browser API, Tauri event) | `useSyncExternalStore`, inside a custom hook | Manually syncing mutable outside data into state is easy to get wrong |

An Effect is the right tool when:

- syncing with a system outside React: a non-React widget, the DOM, the network, Tauri;
- something must happen because the component is displayed, not because of a user action;
- loading data that follows the current inputs. Then always clean up (ignore stale responses), and keep the Effect inside a custom hook rather than in the component.

## Component shape

**Don't define a component inside another component.**
Why: it becomes a new component type on every render, so React unmounts and remounts it, and its state is lost. For an editor, that means losing the text and the cursor.
(Vercel `rerender-no-inline-components`)

**Use a ternary for conditional rendering, not `&&`.**
Why: `count && <List />` renders `0` when `count` is `0`. A ternary makes the "else" visible too.
(Vercel `rendering-conditional-render`)

**Don't add boolean props to switch a component's behavior or look. Make an explicit variant instead.**
For looks, that variant is a Tailwind Variants option. For behavior, it is a separate component built from shared parts.
Why: every boolean doubles the combinations a reader has to hold in mind, and most of them are never used.
(Vercel `architecture-avoid-boolean-props`, `patterns-explicit-variants`)

**Pass `children` rather than `renderX` props.**
Why: children read like the markup they produce; a render prop hides markup inside a function argument.
(Vercel `patterns-children-over-render-props`)

**Don't use `forwardRef`; take `ref` as a normal prop.**
Why: React 19 passes `ref` as a prop, so the wrapper is noise.
(Vercel `react19-no-forwardref`)

Vercel rules come from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (`react-best-practices`, `composition-patterns`). Only the rules that apply to Hush are taken. Most of the rest target Next.js and server rendering, which Hush doesn't have.

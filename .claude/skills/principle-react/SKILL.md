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
If the markup needs a value the hook doesn't give, add it to the hook (or a function) instead of computing it inline. Choosing a ui component's variant is the exception (see `principle-styling`).
Why: once computation creeps into the component, the line between "screen" and "logic" disappears.

**Fixed options passed to a library hook are configuration, not logic.**
A component may call `useEditor({ extensions: [StarterKit] })` directly. Once the call grows handlers, state, or branches (saving on update, switching extensions), move it into a custom hook such as `useDiaryEditor`.
Why: wrapping a one-line static call in a hook adds a file and a name without making anything easier to read or test.

## State

**Pass a function to `useState` when the initial value is costly to build.**
`useState(() => parse(raw))`, not `useState(parse(raw))`.
Why: the argument is evaluated on every render even though only the first result is used.
(Vercel `rerender-lazy-state-init`)

**Use the functional form of a setter when the next state depends on the previous one.**
`setItems((items) => [...items, item])`, not `setItems([...items, item])`.
Why: a callback created earlier closes over an old `items`, so the plain form silently drops updates. The functional form also keeps the callback's dependencies empty.
(Vercel `rerender-functional-setstate`)

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
| An outside store has a current value you can read at any time (`navigator.onLine`, a third-party store) | `useSyncExternalStore`, inside a custom hook | Manually syncing mutable outside data into state is easy to get wrong |

An Effect is the right tool when:

- syncing with a system outside React: a non-React widget, the DOM, the network, Tauri. Tauri events are pushed, not read: subscribe with `listen()` in an Effect and call the returned unlisten function in the cleanup. `listen()` returns a Promise, so it does not fit `useSyncExternalStore`;
- something must happen because the component is displayed, not because of a user action;
- loading data that follows the current inputs. Then always clean up (ignore stale responses), and keep the Effect inside a custom hook rather than in the component. When one load depends on the result of another, chaining these Effects is fine; the "chained Effects" row above is about state that could have been computed in a handler.

## Component shape

**Don't define a component inside another component.**
Why: it becomes a new component type on every render, so React unmounts and remounts it, and its state is lost. For an editor, that means losing the text and the cursor.
(Vercel `rerender-no-inline-components`)

**Use a ternary when the condition is not a boolean.**
`count > 0 ? <List /> : null`, not `count && <List />`. A real boolean may use `&&`.
Why: `&&` renders its left side when it is falsy, so `0` and `NaN` end up on screen.
(Vercel `rendering-conditional-render`)

**Don't add boolean props that switch a component into a different mode. Make an explicit variant instead.**
Mode flags like `isCompact` or `isReadOnly` that change what the component is or does are the target. Plain state such as `disabled`, `loading`, or `open` is fine as a boolean. For looks, a ui component takes a named variant (`size: "sm" | "md"`, see `principle-styling`), not a boolean one. For behavior, it is a separate component built from shared parts.
Why: every mode flag doubles the combinations a reader has to hold in mind, and most of them are never used.
(Vercel `architecture-avoid-boolean-props`, `patterns-explicit-variants`)

**Pass `children` rather than `renderX` props, unless the parent has to hand data to what it renders.**
A list that renders each entry may take `renderItem={(entry) => ...}`; a layout slot takes `children`.
Why: children read like the markup they produce; a render prop hides markup inside a function argument. It is only worth that when the child needs the parent's data.
(Vercel `patterns-children-over-render-props`)

**Don't use `forwardRef`; take `ref` as a normal prop.**
Why: React 19 passes `ref` as a prop, so the wrapper is noise.
(Vercel `react19-no-forwardref`)

## What was taken from Vercel, and what wasn't

Vercel rules come from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (`react-best-practices`, `composition-patterns`). The rules above were taken because they prevent bugs or shape how components are built.

Left out for now:

- Server and Next.js rules (`server-*`, `async-*`, hydration): Hush has no server rendering.
- Performance tuning (most `rerender-*`, `rendering-*`, `js-*`, `bundle-*`): nothing in Hush is measurably slow yet. Take a rule when a measurement points at it.
- Component library patterns (`architecture-compound-components`, `state-*`): Hush has a handful of components. Revisit when one grows several parts that share state.

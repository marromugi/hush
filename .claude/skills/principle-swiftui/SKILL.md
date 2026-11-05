---
name: principle-swiftui
description: "How SwiftUI views are written in this repo, on iOS and macOS: views only render, state lives in @Observable models and plain functions, onChange and task are a last resort, view identity is kept stable, platform differences stay in small leaf places, and the web editor sits behind one representable. Use whenever writing, changing, or reviewing a SwiftUI view, a model a view owns, a modifier that reacts to change, or anything shared between the iOS and macOS screens."
---

# Principle: SwiftUI

Each rule carries its reason. A rule whose reason no longer holds for Hush should be changed, not followed.

Swift that is not a view (errors, concurrency, the Rust core, tests) follows `principle-swift`. Several rules here are the SwiftUI side of `principle-react`; where the reason is the same, it points there.

## Views render; logic lives elsewhere

**A view turns values into views and wires actions to a model's methods. It holds no logic of its own.**
Logic means state changes, derived values, async work, talking to the Rust core or the web editor, and anything with a branch worth testing.
Why: the same as `principle-react`. A view then reads top to bottom as what is on screen, and the logic can be read and tested without a view.

**Logic that needs to hold state goes in an `@Observable` model. Everything else goes in a plain function or type.**
Prefer the plain function when both would work.
Why: a plain function is the easiest thing to test and move. A model is worth it only when something has to be remembered between actions.

**A view reads a model's values and calls its methods; it does not rework them.**
If the view needs a value the model doesn't give, add a computed property to the model.
Why: once computation creeps into `body`, the line between screen and logic disappears, and it reruns on every update.

## State

**Use Observation only: `@Observable` models, held with `@State`, `@Environment`, `@Bindable`, or a plain property. No `ObservableObject`, `@Published`, `@StateObject`, `@ObservedObject`, or `@EnvironmentObject`.**

| Need | Use |
|---|---|
| A value only this view uses (a toggle, a text field's draft) | `@State private var` |
| A model this view creates and owns | `@State private var model = Model(…)` |
| A model handed in by a parent, read only | `let model: Model` |
| A model handed in, with a binding to one of its properties | `@Bindable var model: Model` |
| A model the whole app shares (the unlocked session, settings) | `@Environment(Model.self)` |

Why: with Observation, a view updates only when a property it read in `body` changes, not when anything in the model does. One mechanism also means one set of rules to remember.

**`@State` is `private`. It is seeded from an `init` argument only when that argument never changes for the life of the view, such as the entrance to the Rust core.**

```swift
init(core: Core) {
    _model = State(initialValue: UnlockModel(core: core))
}
```

Why: `@State` keeps its first value for the life of the view. A value passed in later is silently ignored, so a view that seeds `@State` from a changing input shows stale data. A dependency that never changes loses nothing. To start over for a new input, give the view a new `.id` (see Identity).

**Derive, don't copy.** A value that can be computed from other state is a computed property, never a second stored property kept in step.
Why: two stored copies drift apart the first time one path forgets to update both.

## onChange and task: you might not need one

`onChange`, `onAppear`, and `task` run because the view is on screen or a value changed, not because the user did something. Like an Effect in React, they are for syncing with something outside SwiftUI. The table is `principle-react`'s, in SwiftUI terms.

| Situation | Do this instead | Why |
|---|---|---|
| A value can be computed from other state | A computed property on the model | `onChange` updates a copy one pass late, and the copy can drift |
| Something should happen because the user did something | Call the model's method in the action | It must happen once, for that action, not again when the view reappears |
| One state change should lead to several others | Make all of them in the model's method | Chained `onChange`s add an update per link and are hard to follow |
| A view's state should reset when an input changes | Give the view `.id(input)`, unless the web editor is inside it | SwiftUI treats each id as a new view and starts its state fresh |
| A parent should learn about a child's change | Call the parent's closure in the same action, or move the state up | The parent hears after the screen has already updated |

`task` is the right tool when:

- loading data because the view is shown. Use `.task(id:)` when the load follows an input, so that a new input cancels the old load;
- listening to something that keeps sending, such as an `AsyncSequence`, for as long as the view is on screen.

The work inside is a call to the model's method, never a body of logic in the view.

## Identity

**`ForEach` takes data with a stable `id` from the data itself (`Identifiable`). Never an index, and never `\.self` on a value that can change.**
Why: SwiftUI matches old and new rows by id. An unstable id moves state and animations to the wrong row, or rebuilds rows that didn't change.

**Don't switch a view in and out with a modifier wrapped in `if`. Pass the condition to the modifier's argument.**

```swift
// No: two different views, so state is lost when `isLocked` flips
if isLocked { content.blur(radius: 8) } else { content }

// Yes: one view whose blur changes
content.blur(radius: isLocked ? 8 : 0)
```

Why: each branch of an `if` is a different view to SwiftUI. Flipping the condition throws away the state below it. For the web editor, that means reloading it and losing the cursor.

**No `AnyView`.** Return `some View` and use `@ViewBuilder`.
Why: `AnyView` hides the type SwiftUI uses to tell views apart, so it rebuilds what lies under it more often than needed.

## View shape

**Split a large `body` into separate `View` structs, not into computed properties or functions that return views.**
Why: a struct's `body` keeps track of the model properties it reads on its own, so a change to one of them reruns that struct and not the whole screen. A computed property is part of the parent's `body` and reruns with everything in it. A struct also gets its own `#Preview`.

**A view takes the values it shows, and closures for its actions. It takes a model only when it is the screen that owns that model.**
Why: a view that takes plain values can be previewed and reused anywhere. One that takes a model can only appear where that model exists.

**Don't add Boolean parameters that switch a view into a different mode. Make separate views from shared parts.**
Plain state such as `isEnabled` or `isLoading` is fine.
Why: the same as `principle-react`. Every mode flag doubles the combinations a reader has to hold in mind.

## iOS and macOS

**One view serves both platforms. Layout follows the width the view is given (`ViewThatFits`, `onGeometryChange`), not the platform and not `horizontalSizeClass`.**
Why: a narrow Mac window and an iPad in Split View need the phone's layout. Branching on the platform gets both wrong. On macOS the size class is always regular, so a layout read from it never narrows there.
([horizontalSizeClass](https://developer.apple.com/documentation/swiftui/environmentvalues/horizontalsizeclass))

**`#if os(...)` is only for an API that exists on one platform, and stays in a small view or modifier at the leaf.**
Why: a screen sprinkled with `#if` reads as two screens folded into one, and the half not being built is never compiled or seen.

## The web editor

**The editor's `WKWebView` is reached through one representable view. Nothing else talks to it.**
The representable sends and receives typed messages (`Codable`), and its coordinator is the web view's delegate.
Why: the page inside follows WebKit's rules, not the app's. One entrance keeps the message format, loading, and keyboard handling in one place. (software-design-theory 7)

**`updateUIView` / `updateNSView` changes only what changed. It never reloads the page or resets its content.**
Why: SwiftUI calls it on every update of the parent. A reload there throws away what the person was typing.

**The editor's view keeps one identity for as long as it is on screen.** No `.id` on it or on a view around it changes while it is shown; new content goes in as a message.
Why: a new identity makes a new `WKWebView`, which loads the page again and loses the cursor.

**The script message handler is removed in `dismantleUIView` / `dismantleNSView`.**
Why: `WKUserContentController` holds its handlers strongly. A handler left in place keeps the coordinator, and through it the web view, alive after the screen is gone.

## Look and accessibility

**A color, font, or size gets a name once the same meaning appears a second time, in the asset catalog or as a static property.** Colors live in the asset catalog with light and dark values.
Why: the same as `principle-styling`. A name given too early guesses at a meaning; repeated literals with one meaning drift apart. The asset catalog switches with the system's appearance without code.

**A button that shows only an icon has an `accessibilityLabel`.**
Why: VoiceOver otherwise reads the symbol's name or nothing.

**Motion respects Reduce Motion (`accessibilityReduceMotion`).** A movement that only decorates is dropped; one that shows where something went becomes a fade.
Why: the same as the web's `motion-reduce`. Some people feel sick from motion on screen.

## Previews

**Every screen and every view with more than one look has a `#Preview` for each look**, built from plain values or a model given a fake core.
Why: the same role as stories on the web. A look that has no preview is only seen when the app reaches that state.

## Not taken

- UIKit or AppKit screens: only where SwiftUI has no way to do something, wrapped in a representable like the editor.
- Navigation rules (`NavigationStack` paths, deep links): Hush has a handful of screens. Settle them with the round that builds navigation.
- Performance tuning (`equatable()`, splitting models to narrow updates): take a rule when a measurement points at it.

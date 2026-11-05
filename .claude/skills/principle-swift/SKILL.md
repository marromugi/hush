---
name: principle-swift
description: "How Swift code is written in this repo, apart from views: throw for expected failures and trap only on bugs, one AppError the screens branch on, main-actor by default with heavy work marked @concurrent, value types first, the Rust core reached through one Swift type, and files read and written by Rust only. Use whenever writing, changing, or reviewing a .swift file, adding an error case, a model, a call into the Rust core, or a test. For views, also read principle-swiftui."
---

# Principle: Swift

Each rule carries its reason. A rule whose reason no longer holds for Hush should be changed, not followed.

This covers Swift that is not a view: models, the entrance to the Rust core, and plain functions. How views are written is in `principle-swiftui`. Where Swift files go is not decided yet; it is settled with the first round that adds them.

## Failure: throw or trap

**Throw for every failure that can happen in normal use. Trap (`!`, `try!`, `fatalError`, `preconditionFailure`) only on a bug.**
A wrong passphrase, a missing network, and a broken entry file are normal use. A state the code should never reach is a bug.
A trap carries a message saying why it cannot happen: `guard let x else { preconditionFailure("…") }`, not `x!`. Tests may use `try` and `#require` freely.
Why: the same as `principle-rust`. In a diary app, typos and network failures are everyday events, and an app that crashes on them can't be used. A bug that keeps running may save corrupted data, so stopping is safer.

**No `try?` that drops an error the user should hear about.**
`try?` is fine when "no value" is the whole answer, such as an optional cache. Anything else is caught and turned into an `AppError`.
Why: `try?` turns a failure into `nil` without a trace, and the screen then shows nothing instead of saying what went wrong.

## One error type

**The app has one error type, `AppError`, an enum with a case for each kind of failure the screens react to differently.**

```swift
enum AppError: Error, Equatable {
    case wrongPassphrase
    case network
    case brokenEntry(date: EntryDate)
    case newerVaultVersion(UInt32)
    case locked
    case cancelled
}
```

**Functions that can fail with it throw it by type: `throws(AppError)`.**

```swift
func unlock(passphrase: String) async throws(AppError) -> Session
```

Why: a screen switches over the cases to pick its words, and with the type in the signature the compiler checks that every case is handled. The typed-throws proposal keeps untyped `throws` as the default for most code, and names code whose errors stay inside one module and are always handled as a fit for typed throws. Hush's errors never leave the app and every one ends on a screen.
([SE-0413 Typed throws](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md), "When to use typed throws")

**The words shown to people are chosen on the screen from the case. The error carries no display text.**
Why: the same as `principle-rust`'s `kind`. Error text from below can carry file paths and is not meant to be shown; the screen knows where the message will appear and how long it can be.

**An error from the Rust core or from Apple's frameworks becomes an `AppError` where it is caught, at the entrance that called it.** No foreign error type travels past that entrance.
Why: past the entrance, code handles one closed set of failures. A foreign type leaking through makes every caller learn it, and an exhaustive `switch` is no longer possible.

**Before converting, the entrance logs the foreign error's own text with `Logger`.**
Why: `AppError` keeps only the kind, so the log is the one place that says why an entry was broken on someone's device. It plays the part of `message` in `principle-rust`. What may appear in it once secrets are involved is decided with the secrets work.

**A panic in the Rust core is a bug. When it comes through the binding as an error, the entrance traps instead of turning it into an `AppError`.**
Why: the same rule as above, one layer down. Shown as a normal failure, a bug would keep running and could save broken data.

**Cancellation is not a failure.** `AppError` has a `cancelled` case; the entrance turns `CancellationError` into it, and screens show nothing for it.
Why: SwiftUI cancels a view's task when the view goes away or its input changes. Mapped to any other case, a cancelled load would show up as an error message.

## Concurrency

**Build in the Swift 6 language mode, with the app module's default isolation set to the main actor.**
Why: data races become compile errors. Most app code drives the screen and belongs on the main actor; making that the default removes `@MainActor` from almost every declaration, and code that leaves the main actor has to say so.
([SE-0466 Control default actor isolation inference](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0466-control-default-actor-isolation.md))

**Turn on the `NonisolatedNonsendingByDefault` upcoming feature. A function that must run off the caller's actor is marked `@concurrent`.**

```swift
@concurrent
func deriveKey(passphrase: String, salt: Salt) async throws(AppError) -> VaultKey
```

CPU-heavy work, such as Argon2 key derivation in the Rust core, is the case for `@concurrent`. `@concurrent` implies `nonisolated`, so it needs no second mark.
Why: with the feature on, a `nonisolated async` function runs on the caller's actor, so nothing leaves the main actor by accident. `@concurrent` always switches off it, so the work that does leave is visible and can be searched for. Half a second of hashing on the main actor freezes the window.
([SE-0461 Run nonisolated async functions on the caller's actor by default](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md))

**A value type or plain function that `@concurrent` code uses is marked `nonisolated`.**

```swift
nonisolated struct Salt: Sendable, Equatable { … }
```

Why: under the main-actor default, every declaration without a mark is `@MainActor`, value types and their conformances included. Work moved off the main actor could then not use them without hopping back, which undoes the move.

**No `@unchecked Sendable`, `nonisolated(unsafe)`, or `Task.detached`.** The entrance to the Rust core may use the first two where the generated code needs it, each with a comment saying why it is safe.
Why: each one switches the compiler's race check off. Outside the one place where code from another language comes in, the check is the thing that keeps the app from racing. `Task.detached` also drops the caller's priority and cancellation; `@concurrent` does the job without that.

**A `Task { }` started from a button keeps its handle when it can be started twice.**
A save that must not run twice holds its task in the model and awaits the previous one before starting.
Why: an unkept task cannot be waited for, and a second tap starts a second one that races the first. Cancelling the first is not enough: cancellation only asks, and a call already inside the Rust core runs to the end.

**A load whose input can change checks, when it finishes, that its input is still the current one, and drops its result otherwise.**
Why: the same reason. `.task(id:)` cancels the old load, but a call into the core still returns, and its late result would overwrite the newer one.

## Types

**Use a `struct` or an `enum` by default. Use a `class` only when the thing has an identity that several places share: an observable model, or an owner of a resource such as the web editor. Classes are `final`.**
Why: a value can be copied and compared, and a change to it can't reach anyone else by surprise. Nothing in Hush is subclassed; `final` says so and lets the compiler call methods directly.

**A value with rules (a `YYYY-MM-DD` date, a Secret Key) gets a type that can only hold a valid value, made through a throwing or failable `init`.**
Why: the same as `principle-rust`. An invalid value fails where it is made, instead of being used because someone forgot to check it.

**A model's state is `private(set)`, except a field that a control edits directly through a binding, such as a text field's draft.**
Why: a view reads the state and calls the model's methods. State changes then go through methods that can be read and tested. A bound field is the one place SwiftUI writes for the view, and a binding needs the setter.

## The Rust core

**Files are read and written by the Rust core only.** Swift never parses `vault.json` or an entry file, and holds no copy of their format.
Why: the format, its version, and the rules for reading a newer one (`principle-rust`) then live in one place. Two parsers of one format drift apart, and the one that lags drops fields on saving.

**The Rust core is reached through one Swift type. Generated binding code is used nowhere else.**
The type takes and returns Swift types of the app's own, turns errors into `AppError`, and marks the heavy calls `@concurrent`.
Why: the generated code follows the binding tool's rules, not the app's. Keeping it behind one type means a change of tool, or a change in what it generates, touches one file. (software-design-theory 7)

**The generated code lives in its own module, built without the main-actor default.** The one type sits in the app module.
Why: the default applies to every declaration in the module it is set on, and not to code imported from other modules. Generated code that the Rust side calls back from its own threads would otherwise be made `@MainActor` and fail to build or trap.
([SE-0466](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0466-control-default-actor-isolation.md))

**A model takes that type, or a protocol it conforms to, in its `init`. It never makes one itself.**
Why: a test can then hand in a fake core and check the model's state changes without a vault on disk. (software-design-theory 3)

## Naming

**Follow the Swift API Design Guidelines.** Names read as English phrases at the call site, argument labels make the call clear, and methods with side effects are verbs (`unlock()`) while those without are nouns or `is…` (`isLocked`).
Why: Apple's frameworks follow them, so code that does the same reads like the frameworks beside it.
([Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/))

**One main type per file, and the file is named after it.** Conformances of that type go in extensions in the same file.
Why: the name tells where a thing is, the same as `principle-rust`.

## Tests

**Tests use Swift Testing (`@Test`, `#expect`, `#require`), not XCTest.**
Why: `#expect` prints both sides of a failed comparison without a separate assert function for each kind. Arguments to `@Test` run one test over many cases.

**Models and plain functions are tested without a view.** A view is checked on the running app, not by unit tests.
Why: the same split as `principle-react`. Logic lives where it can be tested alone; what a view looks like is judged by looking at it.

**The test module uses the same main-actor default as the app module.**
Why: the default is set per module. Without it, a test is `nonisolated` and cannot create or call a model, which is `@MainActor`.

## Lint and format

**Format with `swift format`, and run its lint in CI with warnings treated as errors.**
Why: it ships with the Swift toolchain, so nothing else needs to be installed. A rule a machine holds does not need to be remembered or argued in review. (software-design-theory 6)

## Not taken

- SwiftLint: `swift format lint` covers formatting and naming without another tool. Add it when a rule it holds is wanted.
- Combine: Observation and `async` cover what Hush needs. Combine stays only where an Apple API still hands one out, and is turned into `async` at that call.
- Third-party architecture libraries (The Composable Architecture and similar): Hush has a few screens, and `@Observable` models with plain functions are enough. Revisit if state shared across screens grows hard to follow.
- Performance tuning: nothing is measured yet. Take a rule when a measurement points at it.

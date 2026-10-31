---
name: principle-styling
description: "How styling is written in this repo: Tailwind classes written directly, a name given to a color or size only once the same meaning shows up a second time, tailwind-variants for generic ui components only, and class lists split into commented groups. Use whenever adding or changing classes, a color, a theme token, a ui component's variants, or src/styles.css, and when a feature component's look depends on its props."
---

# Principle: Styling

Each rule carries its reason. A rule whose reason no longer holds for Hush should be changed, not followed.

## Names come from use

**Write Tailwind's own classes directly (`bg-stone-50`, `px-6`). Don't create a theme token up front.**
Why: a value used in one place has no meaning yet beyond that place. Naming it early guesses at a meaning that may never be shared, and the guess then has to be undone.

**When the same meaning shows up a second time, give it a name in `@theme` in `src/styles.css`, and use the name in both places.**

"Same meaning" is what matters, not the same value: two `stone-50`s that are both "the page background" get a name; a `stone-50` page and a `stone-50` button that merely look alike do not.
Why: the second use is the first point where it is clear what the two have in common, so that is when the name can be chosen well.

**A color name carries both schemes. Its light value goes in `@theme`; its dark value overrides the same variable for dark mode in `@layer base`.**

```css
@theme {
  --color-surface: var(--color-stone-50);
}

@layer base {
  @media (prefers-color-scheme: dark) {
    :root {
      --color-surface: var(--color-stone-950);
    }
  }
}
```

```tsx
<div className="bg-surface" /> {/* right in both schemes, no dark: needed */}
```

Why: the generated class reads the variable (`background-color: var(--color-surface)`), so switching the variable switches every use. A `@theme` value alone stays light in dark mode, and a second name for the dark value brings back the `bg-surface dark:bg-surface-dark` pair at every use, which the name was meant to remove.

**Naming on the second use is part of building, not a separate task.** When you notice it while building, do it in the same PR, and say so in the PR description (see "Build small" in `whats-next`).
Why: left for later, the two copies drift apart and the shared meaning is lost.

**Styles for the whole page go on `body` in `src/styles.css` (`@layer base`).**
Why: they apply to everything, including Storybook stories, which never render `App`.

## Two kinds of components

**Generic ui components (`src/components/ui/`) define their look with `tv()` from tailwind-variants, in `style.ts` next to the component.**

```ts
// src/components/ui/Button/style.ts
import { tv } from "../../../lib/ui/tv";

export const button = tv({
  base: [
    // layout
    "inline-flex items-center",
    // shape
    "rounded-md px-3 py-1.5",
  ],
  variants: {
    tone: {
      primary: "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900",
      neutral: "bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-100",
    },
  },
});
```

Variants are named for how the component looks (`tone`, `size`), never for what it is used for.
Why: a ui component knows nothing about Hush's features, so the only thing its props can describe is appearance. `tv()` gives those options names and resolves conflicting classes. Keeping it in `style.ts` leaves the component file as markup, the same way `type.ts` holds its types.

**ui components import `tv` from `src/lib/ui/tv`, never straight from `tailwind-variants`. A non-color name added to `@theme` (a font size, a shadow) is registered there too.**

```ts
// src/lib/ui/tv/tv.ts
import { createTV } from "tailwind-variants";

export const tv = createTV({
  twMergeConfig: {
    extend: {
      theme: {
        text: ["body", "title"], // --text-body, --text-title in @theme
      },
    },
  },
});
```

Why: `tv()` resolves conflicts with tailwind-merge, which doesn't know names from `@theme`. It reads an unknown `text-title` as a text color, so `text-stone-900` and `text-title` together keep only one of the two. Color names like `bg-surface` are already merged correctly and need no entry.

**Feature components don't use `tv()`. Their props keep their feature meaning, and the look is chosen in the markup.**

```tsx
// a feature component: the feature prop `isSaved` picks the ui component's look
<Button tone={isSaved ? "neutral" : "primary"}>保存</Button>
```

Classes a feature component adds itself are written with `clsx`, or as a plain string when there is only one group.
Why: a feature component's props say what something is (`isSaved`, `entry`), and some of them also affect how it looks. Turning such a prop into a `tv()` variant gives it a second, visual meaning, so the prop no longer says plainly what it is. Translating it at the point of use keeps "what it is" in the feature component and "how it looks" in the ui component.

**When a feature component needs a look that switches and no ui component offers it, make that look a ui component (or a new variant of one).**
Why: a look with options is a ui concern. Building it into the feature component would bring back the mix of feature and visual meaning this section separates.

## Class lists

**When a class list has more than one group, put each group on its own line under a comment that says what the group is for.** This applies to `clsx(...)` arguments and `tv()` arrays alike.

```tsx
<main
  className={clsx(
    // layout
    "mx-auto max-w-2xl",
    // spacing
    "px-6 py-12",
  )}
/>
```

A single group is a plain string: `className="min-h-screen"`, not `clsx("min-h-screen")`.
Why: the formatter (oxfmt) joins arguments and array items onto one line whenever they fit, and a comment is the only thing that keeps the lines apart. The comment then also tells the reader what each group is for, which is the reason to split the list at all.

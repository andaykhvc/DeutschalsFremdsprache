# Alltagsnotizen

A public German diary, written by one learner and improved with sentence-level suggestions from readers. The memorable element is the annotation margin: a real diary with friendly notes, rather than a generic publishing dashboard.

## Visual plan

Light tokens: paper #F7F8FA, surface #FFFFFF, ink #23262B, secondary #626975, action #2856C4, annotation #FFF1BD. Dark tokens: paper #17191D, surface #22252B, ink #F1F3F7, secondary #B0B7C3, action #91B2FF, annotation #54471E. Color never carries correction status alone; labels and del/ins do too. Verify contrast numerically during QA.

Newsreader for titles and diary text, system sans-serif for navigation and controls. Titles 40–64 px, diary 21 px / 1.75, UI 15–17 px. Left aligned, 62–70 character reading measure. Controls at least 44 px high.

Desktop:

```
brand / notebook navigation | date / title / photographs | annotation margin
                           | diary paragraphs            | selected quote
                           | comments                    | proposed replacement
```

Compact:

```
brand / menu
date / title
photographs
diary paragraphs
correction button → accessible dialog
comments
```

No ambient animation. Dialogs and selection changes have brief functional transitions; reduced motion and increased contrast supported. Follow system dark mode.

## Critique before implementation

Keep the familiar clarity and generous spacing requested by the user. Remove ornamental statistics, fake collaborators, and marketing sections. The diary's dates, photos, and correction margin establish its own purpose. Use a cool paper surface and blue annotations instead of the generic cream/terracotta palette.

## Scope

Next.js on Vercel, PostgreSQL on Neon, Neon Managed Better Auth through the Vercel app, Vercel Blob for photos. No third backend provider. Public reading; authenticated readers can comment and suggest corrections; only the configured owner can publish, edit, upload, or accept/reject corrections. Original revisions are immutable. Stale corrections require a new suggestion rather than silently editing the wrong text.

## Verification

Core contrast ratios: light ink/surface 15.18:1; secondary/paper 5.20:1; primary button 6.52:1. Dark ink/surface 13.82:1; secondary/paper 8.72:1; primary button 7.07:1. Annotation text: 13.42:1 light, 8.23:1 dark.

Apple references applied to the web as principles: `accessibility.md › Vision` ("Support larger text sizes"), `layout.md › Adaptability` ("Design a layout that adapts gracefully and consistently"), `typography.md › Ensuring legibility` ("In general, avoid light font weights"), `color.md › Best practices` ("Avoid using the same color to mean different things"), `undo-and-redo.md › Best practices` ("Show the results of an undo or redo"). Design judgment: the cool paper surface and annotation margin suit a language learner’s diary.

QA: desktop and 390 px mobile views inspected in the browser, no document horizontal overflow, all three example photographs loaded. Core color pairs measured in both appearances; dark mode visually inspected. Native modal dialog traps focus and supports Escape; hidden mobile navigation removed from the accessibility tree. Live Neon/Blob integration exercised with synthetic data, including permissions, drafts, acceptance, history, stale conflicts, CSRF and real uploads.

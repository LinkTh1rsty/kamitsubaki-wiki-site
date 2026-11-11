# Shared workspace header and navigation

Contribution hub, My space and all LABs sections use `WorkspaceHeader.astro` and `WorkspaceNavigation.astro`. `workspaceNavigation.mjs` owns the moving indicator, sticky compact navigation, overflow reveal, reduced motion and observer cleanup. `uiMotion.mjs` owns panel entry animation.

Use `WorkspaceHeader` with `title`, `intro`, optional `eyebrow`, default action slot and optional `status` slot. Use `WorkspaceNavigation` with `label` and `kind` (`hub`, `labs`, `account`), placing existing navigation links in its default slot. Render these inside the page's main element.

The page controller continues to own URLs, history, selection and content visibility. Set `aria-current` on the selected link; the shared component reacts without remounting content. LABs retains its tab roles, keyboard handling and per-section query parameters. Other link rails receive Arrow, Home and End navigation from the common controller. Use `revealPanel` for content changes rather than introducing page-specific animation curves.

Compact navigation preserves its expanded layout height and publishes `--reader-sticky-top` for the shared reader. Desktop rails shrink between the header controls; smaller screens retain horizontal scrolling below the header. Do not add separate indicator markup or scroll listeners to individual page controllers.

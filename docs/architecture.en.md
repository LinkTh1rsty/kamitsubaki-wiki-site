# V3 frontend architecture

This repository maintains the static frontend, encyclopedia content, and user-visible submission interfaces. The server is closed source. Its code, internal data model, and operations material are not supplied here.

| Frontend source | Responsibility |
| --- | --- |
| `src/content/` | Multilingual encyclopedia Markdown and Schema v2 metadata. |
| `src/data/classification-map.json` | Reviewed taxonomy and directory hierarchy. |
| `src/lib/entitySchema.mjs`, `src/lib/entityRegistry.mjs` | Frontend field validation, stable IDs, public routes, and relationships. |
| `src/lib/contentLayout.mjs` | Encyclopedia source directory rules. |
| `src/data/chronicle/`, `src/data/taxonomy/eras.yml` | Public events and era boundaries. |
| `docs/manuals/` | Markdown sources for the three in-site manuals. |

Entry changes become public after a GitHub proposal is reviewed, merged, and reflected in the static site. Articles and gallery sets use the site's submission and review interfaces. The frontend displays user-visible states without documenting server implementation.

[Development manual](manuals/develop/architecture/en.md) · [Contribution manual](manuals/contribute/start/en.md) · [Content directory](../src/content/README.md) · [Documentation index](README.md)

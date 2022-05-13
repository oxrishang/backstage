---
'@backstage/plugin-techdocs': patch
---

Packages a set of tweaks to the TechDocs addons rendering process:

- Prevent new sidebar locations from being created every time the reader page is rendered if these locations already exist;
- Prevents displaying sidebars until page styles are loaded and also the sidebar position is updated;
- Avoid re-rendering content if it doesn't change during the sync process.

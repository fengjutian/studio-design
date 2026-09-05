# Front-end architecture

The renderer is organized by responsibility so new providers and screens can be added without coupling them to the application shell.

```text
src/
├─ app/                 application composition and navigation
├─ components/
│  ├─ ui/               reusable shadcn-style source components
│  └─ icons/            single Lucide icon entry point
├─ domain/movie/        movie-domain public types
├─ features/
│  ├─ director/         idea expansion and director proposal
│  ├─ generation/       video-provider boundary
│  ├─ projects/         project persistence and local files
│  └─ timeline/         editing and playback rules
├─ lib/                 low-level implementations and utilities
└─ types.ts             compatibility entry point for existing modules
```

Rules:

- UI code imports icons only from `@/components/icons`.
- Reusable controls live in `@/components/ui`; feature-specific markup stays inside its feature.
- Screens consume feature public entry points instead of provider implementations.
- External services remain behind a feature or service boundary; never call them directly from a reusable UI component.
- New feature folders expose a small `index.ts` public API.

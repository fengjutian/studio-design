# Video provider adapters

The studio treats video generation as a provider-neutral workflow. Project, shot,
timeline, continuity and export code must not call a vendor API directly.

## Add a provider

1. Add a `ProviderDefinition` to `src/lib/providerRegistry.ts`. Declare every
   model and its capabilities, durations and resolutions.
2. Implement the `VideoProvider` interface in a provider module.
3. Register the adapter with `registerVideoProvider(adapter)` during application
   startup.
4. Keep vendor request, polling and response parsing inside the adapter. Return
   the common `GenerateResult` shape.
5. Add backend commands only for operations that require secrets, local file
   access or unrestricted network access. Do not leak vendor concepts into the
   timeline or editor.

```ts
export const exampleProvider: VideoProvider = {
  id: "example",
  async generate(input) {
    // Translate the common input into the vendor request, poll it, download the
    // result when the project has a local path, then return common identifiers.
    return { taskId: "vendor-task-id", videoUrl: "https://..." };
  },
};
```

The settings UI is generated from the registry. Unsupported capabilities remain
visible but inactive so users can compare models before selecting one.

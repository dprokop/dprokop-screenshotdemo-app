// Local type augmentation for the Panel Screenshot API.
//
// Why: at runtime, Grafana provides @grafana/runtime (the worktree version) which
// already exports getPanelScreenshotService. The published @grafana/runtime that
// npm pulls into this plugin's node_modules is older and lacks the export.
// The plugin marks @grafana/runtime as a webpack external, so the version in
// node_modules is only used for typecheck. We augment the existing module here
// so TypeScript sees the new symbol without dropping the rest of the module's
// exports.
//
// Mirror of:
//   packages/grafana-runtime/src/services/PanelScreenshotService.ts
// in the feat-panel-screenshot-api worktree.

// Importing-then-augmenting is the syntax that *adds* to a module rather than
// replacing it. Without the leading import this file would shadow the entire
// '@grafana/runtime' / '@grafana/data' typings.
import '@grafana/runtime';
import '@grafana/data';

declare module '@grafana/runtime' {
  export interface PanelScreenshotOptions {
    format?: 'png' | 'jpeg' | 'webp';
  }

  export interface PanelScreenshotService {
    capture(panelKey: string, options?: PanelScreenshotOptions): Promise<Blob>;
  }

  export function getPanelScreenshotService(): PanelScreenshotService;
}

// Note on PluginExtensionPanelContext:
// It's exported from @grafana/data as a `type` alias, not an `interface`.
// Module augmentation can extend interfaces but not type aliases, so we
// re-export an extended local context from `./extended-types.ts` instead.

import type { PluginExtensionPanelContext } from '@grafana/data';

// PluginExtensionPanelContext is exported as a `type` alias from @grafana/data,
// which cannot be extended via TypeScript module augmentation. We compose the
// added `panelKey` field locally instead. The shape mirrors the worktree
// addition in packages/grafana-data/src/types/pluginExtensions.ts:281.
export type PanelScreenshotContext = PluginExtensionPanelContext & {
  panelKey: string;
};

import type { PluginExtensionPanelContext } from '@grafana/data';

// PluginExtensionPanelContext is exported as a `type` alias from @grafana/data,
// which cannot be extended via TypeScript module augmentation. We compose the
// added `panelPathId` field locally instead. The shape mirrors the addition
// in packages/grafana-data/src/types/pluginExtensions.ts:282.
export type PanelScreenshotContext = PluginExtensionPanelContext & {
  panelPathId: string;
};

import React, { Suspense, lazy } from 'react';
import { AppPlugin, PluginExtensionPoints, type AppRootProps } from '@grafana/data';
import { LoadingPlaceholder } from '@grafana/ui';
import type { AppConfigProps } from './components/AppConfig/AppConfig';
import { ScreenshotModal } from './components/ScreenshotModal/ScreenshotModal';
import type { PanelScreenshotContext } from './types/extended-types';

const LazyApp = lazy(() => import('./components/App/App'));
const LazyAppConfig = lazy(() => import('./components/AppConfig/AppConfig'));

const App = (props: AppRootProps) => (
  <Suspense fallback={<LoadingPlaceholder text="" />}>
    <LazyApp {...props} />
  </Suspense>
);

const AppConfig = (props: AppConfigProps) => (
  <Suspense fallback={<LoadingPlaceholder text="" />}>
    <LazyAppConfig {...props} />
  </Suspense>
);

export const plugin = new AppPlugin<{}>()
  .setRootPage(App)
  .addConfigPage({
    title: 'Configuration',
    icon: 'cog',
    body: AppConfig,
    id: 'configuration',
  })
  .addLink<PanelScreenshotContext>({
    title: 'Take screenshot (demo)',
    description: 'Demo of the new @grafana/runtime panel screenshot API',
    icon: 'camera',
    targets: [PluginExtensionPoints.DashboardPanelMenu],
    onClick: (_event, helpers) => {
      const context = helpers.context;
      if (!context) {
        return;
      }
      helpers.openModal({
        title: `Panel screenshot - ${context.title ?? 'panel'}`,
        body: ({ onDismiss }) => <ScreenshotModal context={context} onDismiss={onDismiss} />,
        width: 760,
      });
    },
  });

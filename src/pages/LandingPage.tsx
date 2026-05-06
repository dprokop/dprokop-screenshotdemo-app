import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { getPanelScreenshotService, PluginPage } from '@grafana/runtime';
import {
  EmbeddedScene,
  SceneFlexItem,
  SceneFlexLayout,
  SceneQueryRunner,
  SceneTimeRange,
  VizPanel,
} from '@grafana/scenes';
import { Alert, Button, Field, Select, useStyles2 } from '@grafana/ui';

type Format = 'png' | 'jpeg' | 'webp';

const FORMAT_OPTIONS: Array<{ label: string; value: Format }> = [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WebP', value: 'webp' },
];

function LandingPage() {
  const s = useStyles2(getStyles);
  const [format, setFormat] = useState<Format>('png');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const urlRef = useRef<string | null>(null);

  const { scene, vizPanel } = useMemo(() => {
    const queryRunner = new SceneQueryRunner({
      datasource: { type: 'grafana-testdata-datasource' },
      queries: [{ refId: 'A', scenarioId: 'random_walk' }],
    });

    const panel = new VizPanel({
      pluginId: 'timeseries',
      title: 'Random walk',
      $data: queryRunner,
    });

    const embeddedScene = new EmbeddedScene({
      $timeRange: new SceneTimeRange({ from: 'now-1h', to: 'now' }),
      body: new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            minHeight: 280,
            body: panel,
          }),
        ],
      }),
    });

    return { scene: embeddedScene, vizPanel: panel };
  }, []);

  useEffect(() => {
    const deactivate = scene.activate();
    return () => {
      deactivate();
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, [scene]);

  const handleCapture = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const pathId = vizPanel.getPathId();
      // sceneContext is added in grafana/grafana#124045 — cast until published types catch up
      const blob = await getPanelScreenshotService().capture(pathId, {
        sceneContext: scene,
        format,
      } as Parameters<ReturnType<typeof getPanelScreenshotService>['capture']>[1]);
      const url = URL.createObjectURL(blob);
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
      urlRef.current = url;
      setObjectUrl(url);
    } catch (err) {
      setObjectUrl(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [vizPanel, scene, format]);

  return (
    <PluginPage>
      <h2>Self-contained scene demo</h2>
      <p>
        This page renders its own scene with a VizPanel, then captures it via the explicit{' '}
        <code>sceneContext</code> API path. No external dashboard needed -{' '}
        <code>getPanelScreenshotService().capture(vizPanel.getPathId(), {'{ sceneContext: scene }'})</code>.
      </p>

      <div className={s.sceneContainer}>
        <scene.Component model={scene} />
      </div>

      <div className={s.controls}>
        <Field label="Format">
          <Select
            options={FORMAT_OPTIONS}
            value={format}
            onChange={(opt) => opt?.value && setFormat(opt.value)}
            width={20}
          />
        </Field>
        <Button onClick={handleCapture} disabled={loading}>
          {loading ? 'Capturing...' : 'Capture'}
        </Button>
      </div>

      {error && (
        <Alert title="Capture failed" severity="error">
          <pre className={s.errorPre}>{error}</pre>
        </Alert>
      )}

      {objectUrl && !error && (
        <div className={s.result}>
          <img src={objectUrl} alt="Panel screenshot" className={s.screenshot} />
        </div>
      )}
    </PluginPage>
  );
}

export default LandingPage;

const getStyles = (theme: GrafanaTheme2) => ({
  sceneContainer: css`
    height: 320px;
    width: 100%;
    margin-bottom: ${theme.spacing(3)};
  `,
  controls: css`
    display: flex;
    align-items: flex-end;
    gap: ${theme.spacing(2)};
    flex-wrap: wrap;
    margin-bottom: ${theme.spacing(3)};
  `,
  errorPre: css`
    margin: 0;
    font-family: ${theme.typography.fontFamilyMonospace};
    font-size: ${theme.typography.bodySmall.fontSize};
    white-space: pre-wrap;
    word-break: break-all;
    user-select: all;
  `,
  result: css`
    margin-top: ${theme.spacing(2)};
  `,
  screenshot: css`
    max-width: 100%;
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
  `,
});

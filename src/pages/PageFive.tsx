import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { getPanelScreenshotService, PluginPage } from '@grafana/runtime';
import { Alert, Button, Field, Input, Select, useStyles2 } from '@grafana/ui';

type Format = 'png' | 'jpeg' | 'webp';

const FORMAT_OPTIONS: Array<{ label: string; value: Format }> = [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WebP', value: 'webp' },
];

const CODE_SNIPPET = `import { getPanelScreenshotService } from '@grafana/runtime';

const blob = await getPanelScreenshotService().capture(panelPathId, {
  format: 'png',
  // sceneContext: this,  // pass a SceneObject if you have one
});`;

function PageFive() {
  const s = useStyles2(getStyles);
  const [panelPathId, setPanelPathId] = useState('');
  const [format, setFormat] = useState<Format>('png');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, []);

  const handleCapture = useCallback(async () => {
    if (!panelPathId.trim()) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const blob = await getPanelScreenshotService().capture(panelPathId.trim(), { format });
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
  }, [panelPathId, format]);

  return (
    <PluginPage>
      <h2>Direct API</h2>
      <p>
        This page demonstrates calling <code>getPanelScreenshotService().capture(panelPathId, options)</code> directly.
        No plugin extension framework involved.
      </p>

      <pre className={s.codeBlock}>{CODE_SNIPPET}</pre>

      <div className={s.instructions}>
        <ol>
          <li>
            Open a Grafana dashboard <strong>in this same tab</strong>.
          </li>
          <li>
            Open DevTools, find a panel&apos;s <code>data-viz-panel-id</code> attribute on its{' '}
            <code>&lt;div&gt;</code> element.
          </li>
          <li>Paste the value below and click <strong>Capture</strong>.</li>
        </ol>
      </div>

      <div className={s.form}>
        <Field label="panelPathId">
          <Input
            value={panelPathId}
            onChange={(e) => setPanelPathId(e.currentTarget.value)}
            placeholder="e.g. panel-12"
            width={40}
          />
        </Field>

        <Field label="Format">
          <Select
            options={FORMAT_OPTIONS}
            value={format}
            onChange={(opt) => opt?.value && setFormat(opt.value)}
            width={20}
          />
        </Field>

        <Button onClick={handleCapture} disabled={loading || !panelPathId.trim()}>
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

export default PageFive;

const getStyles = (theme: GrafanaTheme2) => ({
  codeBlock: css`
    background: ${theme.colors.background.secondary};
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    padding: ${theme.spacing(2)};
    font-family: ${theme.typography.fontFamilyMonospace};
    font-size: ${theme.typography.bodySmall.fontSize};
    white-space: pre;
    overflow-x: auto;
    margin-bottom: ${theme.spacing(3)};
  `,
  instructions: css`
    background: ${theme.colors.background.secondary};
    border-left: 3px solid ${theme.colors.primary.border};
    padding: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(3)};
    border-radius: 0 ${theme.shape.radius.default} ${theme.shape.radius.default} 0;

    ol {
      margin: 0;
      padding-left: ${theme.spacing(3)};
    }

    li {
      margin-bottom: ${theme.spacing(0.5)};
    }
  `,
  form: css`
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

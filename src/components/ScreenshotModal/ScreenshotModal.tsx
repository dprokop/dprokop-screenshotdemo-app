import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { AppEvents, type GrafanaTheme2 } from '@grafana/data';
import { getAppEvents, getPanelScreenshotService } from '@grafana/runtime';
import { Button, ButtonGroup, LoadingPlaceholder, Stack, useStyles2 } from '@grafana/ui';
import type { PanelScreenshotContext } from '../../types/extended-types';

type Format = 'png' | 'jpeg' | 'webp';

const FORMATS: Format[] = ['png', 'jpeg', 'webp'];

const MIME: Record<Format, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

interface Props {
  context: PanelScreenshotContext;
  // openModal in @grafana/data passes onDismiss to the body component.
  // Unused inside the modal body itself - the wrapper Modal owns dismiss.
  onDismiss?: () => void;
}

export const ScreenshotModal = ({ context }: Props) => {
  const styles = useStyles2(getStyles);
  const [format, setFormat] = useState<Format>('png');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  // Track the currently mounted object URL so we revoke on replace / unmount.
  const urlRef = useRef<string | null>(null);

  const capture = useCallback(
    async (next: Format) => {
      setLoading(true);
      setError(null);
      try {
        const captured = await getPanelScreenshotService().capture(context.panelPathId, { format: next });
        const url = URL.createObjectURL(captured);

        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
        }
        urlRef.current = url;

        setBlob(captured);
        setObjectUrl(url);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        getAppEvents().publish({
          type: AppEvents.alertError.name,
          payload: ['Screenshot failed', message],
        });
      } finally {
        setLoading(false);
      }
    },
    [context.panelPathId]
  );

  // Initial capture + recapture on format change.
  useEffect(() => {
    capture(format);
  }, [format, capture]);

  // Revoke the last object URL on unmount.
  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  const onCopyDataUrl = useCallback(async () => {
    if (!blob) {
      return;
    }
    try {
      const dataUrl = await blobToDataUrl(blob);
      await navigator.clipboard.writeText(dataUrl);
      getAppEvents().publish({
        type: AppEvents.alertSuccess.name,
        payload: ['Data URL copied to clipboard'],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      getAppEvents().publish({
        type: AppEvents.alertError.name,
        payload: ['Copy failed', message],
      });
    }
  }, [blob]);

  const downloadName = `${slug(context.title || 'panel')}.${format}`;

  // Note: this component is the *body* of a Modal opened by helpers.openModal.
  // The host wraps us in <Modal title=... onDismiss=...>, so we render contents
  // only - no nested Modal here.
  return (
    <Stack direction="column" gap={2}>
      <ButtonGroup>
        {FORMATS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={f === format ? 'primary' : 'secondary'}
            onClick={() => setFormat(f)}
            disabled={loading}
          >
            {f.toUpperCase()}
          </Button>
        ))}
      </ButtonGroup>

      <div className={styles.preview}>
        {loading && <LoadingPlaceholder text={`Capturing ${format.toUpperCase()}...`} />}
        {!loading && error && <div className={styles.error}>Error: {error}</div>}
        {!loading && !error && objectUrl && (
          <img src={objectUrl} alt={`Screenshot of ${context.title ?? 'panel'}`} className={styles.image} />
        )}
      </div>

      <Stack direction="row" gap={1} justifyContent="flex-end">
        <Button variant="secondary" onClick={onCopyDataUrl} disabled={!blob || loading}>
          Copy as data URL
        </Button>
        <a
          href={objectUrl ?? undefined}
          download={downloadName}
          // Disable the anchor visually when there's nothing to download.
          className={!objectUrl || loading ? styles.disabledAnchor : undefined}
          aria-disabled={!objectUrl || loading}
        >
          <Button variant="primary" disabled={!objectUrl || loading} icon="download-alt">
            {`Download ${format.toUpperCase()}`}
          </Button>
        </a>
      </Stack>

      <div className={styles.meta}>
        panelPathId: <code>{context.panelPathId}</code>
        {blob && (
          <>
            {' · '}
            size: <code>{(blob.size / 1024).toFixed(1)} KB</code>
            {' · '}
            type: <code>{blob.type || MIME[format]}</code>
          </>
        )}
      </div>
    </Stack>
  );
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader returned non-string result'));
      }
    };
    reader.readAsDataURL(blob);
  });
}

function slug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'panel'
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  preview: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '240px',
    padding: theme.spacing(1),
    border: `1px solid ${theme.colors.border.weak}`,
    background: theme.colors.background.secondary,
    borderRadius: theme.shape.radius.default,
  }),
  image: css({
    maxWidth: '100%',
    maxHeight: '60vh',
    display: 'block',
  }),
  error: css({
    color: theme.colors.error.text,
    fontFamily: theme.typography.fontFamilyMonospace,
    fontSize: theme.typography.bodySmall.fontSize,
    whiteSpace: 'pre-wrap',
  }),
  meta: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    fontFamily: theme.typography.fontFamilyMonospace,
  }),
  disabledAnchor: css({
    pointerEvents: 'none',
    opacity: 0.6,
  }),
});

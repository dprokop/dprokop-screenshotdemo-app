# Screenshot Demo (dprokop-screenshotdemo-app)

Local test harness for the new Panel Screenshot API on `@grafana/runtime`. Validates the
end-to-end flow: panel-menu extension link -> `getPanelScreenshotService().capture()` ->
modal preview with PNG/JPEG/WebP toggle and download/copy actions.

Not for distribution. Only meaningful when paired with the
`feat-panel-screenshot-api` worktree of `grafana/grafana`, which provides the runtime
service implementation and the `panelKey` field on `PluginExtensionPanelContext`.

Design doc: [Panel Screenshot API](../../../Documents/Lost%20Memos/Work/Design%20Docs/Panel%20Screenshot%20API.md)

## What it does

- Registers an "added link" extension at `grafana/dashboard/panel/menu` titled
  "Take screenshot (demo)" with the `camera` icon.
- On click: calls `getPanelScreenshotService().capture(ctx.panelKey, { format })` and
  opens a Grafana `<Modal>` with:
  - the Blob rendered via `URL.createObjectURL` (revoked on unmount and on format
    re-capture)
  - a PNG / JPEG / WebP toggle that re-captures on click
  - a "Download" button (anchor with `download` attribute)
  - a "Copy as data URL" button (FileReader -> `navigator.clipboard.writeText`)
  - panelKey + Blob size + MIME type echoed for sanity check
- On capture failure: dispatches `AppEvents.alertError` via `getAppEvents().publish`.

## How the runtime API is wired

The published `@grafana/runtime` (12.4.2 here) does not yet expose
`getPanelScreenshotService`. Two facts make this work anyway:

1. The webpack scaffolder marks `@grafana/runtime`, `@grafana/data`, and `@grafana/ui`
   as **externals**. The plugin bundle never contains them - it imports them from the
   host Grafana at runtime.
2. The host Grafana is the `feat-panel-screenshot-api` worktree, whose `@grafana/runtime`
   does export `getPanelScreenshotService`.

To make the typecheck happy, the plugin ships a small local module augmentation in
`src/types/grafana-runtime-augment.d.ts` and a composed `PanelScreenshotContext` type
in `src/types/extended-types.ts`. These mirror the worktree definitions exactly. Both
files have a comment at the top explaining what they do and where to delete them once
the worktree's API ships in a published `@grafana/runtime`.

## Build

```bash
npm install
npm run dev      # watch mode for development (recommended)
npm run build    # one-shot production build
```

The output lands in `./dist/`.

## Install into the local Grafana worktree

The plugin is installed via path-loading. It does **not** need signing.

### 1. Snippet to add to the worktree's `conf/custom.ini`

In `~/Projects/worktrees/feat-panel-screenshot-api/conf/custom.ini`:

```ini
[paths]
plugins = /Users/dominik/grafana-dev-plugins

[plugins]
allow_loading_unsigned_plugins = dprokop-screenshotdemo-app
```

> Do not check this snippet into the worktree. It's developer-local config.

### 2. Create the plugins directory and symlink the build

```bash
mkdir -p ~/grafana-dev-plugins
ln -s "$HOME/Projects/worktrees/screenshot-demo-plugin/dprokop-screenshotdemo-app/dist" \
      "$HOME/grafana-dev-plugins/dprokop-screenshotdemo-app"
```

### 3. Restart Grafana frontend

After the first install, restart `make run` (or whatever you use). Subsequent rebuilds
via `npm run dev` are picked up by browser refresh.

### 4. Enable the plugin

Open Grafana -> Administration -> Plugins -> search "Screenshot Demo" -> Enable.

### 5. Use it

Open any dashboard. Panel menu -> "Take screenshot (demo)". The modal renders the
captured image. Toggle PNG/JPEG/WebP to validate all three format paths, download the
file, or copy as data URL.

## Plugin id

`dprokop-screenshotdemo-app`

The `@grafana/create-plugin` scaffolder normalises the id as
`{org}-{name}-{type}`, lowercased, non-alphanumerics stripped. To get an id that
contains the literal `screenshotdemoapp` segment you would have to bypass the
scaffolder. We accepted `dprokop-screenshotdemo-app` as the closest natural fit that
still passes the scaffolder's id validation.

## Files of interest

| Path                                            | Purpose                                              |
| ----------------------------------------------- | ---------------------------------------------------- |
| `src/plugin.json`                               | Plugin metadata + extension link declaration         |
| `src/module.tsx`                                | `addLink` registration + onClick that opens the modal |
| `src/components/ScreenshotModal/ScreenshotModal.tsx` | Modal: capture + preview + format toggle + actions  |
| `src/types/grafana-runtime-augment.d.ts`        | Local types for `getPanelScreenshotService`          |
| `src/types/extended-types.ts`                   | `PanelScreenshotContext` (panelKey added)            |

## Removing once the API ships

When `getPanelScreenshotService` is exported from the published `@grafana/runtime`:

1. Delete `src/types/grafana-runtime-augment.d.ts`.
2. Replace `PanelScreenshotContext` in `src/types/extended-types.ts` with a re-export
   of `PluginExtensionPanelContext` from `@grafana/data`.
3. Bump the `@grafana/runtime` and `@grafana/data` deps to versions that include the
   API.

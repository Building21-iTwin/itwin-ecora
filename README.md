<div align="center">
	<picture>
		<source media='(prefers-color-scheme: dark)' srcset='https://itwin.github.io/iTwinUI/logo-dark.svg' />
		<img src='https://itwin.github.io/iTwinUI/logo.svg' alt='iTwin logo' height='70' />
	</picture>
	<h1>iTwin Ecora</h1>
	<p><strong>Zero‑code element & property exploration for iModel data.</strong></p>
	<sub>By Antonio Archer & Jamir Ong</sub>
</div>

---

## Overview

iTwin Ecora is a lightweight viewer that lets iTwin Platform users browse elements and inspect their stored property values in an iModel without writing ECSQL. Pick structural dimensions (Models, Categories, Schemas, Classes) and apply simple text filters to instantly refine the result set.

## Key Features

- Unified element table: IDs, class names, and resolved property values.
- One‑click filters for: Models, Categories, Schemas, Classes.
- Instant query generation; no manual ECSQL or joins to remember.

## How It Works (Brief)

1. Your selections & text inputs are stored in a context provider.
2. `elementQuery` builds the minimal ECSQL (only needed joins, only id + className projected).
3. The resulting element IDs drive Presentation’s unified selection which supplies table columns.
4. Column filters feed back into the query cycle for refinement.

## Prerequisites

- Node 20 (LTS)
- Valid iTwin + iModel IDs (and auth client config) 

## Quick Start

```sh
git clone https://github.com/Building21-iTwin/itwin-ecora.git
cd itwin-ecora
npm install
cp .env.example .env   # add auth + iTwin/iModel IDs
npm dev
```
Open http://localhost:3000

Runtime switch:
```
http://localhost:3000?iTwinId=<ITWIN_ID>&iModelId=<IMODEL_ID>
```

## Environment Variables

| Name | Purpose |
| ---- | ------- |
| IMJS_AUTH_CLIENT_CLIENT_ID | SPA OIDC client id |
| IMJS_AUTH_CLIENT_REDIRECT_URI | Redirect URI (must match registration) |
| IMJS_AUTH_CLIENT_LOGOUT_URI | Post logout redirect |
| IMJS_AUTH_CLIENT_SCOPES | Include `itwin-platform` |
| IMJS_ITWIN_ID | Default iTwin to open |
| IMJS_IMODEL_ID | Default iModel inside that iTwin |
| IMJS_BING_MAPS_KEY | Optional maps key |
| IMJS_CESIUM_ION_KEY | Optional Cesium terrain key |

## Scripts

| Command | Description |
| ------- | ----------- |
| npm dev | Start Vite dev server |
| npm build | Type check then production build |
| npm preview | Preview production bundle |
| npm lint | ESLint over sources |
| npm typecheck | TypeScript no‑emit check |

## Roadmap (Short)

- Numeric/date comparison operators.
- OR multi‑term column filtering.
- Optional saved filter presets.
- Export selected element set.

## License

See `LICENSE`.

---

Built with iTwin Platform APIs.

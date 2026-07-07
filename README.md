# Header Modifier

A Manifest V3 Chrome extension that injects custom **request headers** (e.g. `Authorization`, `X-API-Key`) on outgoing HTTP requests matching user-defined URL patterns.

## Features

- Add, edit, delete, and enable/disable header rules from the popup UI
- Rules persist via `chrome.storage.sync`
- Header values are masked in the UI (`••••••••`)
- Uses `declarativeNetRequest` (the correct MV3 API for header modification)

## Load the extension

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select this directory: `~/Projects/chrome-header-modifier`

## How to test

1. Click the extension icon in the toolbar to open the popup
2. Click **+ Add Rule** and configure:
   - **URL Pattern**: `*://httpbin.org/*`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer test-token`
   - Ensure **Enabled** is checked
3. Click **Save**
4. Visit [https://httpbin.org/headers](https://httpbin.org/headers)
5. The JSON response should include your injected header:

   ```json
   {
     "headers": {
       "Authorization": "Bearer test-token",
       ...
     }
   }
   ```

## Security notes

- Header values are stored in `chrome.storage.sync`, which Chrome encrypts locally. If Chrome Sync is enabled, data may sync to your Google account.
- **Do not** commit tokens or API keys to version control.
- Values are masked in the popup UI and only sent to matching requests at runtime.
- This extension makes **no external network calls** — all rules stay local.
- Only use this extension with tokens you trust to this device.

## Limitations

| Topic | Note |
|-------|------|
| Forbidden headers | Chrome blocks modifying some headers (e.g. `Cookie`, `Host`, `Origin`). `Authorization` and `X-API-Key` are allowed. |
| Rule limits | Max ~5000 dynamic rules (far more than needed for auth). |
| HTTPS only for some patterns | Match patterns must be valid Chrome match patterns; test with your target API domain. |
| `webRequest` API | Not used — blocked for most MV3 extensions; DNR is the correct MV3 path. |

## URL pattern format

Use [Chrome match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns):

| Pattern | Matches |
|---------|---------|
| `*://api.example.com/*` | Any scheme, `api.example.com`, any path |
| `https://api.example.com/*` | HTTPS only |
| `*://*.example.com/*` | Any subdomain of `example.com` |

## Project structure

```
chrome-header-modifier/
├── manifest.json       # MV3 manifest + permissions
├── background.js       # Sync storage → dynamic DNR rules
├── popup.html          # Rule management UI
├── popup.js            # CRUD for rules
├── popup.css           # Popup styling
├── icons/              # Extension icons (16, 48, 128)
└── README.md           # This file
```

## Rule data model

Rules are stored in `chrome.storage.sync` under the key `headerRules`:

```json
{
  "id": "rule-uuid",
  "enabled": true,
  "urlPattern": "*://api.example.com/*",
  "headerName": "Authorization",
  "headerValue": "Bearer eyJ..."
}
```

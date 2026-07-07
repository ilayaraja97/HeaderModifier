const MAX_RULES = 1000;
const STORAGE_KEY = 'headerRules';

/**
 * Convert a Chrome match pattern (e.g. *://api.example.com/*) to a DNR condition.
 * Uses regexFilter for full pattern fidelity across scheme, host, and path.
 */
function matchPatternToCondition(urlPattern) {
  const normalized = urlPattern === '<all_urls>' ? '*://*/*' : urlPattern;
  const parsed = parseMatchPattern(normalized);
  if (!parsed) {
    throw new Error(`Invalid URL pattern: ${urlPattern}`);
  }

  const { scheme, host, path } = parsed;

  let schemeRegex;
  if (scheme === '*') {
    schemeRegex = 'https?';
  } else if (scheme.includes('*')) {
    schemeRegex = wildcardToRegex(scheme);
  } else {
    schemeRegex = escapeRegex(scheme);
  }

  const hostRegex = wildcardToRegex(host);
  const pathRegex = wildcardToRegex(path);

  return {
    regexFilter: `^${schemeRegex}://${hostRegex}${pathRegex}$`,
    isUrlFilterCaseSensitive: false,
  };
}

function parseMatchPattern(pattern) {
  const match = pattern.match(/^(\*|https?|file|ftp):\/\/([^/]+)(\/.*)?$/);
  if (!match) {
    return null;
  }

  return {
    scheme: match[1],
    host: match[2],
    path: match[3] ?? '/',
  };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wildcardToRegex(str) {
  const parts = str.split('*').map(escapeRegex);
  return parts.join('.*');
}

function buildDnrRule(rule, ruleId) {
  const condition = matchPatternToCondition(rule.urlPattern);

  return {
    id: ruleId,
    priority: 1,
    condition: {
      ...condition,
      resourceTypes: [
        'main_frame',
        'sub_frame',
        'stylesheet',
        'script',
        'image',
        'font',
        'object',
        'xmlhttprequest',
        'ping',
        'csp_report',
        'media',
        'websocket',
        'webtransport',
        'webbundle',
        'other',
      ],
    },
    action: {
      type: 'modifyHeaders',
      requestHeaders: rule.headers.map(({ name, value }) => ({
        header: name,
        operation: 'set',
        value,
      })),
    },
  };
}

async function applyRules() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const headerRules = result[STORAGE_KEY] || [];

  const removeRuleIds = Array.from({ length: MAX_RULES }, (_, i) => i + 1);

  const addRules = headerRules
    .map((rule, index) => ({ rule, ruleId: index + 1 }))
    .filter(({ rule }) => rule.enabled && rule.headers && rule.headers.length > 0)
    .map(({ rule, ruleId }) => {
      try {
        return buildDnrRule(rule, ruleId);
      } catch (err) {
        console.error(`Skipping rule ${rule.id}:`, err.message);
        return null;
      }
    })
    .filter(Boolean);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });

  console.log(`Applied ${addRules.length} header rule(s)`);
}

chrome.runtime.onInstalled.addListener(() => {
  applyRules().catch((err) => console.error('Failed to apply rules on install:', err));
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[STORAGE_KEY]) {
    applyRules().catch((err) => console.error('Failed to apply rules on storage change:', err));
  }
});

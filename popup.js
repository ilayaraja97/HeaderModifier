const STORAGE_KEY = 'headerRules';
const MASKED_VALUE = '••••••••';

const listView = document.getElementById('list-view');
const formView = document.getElementById('form-view');
const rulesList = document.getElementById('rules-list');
const emptyState = document.getElementById('empty-state');
const ruleForm = document.getElementById('rule-form');
const formTitle = document.getElementById('form-title');
const ruleIdInput = document.getElementById('rule-id');
const urlPatternInput = document.getElementById('url-pattern');
const headerPresetSelect = document.getElementById('header-preset');
const headerNameInput = document.getElementById('header-name');
const headerValueInput = document.getElementById('header-value');
const ruleEnabledInput = document.getElementById('rule-enabled');

document.getElementById('btn-add').addEventListener('click', () => showForm());
document.getElementById('btn-cancel').addEventListener('click', () => showList());
ruleForm.addEventListener('submit', handleSave);

headerPresetSelect.addEventListener('change', () => {
  if (headerPresetSelect.value === 'custom') {
    headerNameInput.classList.remove('hidden-input');
    headerNameInput.value = '';
    headerNameInput.focus();
  } else {
    headerNameInput.classList.add('hidden-input');
    headerNameInput.value = headerPresetSelect.value;
  }
});

function generateId() {
  return `rule-${crypto.randomUUID()}`;
}

async function getRules() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

async function saveRules(rules) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: rules });
}

function showList() {
  listView.classList.remove('hidden');
  formView.classList.add('hidden');
  ruleForm.reset();
  renderRules();
}

function showForm(rule) {
  listView.classList.add('hidden');
  formView.classList.remove('hidden');

  if (rule) {
    formTitle.textContent = 'Edit Rule';
    ruleIdInput.value = rule.id;
    urlPatternInput.value = rule.urlPattern;
    headerValueInput.value = rule.headerValue;
    ruleEnabledInput.checked = rule.enabled;

    const preset = ['Authorization', 'X-API-Key'].includes(rule.headerName)
      ? rule.headerName
      : 'custom';

    headerPresetSelect.value = preset;
    if (preset === 'custom') {
      headerNameInput.classList.remove('hidden-input');
      headerNameInput.value = rule.headerName;
    } else {
      headerNameInput.classList.add('hidden-input');
      headerNameInput.value = rule.headerName;
    }
  } else {
    formTitle.textContent = 'Add Rule';
    ruleIdInput.value = '';
    headerPresetSelect.value = 'Authorization';
    headerNameInput.classList.add('hidden-input');
    headerNameInput.value = 'Authorization';
    ruleEnabledInput.checked = true;
  }
}

async function renderRules() {
  const rules = await getRules();
  rulesList.innerHTML = '';

  if (rules.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  rules.forEach((rule) => {
    const li = document.createElement('li');
    li.className = `rule-card${rule.enabled ? '' : ' disabled'}`;

    li.innerHTML = `
      <div class="rule-card-header">
        <span class="rule-status ${rule.enabled ? 'enabled' : 'disabled'}">
          ${rule.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      <div class="rule-url">${escapeHtml(rule.urlPattern)}</div>
      <div class="rule-header">
        ${escapeHtml(rule.headerName)}: <span class="rule-value-masked">${MASKED_VALUE}</span>
      </div>
      <div class="rule-actions">
        <button type="button" class="btn btn-icon btn-edit">Edit</button>
        <button type="button" class="btn btn-icon btn-toggle">${rule.enabled ? 'Disable' : 'Enable'}</button>
        <button type="button" class="btn btn-danger btn-delete">Delete</button>
      </div>
    `;

    li.querySelector('.btn-edit').addEventListener('click', () => showForm(rule));
    li.querySelector('.btn-toggle').addEventListener('click', () => toggleRule(rule.id));
    li.querySelector('.btn-delete').addEventListener('click', () => deleteRule(rule.id));

    rulesList.appendChild(li);
  });
}

async function handleSave(e) {
  e.preventDefault();

  const headerName = headerPresetSelect.value === 'custom'
    ? headerNameInput.value.trim()
    : headerPresetSelect.value;

  if (!headerName) {
    alert('Header name is required.');
    return;
  }

  const ruleData = {
    id: ruleIdInput.value || generateId(),
    enabled: ruleEnabledInput.checked,
    urlPattern: urlPatternInput.value.trim(),
    headerName,
    headerValue: headerValueInput.value,
  };

  if (!isValidMatchPattern(ruleData.urlPattern)) {
    alert('Invalid URL pattern. Use Chrome match pattern format, e.g. *://api.example.com/*');
    return;
  }

  const rules = await getRules();
  const existingIndex = rules.findIndex((r) => r.id === ruleData.id);

  if (existingIndex >= 0) {
    rules[existingIndex] = ruleData;
  } else {
    rules.push(ruleData);
  }

  await saveRules(rules);
  showList();
}

async function toggleRule(id) {
  const rules = await getRules();
  const rule = rules.find((r) => r.id === id);
  if (rule) {
    rule.enabled = !rule.enabled;
    await saveRules(rules);
    renderRules();
  }
}

async function deleteRule(id) {
  if (!confirm('Delete this rule?')) {
    return;
  }

  const rules = await getRules();
  await saveRules(rules.filter((r) => r.id !== id));
  renderRules();
}

function isValidMatchPattern(pattern) {
  return /^(\*|https?|file|ftp):\/\/([^/]+)(\/.*)?$/.test(pattern);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

headerNameInput.classList.add('hidden-input');
renderRules();

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
const headersList = document.getElementById('headers-list');
const ruleEnabledInput = document.getElementById('rule-enabled');

document.getElementById('btn-add').addEventListener('click', () => showForm());
document.getElementById('btn-cancel').addEventListener('click', () => showList());
document.getElementById('btn-add-header').addEventListener('click', () => addHeaderRow());
ruleForm.addEventListener('submit', handleSave);

function addHeaderRow(name = '', value = '') {
  const row = document.createElement('div');
  row.className = 'header-row';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'header-name-input';
  nameInput.placeholder = 'Header name';
  nameInput.value = name;

  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.className = 'header-value-input';
  valueInput.placeholder = 'Header value';
  valueInput.autocomplete = 'off';
  valueInput.value = value;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove-header';
  removeBtn.title = 'Remove header';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => row.remove());

  row.append(nameInput, valueInput, removeBtn);
  headersList.appendChild(row);
}

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

  headersList.innerHTML = '';

  if (rule) {
    formTitle.textContent = 'Edit Rule';
    ruleIdInput.value = rule.id;
    urlPatternInput.value = rule.urlPattern;
    ruleEnabledInput.checked = rule.enabled;
    rule.headers.forEach(({ name, value }) => addHeaderRow(name, value));
  } else {
    formTitle.textContent = 'Add Rule';
    ruleIdInput.value = '';
    ruleEnabledInput.checked = true;
    addHeaderRow('Authorization');
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
      ${rule.headers.map((h) => `
      <div class="rule-header">
        ${escapeHtml(h.name)}: <span class="rule-value-masked">${MASKED_VALUE}</span>
      </div>`).join('')}
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

  const headers = Array.from(headersList.querySelectorAll('.header-row'))
    .map((row) => ({
      name: row.querySelector('.header-name-input').value.trim(),
      value: row.querySelector('.header-value-input').value,
    }))
    .filter((h) => h.name);

  if (headers.length === 0) {
    alert('At least one header name is required.');
    return;
  }

  const ruleData = {
    id: ruleIdInput.value || generateId(),
    enabled: ruleEnabledInput.checked,
    urlPattern: urlPatternInput.value.trim(),
    headers,
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
  if (pattern === '<all_urls>') {
    return true;
  }
  return /^(\*|https?|file|ftp):\/\/([^/]+)(\/.*)?$/.test(pattern);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

renderRules();

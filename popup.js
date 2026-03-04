const HISTORY_KEY = 'uplus_course_history';
const COURSE_URL_REGEX = /^https:\/\/www\.udemy\.com\/course\/[^/]+\//;

const quickActions = document.getElementById('quick-actions');
const openCourseBtn = document.getElementById('open-course');
const contextHint = document.getElementById('context-hint');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');

const openSettingsBtn = document.getElementById('open-settings');
const openShortcutsBtn = document.getElementById('open-shortcuts');

function getStorage(key) {
  return chrome.storage.local.get(key).then(result => result[key]);
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function renderHistory(items) {
  historyList.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    historyEmpty.classList.remove('hidden');
    return;
  }

  historyEmpty.classList.add('hidden');

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const btn = document.createElement('button');
    const title = document.createElement('span');
    const meta = document.createElement('span');

    title.className = 'title';
    meta.className = 'meta';

    title.textContent = item.title || item.url;
    meta.textContent = `${item.url} | ${new Date(item.visitedAt).toLocaleString()}`;

    btn.appendChild(title);
    btn.appendChild(meta);
    btn.addEventListener('click', async () => {
      await chrome.tabs.create({ url: item.url });
      window.close();
    });

    li.appendChild(btn);
    historyList.appendChild(li);
  });
}

async function setupQuickAction() {
  const activeTab = await getActiveTab();
  const activeUrl = activeTab?.url || '';

  if (COURSE_URL_REGEX.test(activeUrl)) {
    quickActions.classList.add('hidden');
    return;
  }

  quickActions.classList.remove('hidden');
  openCourseBtn.textContent = 'Go to Udemy';
  contextHint.textContent = 'Not on Udemy right now. Click to open the site.';
  openCourseBtn.onclick = async () => {
    await chrome.tabs.create({ url: 'https://www.udemy.com/' });
    window.close();
  };
}

openSettingsBtn.addEventListener('click', async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
});

openShortcutsBtn.addEventListener('click', async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL('shortcuts.html') });
});

async function init() {
  await setupQuickAction();
  const history = (await getStorage(HISTORY_KEY)) || [];
  renderHistory(history);
}

init();

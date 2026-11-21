const $ = (s) => document.querySelector(s);
const ORDER = ['VALIDATING', 'REQUESTING', 'SAVING', 'DONE'];
const ACTIVE = ['VALIDATING', 'REQUESTING', 'SAVING'];
const BEE_ORIGIN = 'https://platform.beeknoee.com';
const LABEL = {
  IDLE: 'Sẵn sàng', VALIDATING: 'Kiểm tra', REQUESTING: 'Đang tạo ảnh',
  SAVING: 'Đang lưu', DONE: 'Đã lưu', ERROR: 'Lỗi', CANCELLED: 'Đã hủy'
};
const DEFAULTS = {
  apiKey: '', baseUrl: BEE_ORIGIN, model: 'recraft/recraft-v4.1-flash-v2',
  aspect: '1:1', folder: 'AI-Images', draft: ''
};

const send = (msg) => chrome.runtime.sendMessage(msg);

function render(job = { state: 'IDLE' }, preview) {
  const state = job.state;
  const chip = $('#chip');
  chip.textContent = LABEL[state];
  chip.dataset.state = state;

  const reached = state === 'ERROR' ? ORDER.indexOf(job.failedAt) : ORDER.indexOf(state);
  document.querySelectorAll('#steps li').forEach((li) => {
    const i = ORDER.indexOf(li.dataset.step);
    li.className = '';
    if (state === 'IDLE' || state === 'CANCELLED') return;
    if (state === 'DONE') li.classList.add('done');
    else if (i < reached) li.classList.add('done');
    else if (i === reached) li.classList.add(state === 'ERROR' ? 'failed' : 'current', ...(state === 'ERROR' ? [] : ['pulse']));
  });

  const busy = ACTIVE.includes(state);
  $('#generate').disabled = busy;
  $('#prompt').disabled = busy;
  $('#cancel').hidden = state !== 'REQUESTING';

  const elapsed = $('#elapsed');
  elapsed.hidden = !(state === 'REQUESTING' && job.elapsed);
  elapsed.textContent = job.elapsed ? `Đã chờ ${job.elapsed} giây…` : '';

  const err = $('#error');
  err.hidden = state !== 'ERROR';
  err.textContent = job.error ?? '';

  const done = state === 'DONE';
  $('#result').hidden = !done;
  if (done) {
    $('#savedTo').textContent = job.savedTo ?? '';
    $('#preview').hidden = !preview;
    if (preview) $('#preview').src = preview;
    const cost = $('#cost');
    cost.hidden = job.cost == null;
    cost.textContent = job.cost == null ? '' : `Chi phí: ${Number(job.cost).toLocaleString('vi-VN')}đ`;
  }
  if (job.prompt && $('#prompt').value === '') $('#prompt').value = job.prompt;
}

async function refresh() {
  const { job, preview } = await chrome.storage.session.get(['job', 'preview']);
  render(job, preview);
}

async function init() {
  const s = await chrome.storage.local.get(DEFAULTS);
  for (const k of ['apiKey', 'baseUrl', 'model', 'folder']) $('#' + k).value = s[k];
  $('#aspect').value = s.aspect;
  $('#prompt').value = s.draft;
  if (!s.apiKey) $('#settings').open = true;
  await refresh();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session') refresh();
  if (area === 'local' && changes.history) renderHistory();
});

$('#prompt').addEventListener('input', (e) => chrome.storage.local.set({ draft: e.target.value }));
$('#aspect').addEventListener('change', (e) => chrome.storage.local.set({ aspect: e.target.value }));

$('#generate').addEventListener('click', async () => {
  await chrome.storage.local.set({ aspect: $('#aspect').value });
  await send({ type: 'START', prompt: $('#prompt').value });
});
$('#cancel').addEventListener('click', () => send({ type: 'CANCEL' }));
$('#again').addEventListener('click', async () => {
  $('#prompt').value = '';
  chrome.storage.local.set({ draft: '' });
  await send({ type: 'RESET' });
});

$('#save').addEventListener('click', async () => {
  const msg = $('#saveMsg');
  const show = (text, bad) => { msg.hidden = false; msg.textContent = text; msg.classList.toggle('bad', !!bad); };
  let origin;
  try {
    const url = new URL($('#baseUrl').value.trim());
    if (url.protocol !== 'https:') throw new Error();
    origin = url.origin;
  } catch { return show('Base URL phải là URL https hợp lệ.', true); }

  if (origin !== BEE_ORIGIN) {
    const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
    if (!granted) return show('Cần cấp quyền truy cập domain này để gọi API.', true);
  }
  await chrome.storage.local.set({
    apiKey: $('#apiKey').value.trim(),
    baseUrl: origin,
    model: $('#model').value.trim(),
    folder: $('#folder').value.trim()
  });
  $('#baseUrl').value = origin;
  show('Đã lưu cài đặt.');
});

// ───────────────────────── Lịch sử ─────────────────────────
const historyState = { search: '', clearArmed: false };
const getHistory = async () => (await chrome.storage.local.get({ history: [] })).history;
const fmtDate = (ts) => new Date(ts).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}

function historyRow(item, fileExists) {
  const thumb = el('button', { type: 'button', className: 'h-thumb', disabled: !fileExists,
    title: fileExists ? 'Mở trong thư mục' : 'Không tìm thấy tệp' });
  thumb.setAttribute('aria-label', 'Mở ảnh trong thư mục');
  if (item.thumb) thumb.append(el('img', { src: item.thumb, alt: '' }));
  else thumb.textContent = 'Ảnh';
  thumb.addEventListener('click', () => chrome.downloads.show(item.downloadId));

  const cost = item.cost != null ? ` · ${Number(item.cost).toLocaleString('vi-VN')}đ` : '';
  const meta = el('div', {},
    el('p', { className: 'h-prompt', title: item.prompt, textContent: item.prompt }),
    el('p', { className: 'h-sub', textContent: `${fmtDate(item.createdAt)} · ${item.aspect}${cost}` }));
  if (!fileExists) meta.append(el('p', { className: 'h-miss', textContent: 'Không tìm thấy tệp (đã xóa hoặc di chuyển).' }));

  const reuse = el('button', { type: 'button', textContent: 'Dùng lại' });
  reuse.addEventListener('click', () => reuseItem(item));
  const del = el('button', { type: 'button', className: 'h-del', textContent: 'Xóa' });
  del.addEventListener('click', () => removeHistoryItem(item.id));

  return el('li', { className: 'h-item' }, thumb, el('div', { className: 'h-body' }, meta, el('div', { className: 'h-actions' }, reuse, del)));
}

async function renderHistory() {
  const all = await getHistory();
  $('#historyCount').textContent = all.length;
  if (!$('#history').open) return;

  const q = historyState.search.trim().toLowerCase();
  const items = q ? all.filter((i) => i.prompt.toLowerCase().includes(q)) : all;
  const empty = $('#historyEmpty');
  empty.hidden = items.length > 0;
  empty.textContent = all.length ? 'Không có kết quả khớp.' : 'Chưa có ảnh nào. Ảnh bạn tạo sẽ hiện ở đây.';
  $('#historyClear').hidden = all.length === 0;

  const exists = await Promise.all(items.map(async (i) => {
    try { const [d] = await chrome.downloads.search({ id: i.downloadId }); return Boolean(d) && d.exists !== false; }
    catch { return false; }
  }));
  $('#historyList').replaceChildren(...items.map((item, idx) => historyRow(item, exists[idx])));
}

async function reuseItem(item) {
  if ($('#prompt').disabled) return;
  $('#prompt').value = item.prompt;
  $('#aspect').value = item.aspect;
  await chrome.storage.local.set({ draft: item.prompt, aspect: item.aspect });
  $('#prompt').focus();
  window.scrollTo({ top: 0 });
}

async function removeHistoryItem(id) {
  const history = await getHistory();
  await chrome.storage.local.set({ history: history.filter((i) => i.id !== id) });
}

$('#history').addEventListener('toggle', renderHistory);
$('#historySearch').addEventListener('input', (e) => { historyState.search = e.target.value; renderHistory(); });
$('#historyClear').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  if (!historyState.clearArmed) {
    historyState.clearArmed = true;
    btn.textContent = 'Bấm lần nữa để xóa tất cả';
    setTimeout(() => { historyState.clearArmed = false; btn.textContent = 'Xóa tất cả lịch sử'; }, 3000);
    return;
  }
  historyState.clearArmed = false;
  btn.textContent = 'Xóa tất cả lịch sử';
  await chrome.storage.local.set({ history: [] });
});

init().then(renderHistory);

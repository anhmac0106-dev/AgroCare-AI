/* Authenticated UI. User and AI content is always rendered as text. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const PAGE_SIZE = 100;
  const JSON_EXPORT_LIMIT = 10000;
  const state = { client: null, session: null, user: null, quota: null, history: [], reviews: [], scope: '', epoch: 0, controller: new AbortController(), urls: new Set(), busy: false, authBusy: false, previewUrl: null, detection: 'idle', moreHistory: false, moreReviews: false };
  const text = (id, value) => { if ($(id)) $(id).textContent = value ?? ''; };
  const message = (value, error = false) => { text('appMessage', value); $('appMessage').classList.toggle('is-error', error); };
  const node = (tag, value, className) => { const el = document.createElement(tag); el.textContent = value ?? ''; if (className) el.className = className; return el; };
  const dateText = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN'); };
  const scoped = url => state.scope ? `${url}?scope=all` : url;
  const own = item => item.user_id === state.user?.id;
  function active(epoch) { if (epoch !== state.epoch) throw new DOMException('Session changed', 'AbortError'); }
  function releaseImages() { state.urls.forEach(url => URL.revokeObjectURL(url)); state.urls.clear(); }
  function clearPrivate() {
    state.controller.abort(); state.controller = new AbortController(); state.epoch++;
    releaseImages(); state.history = []; state.reviews = []; state.user = null; state.quota = null; state.scope = ''; state.busy = false;
    $('adminScope').checked = false; $('adminControls').hidden = true;
    $('historyList').replaceChildren(node('p', 'Đăng nhập để xem lịch sử của bạn.'));
    $('reviewList').replaceChildren(node('p', 'Đăng nhập để xem đánh giá của bạn.'));
    $('reviewPagination').replaceChildren();
    $('resultBox').classList.add('hidden'); $('resultImage').removeAttribute('src');
    for (const field of ['disease','confidence','level','cause','solution','medicine','prevent']) text(field, '');
    for (const field of ['totalDetect','todayDetect','lightCount','heavyCount']) text(field, '0');
    text('averageRating', '0.0 (0 đánh giá)'); text('accountEmail', ''); text('quotaStatus', 'Đăng nhập để sử dụng nhận diện.');
    $('reviewName').value = ''; $('reviewContent').value = ''; clearPreview();
    updateControls();
  }
  function detectionStatus(status) {
    state.detection = status;
    const button = $('detectButton');
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.className = status === 'loading' ? 'detect-spinner' : '';
    icon.textContent = status === 'done' ? '✓' : status === 'loading' ? '' : '⌕';
    button.replaceChildren(icon, document.createTextNode(status === 'loading' ? ' AI đang phân tích…' : status === 'done' ? ' Hoàn thành' : ' Nhận diện bằng AI'));
    button.setAttribute('aria-busy', String(status === 'loading'));
    button.setAttribute('aria-live', 'polite');
    updateControls();
  }
  function updateControls() {
    const loggedIn = Boolean(state.session && state.user);
    $('signedInPanel').hidden = !loggedIn;
    $('authForm').hidden = loggedIn;
    $('detectButton').disabled = !loggedIn || state.busy || !(state.quota?.remaining > 0);
    for (const id of ['exportExcel','exportHistory','refreshHistory','sendReview']) $(id).disabled = !loggedIn || state.busy;
    $('clearHistory').disabled = !loggedIn || state.busy || Boolean(state.scope);
    $('adminScope').disabled = state.busy;
    $('imageInput').disabled = state.detection === 'loading';
    $('clearResult').disabled = state.detection === 'loading';
    $('signInGoogle').disabled = state.authBusy || !state.client;
    $('signOut').disabled = state.authBusy;
  }
  async function api(url, options = {}, epoch = state.epoch) {
    active(epoch);
    if (!state.session) throw new Error('Vui lòng đăng nhập.');
    const headers = { ...options.headers, Authorization: `Bearer ${state.session.access_token}` };
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, { ...options, headers, signal: state.controller.signal, cache: 'no-store' });
    active(epoch);
    if (response.status === 401) {
      state.session = null; clearPrivate();
      void state.client?.auth.signOut({ scope: 'local' });
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    if (!response.ok) {
      let error; try { error = await response.json(); } catch { /* non-JSON gateway error */ }
      active(epoch);
      throw new Error(error?.error || error?.message || `Yêu cầu thất bại (HTTP ${response.status}).`);
    }
    return response;
  }
  async function json(url, options, epoch = state.epoch) {
    const response = await api(url, options, epoch);
    const data = await response.json(); active(epoch);
    if (data.success === false) throw new Error(data.error || data.message || 'Yêu cầu thất bại.');
    return data;
  }
  function showQuota() {
    const q = state.quota;
    text('quotaStatus', q ? `Còn ${q.remaining}/${q.limit || 10} lượt trong ${q.windowHours || 8} giờ gần nhất.${q.resetAt ? ` Lượt tiếp theo được hoàn lại từ ${dateText(q.resetAt)}.` : ''}` : 'Chưa tải được hạn mức.');
    updateControls();
  }
  async function refreshMe(epoch = state.epoch) {
    const data = await json('/api/me', undefined, epoch);
    state.user = data.user; state.quota = data.quota;
    text('accountEmail', data.user.email);
    $('adminControls').hidden = !data.user.isAdmin;
    if (!data.user.isAdmin) { state.scope = ''; $('adminScope').checked = false; }
    showQuota();
  }
  async function refreshData(epoch = state.epoch) {
    const [history, reviews] = await Promise.all([json(scoped('/api/history'), undefined, epoch), json(scoped('/api/reviews'), undefined, epoch)]);
    active(epoch); state.history = history.data; state.reviews = reviews.data; state.moreHistory = history.data.length === PAGE_SIZE; state.moreReviews = reviews.data.length === PAGE_SIZE;
    renderHistory(); renderReviews(); renderStatistics();
  }
  async function setSession(session) {
    const previousId = state.session?.user?.id;
    state.session = session;
    if (previousId === session?.user?.id && state.user) { updateControls(); return; }
    clearPrivate();
    if (!session) { updateControls(); return; }
    const epoch = state.epoch;
    try { await refreshMe(epoch); await refreshData(epoch); message('Đã đăng nhập. Dữ liệu nhận diện chỉ hiển thị cho bạn và quản trị viên.'); }
    catch (error) { if (error.name !== 'AbortError') message(error.message, true); }
    updateControls();
  }
  function renderHistory() {
    const keyword = $('searchHistory').value.trim().toLocaleLowerCase('vi');
    const records = state.history.filter(item => `${item.disease || ''} ${item.solution || ''} ${item.level || ''}`.toLocaleLowerCase('vi').includes(keyword));
    $('historyList').replaceChildren();
    if (!records.length) $('historyList').append(node('p', 'Chưa có lịch sử phù hợp.'));
    for (const item of records) {
      const card = node('article', '', 'history-card');
      card.append(node('h3', item.disease || 'Chưa xác định'), node('p', item.level || 'Chưa xác định'), node('small', dateText(item.created_at)), node('p', item.solution || ''));
      if (state.scope) card.append(node('small', `Tài khoản: ${item.user_id}`));
      const view = node('button', 'Xem ảnh', 'auth-secondary'); view.type = 'button';
      const image = document.createElement('img'); image.alt = 'Ảnh của lần nhận diện'; image.hidden = true;
      view.onclick = async () => {
        const epoch = state.epoch; view.disabled = true;
        try {
          const response = await api(`/api/history/${encodeURIComponent(item.id)}/image`, {}, epoch);
          const blob = await response.blob(); active(epoch);
          const url = URL.createObjectURL(blob); state.urls.add(url); image.src = url; image.hidden = false; view.hidden = true;
        } catch (error) { if (error.name !== 'AbortError') { message(error.message, true); view.disabled = false; } }
      };
      card.append(view, image); $('historyList').append(card);
    }
    if (state.moreHistory) $('historyList').append(loadMoreButton('history'));
  }
  function loadMoreButton(kind) {
    const button = node('button', `Tải thêm ${PAGE_SIZE} bản ghi`, 'auth-secondary');
    button.type = 'button';
    button.onclick = () => run(async epoch => {
      const records = state[kind];
      const params = new URLSearchParams({ offset: String(records.length) });
      if (state.scope) params.set('scope', 'all');
      const result = await json(`/api/${kind}?${params}`, {}, epoch);
      state[kind] = [...records, ...result.data];
      if (kind === 'history') { state.moreHistory = result.data.length === PAGE_SIZE; renderHistory(); renderStatistics(); }
      else { state.moreReviews = result.data.length === PAGE_SIZE; renderReviews(); }
    });
    return button;
  }
  function renderStatistics() {
    const today = new Date().toLocaleDateString('vi-VN');
    text('totalDetect', state.history.length);
    text('todayDetect', state.history.filter(item => new Date(item.created_at).toLocaleDateString('vi-VN') === today).length);
    text('lightCount', state.history.filter(item => item.level === 'Nhẹ').length);
    text('heavyCount', state.history.filter(item => item.level === 'Nặng').length);
  }
  function renderReviews() {
    const keyword = $('searchReview').value.trim().toLocaleLowerCase('vi');
    const star = Number($('filterStar').value);
    const records = state.reviews.filter(item => (!star || item.star === star) && `${item.name} ${item.content}`.toLocaleLowerCase('vi').includes(keyword));
    $('reviewList').replaceChildren(); $('reviewPagination').replaceChildren();
    if (!records.length) $('reviewList').append(node('p', 'Chưa có đánh giá phù hợp.'));
    const avg = state.reviews.length ? state.reviews.reduce((n, item) => n + Number(item.star), 0) / state.reviews.length : 0;
    text('averageRating', `${avg.toFixed(1)} (${state.reviews.length} đánh giá đã tải)`);
    for (const item of records) {
      const card = node('article', '', 'reviewCard');
      card.append(node('h3', item.name), node('p', '★'.repeat(Math.max(0, Math.min(5, Number(item.star) || 0)))), node('small', dateText(item.created_at)), node('p', item.content));
      if (state.scope) card.append(node('small', `Tài khoản: ${item.user_id}`));
      if (state.user?.isAdmin) card.append(node('small', `Gmail đăng nhập: ${item.user_email || 'Chưa có thông tin'}`));
      if (own(item)) {
        const edit = node('button', 'Sửa đánh giá', 'auth-secondary'); edit.type = 'button';
        edit.onclick = () => run(async epoch => {
          const name = window.prompt('Tên của bạn (tối đa 80 ký tự)', item.name);
          if (name === null) return;
          const content = window.prompt('Nội dung đánh giá (tối đa 2.000 ký tự)', item.content);
          if (content === null) return;
          if (!name.trim() || name.trim().length > 80 || !content.trim() || content.trim().length > 2000) throw new Error('Tên hoặc nội dung vượt giới hạn hoặc đang trống.');
          await json(`/api/reviews/${encodeURIComponent(item.id)}`, { method: 'PUT', body: JSON.stringify({ name: name.trim(), content: content.trim() }) }, epoch);
          await refreshData(epoch);
        });
        const remove = node('button', 'Xóa đánh giá', 'auth-secondary'); remove.type = 'button';
        remove.onclick = () => run(async epoch => { if (!window.confirm('Xóa đánh giá này?')) return; await json(`/api/reviews/${encodeURIComponent(item.id)}`, { method: 'DELETE' }, epoch); await refreshData(epoch); });
        card.append(edit, remove);
      }
      $('reviewList').append(card);
    }
    if (state.moreReviews) $('reviewList').append(loadMoreButton('reviews'));
  }
  async function run(action) {
    if (state.busy) return;
    const epoch = state.epoch; state.busy = true; updateControls();
    try { await action(epoch); }
    catch (error) { if (error.name !== 'AbortError') message(error.message, true); }
    finally { if (epoch === state.epoch) { state.busy = false; updateControls(); } }
  }
  function clearPreview() {
    detectionStatus('idle');
    if (state.previewUrl) { URL.revokeObjectURL(state.previewUrl); state.previewUrl = null; }
    $('imageInput').value = ''; $('previewImage').removeAttribute('src'); $('previewImage').classList.add('hidden');
  }
  function preview() {
    if (state.detection === 'loading') return;
    detectionStatus('idle');
    const file = $('imageInput').files[0]; if (!file) return;
    if (file.size > 3 * 1024 * 1024 || !['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) { clearPreview(); message('Chọn JPEG, PNG, WebP hoặc GIF tối đa 3 MiB.', true); return; }
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = URL.createObjectURL(file); $('previewImage').src = state.previewUrl; $('previewImage').classList.remove('hidden');
  }
  function download(blob, filename) {
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function authAction(kind) {
    if (state.authBusy || !state.client) return;
    state.authBusy = true; updateControls();
    try {
      let result;
      if (kind === 'signOut') {
        state.session = null; clearPrivate();
        result = await state.client.auth.signOut({ scope: 'local' });
      } else {
        result = await state.client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: location.origin, queryParams: { prompt: 'select_account' } }
        });
      }
      if (result.error) throw result.error;
      message(kind === 'signOut' ? 'Đã đăng xuất.' : 'Đang chuyển đến Google để đăng nhập…');
    } catch (error) { message(error.message || 'Không thể đăng nhập.', true); }
    finally { state.authBusy = false; updateControls(); }
  }
  async function init() {
    clearPrivate();
    $('signInGoogle').onclick = () => authAction('google');
    $('signOut').onclick = () => authAction('signOut');
    $('imageInput').onchange = preview;
    $('dropArea').ondragover = event => event.preventDefault();
    $('dropArea').ondrop = event => { event.preventDefault(); if (state.detection === 'loading') return; if (event.dataTransfer.files.length) { $('imageInput').files = event.dataTransfer.files; preview(); } };
    $('clearResult').onclick = () => { clearPreview(); $('resultBox').classList.add('hidden'); };
    $('copyResult').onclick = async () => { try { await navigator.clipboard.writeText(['disease','confidence','level','cause','solution','medicine','prevent'].map(id => $(id).textContent).join('\n')); message('Đã sao chép kết quả.'); } catch { message('Trình duyệt không cho phép sao chép.', true); } };
    $('detectButton').onclick = () => run(async epoch => {
      const file = $('imageInput').files[0]; if (!file) throw new Error('Vui lòng chọn ảnh.');
      const form = new FormData(); form.append('image', file); detectionStatus('loading'); message('AI đang phân tích ảnh…');
      try {
        const result = await json('/api/detect', { method: 'POST', body: form }, epoch);
        let data; try { data = typeof result.result === 'string' ? JSON.parse(result.result) : result.result; } catch { throw new Error('Kết quả AI không đúng định dạng.'); }
        for (const field of ['disease','confidence','level','cause','solution','medicine','prevent']) text(field, data?.[field] ?? 'Chưa xác định');
        detectionStatus('done');
        $('resultBox').classList.remove('hidden');
        $('resultImage').removeAttribute('src');
        if (result.historyId) {
          const response = await api(`/api/history/${encodeURIComponent(result.historyId)}/image`, {}, epoch);
          const blob = await response.blob(); active(epoch); const url = URL.createObjectURL(blob); state.urls.add(url); $('resultImage').src = url;
        }
        await refreshData(epoch); message('Đã phân tích và lưu vào lịch sử riêng của bạn.');
      } finally {
        if (epoch === state.epoch) {
          if (state.detection === 'loading') detectionStatus('idle');
          if (state.session) await refreshMe(epoch);
        }
      }
    });
    $('refreshHistory').onclick = () => run(async epoch => { await refreshMe(epoch); await refreshData(epoch); message('Đã cập nhật.'); });
    $('adminScope').onchange = () => run(async epoch => { state.scope = state.user?.isAdmin && $('adminScope').checked ? 'all' : ''; releaseImages(); $('historyList').replaceChildren(); $('reviewList').replaceChildren(); await refreshData(epoch); });
    $('searchHistory').oninput = renderHistory; $('searchReview').oninput = renderReviews; $('filterStar').onchange = renderReviews;
    $('clearHistory').onclick = () => run(async epoch => { if (state.scope || !window.confirm('Xóa toàn bộ lịch sử của riêng bạn?')) return; await json('/api/history', { method: 'DELETE' }, epoch); await refreshData(epoch); message('Đã xóa lịch sử của bạn.'); });
    $('exportHistory').onclick = () => run(async epoch => {
      const records = [];
      while (true) {
        const params = new URLSearchParams({ offset: String(records.length) });
        if (state.scope) params.set('scope', 'all');
        const data = await json(`/api/history?${params}`, {}, epoch);
        records.push(...data.data);
        if (records.length > JSON_EXPORT_LIMIT) throw new Error('Lịch sử vượt 10.000 bản ghi. Chưa xuất file; vui lòng liên hệ quản trị viên để xuất toàn bộ dữ liệu.');
        if (data.data.length < PAGE_SIZE) break;
      }
      active(epoch);
      download(new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' }), 'history.json');
    });
    $('exportExcel').onclick = () => run(async epoch => { const response = await api(scoped('/api/history/export-excel'), {}, epoch); const blob = await response.blob(); active(epoch); download(blob, 'AgroCare_AI_Thong_Ke.xlsx'); message('Đã xuất tối đa 20 lần phân tích gần nhất.'); });
    $('sendReview').onclick = () => run(async epoch => {
      const name = $('reviewName').value.trim(); const content = $('reviewContent').value.trim(); const star = Number($('reviewStar').value);
      if (!name || name.length > 80 || !content || content.length > 2000 || !Number.isInteger(star) || star < 1 || star > 5) throw new Error('Nhập tên (1–80 ký tự), đánh giá (1–2.000 ký tự) và 1–5 sao.');
      await json('/api/reviews', { method: 'POST', body: JSON.stringify({ name, star, content }) }, epoch);
      $('reviewContent').value = ''; await refreshData(epoch); message('Đã lưu đánh giá riêng của bạn.');
    });
    $('themeButton').onclick = () => { document.body.classList.toggle('dark'); localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light'); };
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
    try {
      const response = await fetch('/api/config', { cache: 'no-store' }); const config = await response.json();
      if (!response.ok || !config.supabaseUrl || !config.supabaseAnonKey) throw new Error('Ứng dụng chưa được cấu hình đăng nhập. Vui lòng liên hệ quản trị viên.');
      state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      state.client.auth.onAuthStateChange((event, session) => {
        // Supabase callbacks must not await another auth call inside the callback.
        setTimeout(async () => {
          await setSession(session);
          updateControls();
        }, 0);
      });
      const { data, error } = await state.client.auth.getSession(); if (error) throw error;
      await setSession(data.session);
    } catch (error) { message(error.message, true); }
  }
  window.agroReady = init();
})();

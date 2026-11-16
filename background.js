// 后台：负责真正的文件下载（content script 不能直接调 downloads）
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg && msg.type === 'aplus-download') {
    try {
      chrome.downloads.download(
        { url: msg.url, filename: msg.filename || 'A+导出.png', saveAs: !!msg.saveAs, conflictAction: 'uniquify' },
        (id) => reply({ ok: !!id, id: id || null, err: chrome.runtime.lastError ? chrome.runtime.lastError.message : '' })
      );
    } catch (e) {
      reply({ ok: false, err: String(e && e.message || e) });
    }
    return true;
  }
  if (msg && msg.type === 'aplus-ping') {
    reply({ ok: true });
    return true;
  }
});

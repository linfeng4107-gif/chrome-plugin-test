/* A+ 工作台 · Chrome 扩展 content script
   在 chatgpt.com 页面右侧挂一个面板：提示词管理 + 只填不发送的导入 + 页面图片提取 / 收藏 / 导出 */
(function () {
  if (window.__aplusMounted) return;
  window.__aplusMounted = true;

  const MODULES = ['主图01','主图02','主图03','主图04','主图05','主图06','主图07','主图08',
    'A+01','A+02','A+03','A+04','A+05','主视觉','卖点方图','横幅'];

  const PRESET = {
    aplus: `你是亚马逊 A+ 内容视觉策划。根据下面的产品信息，给出一套 A+ 模块配图方案。
标题：{标题信息}
辅助信息：{辅助信息}

输出要求：
1. 5 个模块 —— 品牌横幅 970×600；卖点方图 300×300 共 3 张；场景图 970×600；对比配图 350×175；品牌故事 970×600。
2. 统一视觉：白底影棚、光向一致，主色限定 #1A1D20 / #0285EC / #232424。
3. 每个模块先给一句画面说明，再给一段可直接用于生图的英文提示词。
4. 画面内不要出现文字、字母、数字、Logo、水印、边框；文案单独列出。`,
    sub: `在第 1 条方案的基础上，只生成品牌横幅 970×600 这一张。
标题：{标题信息}
辅助信息：{辅助信息}
构图：主体居中偏右，左上留出 20% 文字安全区；纯白无缝背景，柔光箱侧光，极淡落地影。
限制：不出现文字、字母、数字、Logo、水印、边框；真实商业摄影质感，弱化 AI 生成痕迹。
输出：1 张 970×600 图。`,
    main: `白底主图（这一张你自己制作，提示词仅作参考/备用）。
要求：2000×2000 画布，纯白 #FFFFFF 背景，产品占画面约 82%，四周留 9% 安全边距；
不出现文字、Logo、道具、水印与投影；真实商业摄影质感，金属有细腻高光。`
  };
  const PNAME = { aplus: 'A+', sub: '主图', main: '白底主图' };
  const VER = '0.6.32';
  const AUTHOR = 'LinFeng';
  /* 调板「拆出 / 收回」图标 */
  const IC_POP = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.8" y="6.2" width="8" height="8" rx="1.6"/><rect x="9.2" y="1.8" width="5" height="5" rx="1.2"/></svg>';
  const IC_DOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.8" y="1.8" width="8" height="8" rx="1.6"/><path d="M13.8 2.2l-4.1 4.1M10 6.4h3.8V2.6"/></svg>';
  /* 横排三栏宽度比例：文档优先 / 均衡 / 图片优先 */
  const RATIO = {
    doc:  { doc: '1.35 1 0', prompt: '1 1 0',    gen: '1 1 0' },
    even: { doc: '1 1 0',    prompt: '1 1 0',    gen: '1 1 0' },
    img:  { doc: '0.9 1 0',  prompt: '1.05 1 0', gen: '1.4 1 0' }
  };
  const RATIO_NAME = { doc: '文档优先', even: '均衡三分', img: '图片优先' };
  const CHANGELOG = [
    ['v' + VER, '设置里可改导入 GPT 的两条前缀（默认「标题」「辅助信息」）并加「显示前缀」开关，关掉就只输出内容；导入按钮文案改成「导入 GPT」'],
    ['v0.6.31', '导入对话框的字段标签统一成「标题：」「辅助信息：」（不再出现「主体」「补充信息」）；旧模板里的旧标签在启动时自动替换'],
    ['v0.6.30', '设置里的开关与选项按钮改成「开=实心强调色+白点、关=描边灰字+空心点」，一眼看出有没有打开；署名改为 LinFeng'],
    ['v0.6.28', '修让位来回跳（位移只算一次、改用 translate 属性，不再被面板自身的 transform:none!important 吃掉）；暂隐改成淡出而不是硬消失，鼠标停在面板上时状态冻结'],
    ['v0.6.27', '左侧对话栏弹出时面板自动往右让位、缩回即归位；可选「中线左侧面板暂时隐藏」；两个开关都在设置里'],
    ['v0.6.26', '素材可拖到组标题归组；收藏 ↓ 与右键另存统一口径；Ctrl+Shift+H 临时收起面板；找不到 GPT 输入框时改提示并复制到剪贴板'],
    ['v0.6.25', '右键「加入素材」放到「复制图片」下面；素材态「复制图片」仍倒数第二'],
    ['v0.6.24', '修「大图隐身」误判（页面常驻全屏容器不再顶掉面板）+ 右下角一键叫回'],
    ['v0.6.23', '点开 GPT 大图 / 详情弹层时面板自动隐身，退出就回来；设置里可关'],
    ['v0.6.22', '右键菜单把「复制图片」挪到倒数第二，靠下的常用项（另存 / 移除 / 取消收藏）位置更顺手'],
    ['v0.6.21', '右键「另存这张」也按「模块_备注」命名、按设置的位置保存；大图不再退化成「下载1」'],
    ['v0.6.20', '修「移到组…」点了没反应（点击前被自己关掉）；素材支持多选，可一次归组、批量移除'],
    ['v0.6.19', '素材加「组」：可建组 / 折叠 / 改名 / 解散，图片右键「移到组」，也能直接导入进某个组'],
    ['v0.6.18', '修 Ctrl+Shift+1~9 预设快捷键失效（Shift 下 e.key 变成符号，改用 e.code 判断）'],
    ['v0.6.17', '去掉界面上的操作说明文字，面板与设置更干净'],
    ['v0.6.16', '制作人署名改为 LinFeng；更新日志默认折叠'],
    ['v0.6.15', '调板标题栏「拆 / 收」换成图标；竖排给三块设下限高度，窄窗不再互相压扁'],
    ['v0.6.14', '顶部按钮改线性图标；设置加「三栏比例」三选、更新日志与制作人署名'],
    ['v0.6.13', '改名 Amazon 工作台；文档调板加拖放区；设置分组加分隔线'],
    ['v0.6.12', '三个输入框可拖高度并记住；导出位置可在设置里定；文件名改「模块_备注」；窄窗自动竖排'],
    ['v0.6.11', '收藏加清空；导入前缀改「标题/补充信息」；窗口缩放回原位；预设快捷键 Ctrl+Shift+1~9'],
    ['v0.6.10', '导出改成先申请单文件句柄再打包 zip（修桌面导出失败）；竖排不再重叠'],
    ['v0.6.9',  '版面记忆补齐（含折叠态）；设置加版面预设 12 套'],
    ['v0.6.6',  '双击放大任意图片、滚轮缩放；素材缩略图大小可调'],
    ['v0.6',    '改为可浮动调板：拖动、缩放、拆分独立窗、拖 ⠿ 换顺序、横排竖排']
  ];
  const THEMES = [
    { id: 'light', name: '浅灰' },
    { id: 'paper', name: '暖米' },
    { id: 'dark',  name: '石墨' }
  ];
  const SNIP_DEFAULT = [
    { id: 's1', name: '纯白底', text: '背景纯白 #FFFFFF，不要渐变、不要投影、不要环境反射。' },
    { id: 's2', name: '不要文字', text: '画面内不出现任何文字、字母、数字、Logo、水印与边框。' },
    { id: 's3', name: '留安全区', text: '主体居中偏右，四周留 9% 安全边距，左上角留出文案区。' },
    { id: 's4', name: '真实质感', text: '真实商业摄影质感，柔光箱照明，金属有细腻高光，避免 AI 生成感的塑料反光。' }
  ];

  const state = {
    active: 'sub',
    prompts: { aplus: PRESET.aplus, sub: PRESET.sub, main: PRESET.main },
    vers: { aplus: [], sub: [], main: [] },
    snippets: SNIP_DEFAULT.slice(),
    title: '',
    extra: '美国站英文文案；主体不要出现水管与工具；不要出现品牌 Logo；纯白底，无投影。',
    preTitle: '标题',
    preInfo: '辅助信息',
    showPrefix: true,
    theme: 'light',
    accent: '',
    fs: 1,
    width: 0,
    h: 0,
    x: null,
    y: null,
    layout: 'row',
    ratio: 'doc',
    pane: 'prompt',
    pads: { doc: false, prompt: false, gen: false },
    out: { doc: false, prompt: false, gen: false },
    box: { doc: null, prompt: null, gen: null },
    collapsed: false,
    scan: [],
    groups: [],
    gidMap: {},
    sel: [],
    fav: [],
    favFilter: 'all',
    ui: { scan: true, fav: true, main: true, log: false },
    thumb: { g: 92, f: 54 },
    taH: {},
    pref: null,
    exportMode: 'zip',
    exLoc: 'ask',
    autoHide: true,
    dodgeSide: true,
    hideLeftSide: false,
    locName: '',
    layouts: [],
    doc: { name: '', texts: [], imgs: [] }
  };

  /* ---------- 小工具 ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad2 = (n) => String(n).padStart(2, '0');
  const hhmm = () => { const d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };

  let toastTimer = null;
  function toast(msg) {
    const el = $('#apToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
  }

  /* ---------- 存储 ---------- */
  const KEY = 'aplus_ext_v1';
  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }
  function loadStore(cb) {
    if (hasChromeStorage()) {
      chrome.storage.local.get([KEY], (o) => cb((o && o[KEY]) || null));
      return;
    }
    try {
      const raw = localStorage.getItem(KEY);
      cb(raw ? JSON.parse(raw) : null);
    } catch (e) { cb(null); }
  }
  function saveStore() {
    const payload = {
      active: state.active, prompts: state.prompts, vers: state.vers, snippets: state.snippets,
      title: state.title, extra: state.extra, theme: state.theme, accent: state.accent, fs: state.fs,
      width: state.width, h: state.h, x: state.x, y: state.y,
      layout: state.layout, pane: state.pane, pads: state.pads, out: state.out, box: state.box, order: state.order, fav: state.fav,
      favFilter: state.favFilter, ui: state.ui, thumb: state.thumb,
      collapsed: state.collapsed, layouts: state.layouts, exportMode: state.exportMode,
      ratio: state.ratio,
      groups: state.groups, gidMap: state.gidMap,
      exLoc: state.exLoc, locName: state.locName, taH: state.taH, autoHide: state.autoHide,
      dodgeSide: state.dodgeSide, hideLeftSide: state.hideLeftSide,
      preTitle: state.preTitle, preInfo: state.preInfo, showPrefix: state.showPrefix,
      pref: state.pref
    };
    if (hasChromeStorage()) {
      try { chrome.storage.local.set({ [KEY]: payload }); } catch (e) {}
    } else {
      try { localStorage.setItem(KEY, JSON.stringify(payload)); } catch (e) {}
    }
  }

  /* ---------- 挂载面板 ---------- */
  let rootEl = null;
  function buildPanel() {
    const root = (rootEl = document.createElement('div'));
    root.id = 'aplus-root';
    root.setAttribute('data-theme', state.theme);
    root.innerHTML = `
      <div class="ap-handle" id="apHandle"></div>
      <div class="ap-shell">
        <div class="ap-collapsed" id="apCollapsed" title="展开工作台">A+</div>
        <header class="ap-hd" id="apHd" title="按住拖动可移动面板 · 双击折叠">
          <span class="ap-logo">AZ</span>
          <span class="ap-ttl">Amazon 工作台</span>
          <span class="ap-grow"></span>
          <button class="ap-ico ap-icon" id="apDock" title="贴到浏览器窗口右侧">
            <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="2"/><path d="M10.2 3.4v9.2"/></svg>
          </button>
          <button class="ap-ico ap-icon" id="apLayout" title="横排 / 竖排">
            <svg viewBox="0 0 16 16" aria-hidden="true" class="ic-row"><rect x="2" y="3.5" width="3.4" height="9" rx="1"/><rect x="6.3" y="3.5" width="3.4" height="9" rx="1"/><rect x="10.6" y="3.5" width="3.4" height="9" rx="1"/></svg>
            <svg viewBox="0 0 16 16" aria-hidden="true" class="ic-col"><rect x="3.5" y="2" width="9" height="3.4" rx="1"/><rect x="3.5" y="6.3" width="9" height="3.4" rx="1"/><rect x="3.5" y="10.6" width="9" height="3.4" rx="1"/></svg>
          </button>
          <button class="ap-ico ap-icon" id="apTheme" title="设置：版面配色 / 强调色 / 字号 / 三栏比例 / 预设 / 更新日志">
            <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.4"/><path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1"/></svg>
          </button>
          <button class="ap-ico ap-icon" id="apHide" title="折叠成标题条">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8h9.6"/></svg>
          </button>
        </header>
        <div class="ap-body" id="apBody" data-layout="row">
          <section class="ap-pad" data-pad="doc">
            <header class="ap-pad-hd">
              <span class="ap-grip" title="拖动可换位置">⠿</span>
              <b>文档预览</b>
              <span class="ap-grow"></span>
              <button class="ap-mini" id="apDocPick">选文件</button>
              <button class="ap-mini" id="apDocCopyAll">复制全文</button>
              <button class="ap-mini" id="apDocClear">清空</button>
              <button class="ap-mini ap-padout ap-icon2" data-pad="doc" title="拆成独立窗口 / 收回">${IC_POP}</button>
              <button class="ap-mini ap-padfold" data-pad="doc" title="折叠 / 展开">▾</button>
            </header>
            <div class="ap-pad-bd">
            <section class="ap-card ap-grow-col">
              <input type="file" id="apDocFile" accept=".docx,.pptx,.txt,.md" style="display:none">
              <div class="ap-drop" id="apDrop">
                <b>拖入或点选文档</b>
                <span>docx / pptx / txt</span>
              </div>
              <div class="ap-hint" id="apDocInfo" style="display:none"></div>
              <div class="ap-doc" id="apDocBody"></div>
            </section>
            </div>
          </section>

          <section class="ap-pad" data-pad="prompt">
            <header class="ap-pad-hd">
              <span class="ap-grip" title="拖动可换位置">⠿</span>
              <b id="apPaneTitle">提示词</b>
              <span class="ap-grow"></span>
              <button class="ap-mini ap-padout ap-icon2" data-pad="prompt" title="拆成独立窗口 / 收回">${IC_POP}</button>
              <button class="ap-mini ap-padfold" data-pad="prompt" title="折叠 / 展开">▾</button>
            </header>
            <div class="ap-pad-bd" id="apPromptView">
            <section class="ap-card">
              <div class="ap-lbl">标题卖点</div>
              <textarea class="ap-ta" id="apTitle" rows="2" placeholder="如：Dishwasher Inlet Valve, 304 Stainless Steel"></textarea>
              <div class="ap-lbl">辅助信息</div>
              <textarea class="ap-ta" id="apExtra" rows="3" placeholder="平台 / 文案语气 / 禁用元素"></textarea>
            </section>

            <section class="ap-card ap-grow-col">
              <div class="ap-tabs" id="apTabs">
                <button data-p="sub" class="on">主图</button>
                <button data-p="aplus">A+</button>
                <button data-p="main">白底主图</button>
              </div>
              <textarea class="ap-ta ap-prompt" id="apPrompt" spellcheck="false" placeholder="提示词内容"></textarea>
              <div class="ap-row">
                <span class="ap-state" id="apSaveState">已保存</span>
                <span class="ap-grow"></span>
                <button class="ap-mini" id="apSnip">插入片段</button>
                <button class="ap-mini" id="apReset">恢复预设</button>
                <button class="ap-mini" id="apSave">保存</button>
              </div>
              <div class="ap-row">
                <input class="ap-inp ap-flex" id="apVerName" placeholder="版本名，如：V2 强对比" maxlength="18">
                <button class="ap-mini" id="apVerSave">存版本</button>
              </div>
              <div class="ap-row">
                <select class="ap-sel ap-flex" id="apVerSel"></select>
                <button class="ap-mini" id="apVerDel">删</button>
                <button class="ap-mini" id="apDiff">对比</button>
              </div>
            </section>
            </div>
            <button class="ap-btn ap-primary ap-importbtn" id="apImport">导入 GPT</button>
          </section>

          <section class="ap-pad" data-pad="gen">
            <header class="ap-pad-hd">
              <span class="ap-grip" title="拖动可换位置">⠿</span>
              <b>图片助手</b>
              <span class="ap-grow"></span>
              <button class="ap-mini ap-padout ap-icon2" data-pad="gen" title="拆成独立窗口 / 收回">${IC_POP}</button>
              <button class="ap-mini ap-padfold" data-pad="gen" title="折叠 / 展开">▾</button>
            </header>
            <div class="ap-pad-bd">
            <section class="ap-card">
              <div class="ap-row">
                <b class="ap-h">素材</b>
                <span class="ap-grow"></span>
                <button class="ap-mini ap-fold" data-sec="scan" title="收起 / 展开">▾</button>
              </div>
              <input type="file" id="apImgFile" accept="image/*" multiple style="display:none">
              <div class="ap-sec" data-sec="scan">
                <div class="ap-row">
                  <button class="ap-mini" id="apGroupAdd" title="新建一个素材组，像 PS 的图层组">＋组</button>
                  <button class="ap-mini" id="apScan" title="从本机选图片做参考">导入图片</button>
                  <button class="ap-mini" id="apScanClear" title="清空素材">清空</button>
                  <span class="ap-grow"></span>
                </div>
                <div class="ap-row">
                  <span class="ap-hint">预览大小</span>
                  <input type="range" class="ap-rng" id="apThumbG" min="52" max="150" step="4" value="92" title="调素材缩略图大小">
                  <span class="ap-hint ap-rngv" id="apThumbGv">92</span>
                </div>
                <div class="ap-row" id="apGroupNew" style="display:none">
                  <input class="ap-inp ap-flex" id="apGroupName" placeholder="组名，如：原图 / 已修" maxlength="14">
                  <button class="ap-mini" id="apGroupDo">建组</button>
                </div>
                <div class="ap-hint" id="apScanInfo"></div>
                <div class="ap-gwrap" id="apGrid"></div>
              </div>
            </section>

            <section class="ap-card">
              <div class="ap-row">
                <button class="ap-mini ap-fold" data-sec="fav" title="收起 / 展开">▾</button>
                <b class="ap-h">收藏</b>
                <span class="ap-num" id="apFavN">0</span>
                <span class="ap-grow"></span>
                <button class="ap-mini" id="apClearFav" title="清空全部收藏">清空</button>
                <button class="ap-mini ap-primary" id="apExport">导出</button>
              </div>
              <div class="ap-sec" data-sec="fav">
                <div class="ap-row" id="apFavFilter">
                  <button class="ap-mini on" data-f="all">全部</button>
                  <button class="ap-mini" data-f="done">定稿</button>
                  <button class="ap-mini" data-f="pick">待选</button>
                  <span class="ap-grow"></span>
                  <button class="ap-mini" id="apScanPage" title="扫描本页对话里的生成图">扫页图</button>
                </div>
                <div class="ap-fav" id="apFav"></div>
              </div>
            </section>
            </div>
          </section>
        </div>
      </div>
      <div class="ap-toast" id="apToast"></div>
      <div class="ap-resize ap-l" id="apResizeBL" title="拖动调整面板大小（左边缘）"></div>
      <div class="ap-resize" id="apResize" title="拖动调整面板大小"></div>
      <div class="ap-ctx" id="apCtx">
        <button data-act="addasset">加入素材</button>
        <button data-act="done">定稿</button>
        <button data-act="pick">待选</button>
        <button data-act="note">设备注</button>
        <button data-act="togroup">移到组…</button>
        <button data-act="dl">另存这张</button>
        <button data-act="copy">复制图片</button>
        <button data-act="rmasset">从素材移除</button>
        <button data-act="unfav">取消收藏</button>
      </div>
      <div class="ap-ctx" id="apGrpPick"></div>
      <div class="ap-layer" id="apView">
        <div class="ap-box">
          <header class="ap-box-hd"><span id="apViewName">图片</span><span class="ap-grow"></span><span class="ap-hint" id="apViewZoom">100%</span><button class="ap-mini" id="apViewFav">收藏这张</button><button class="ap-mini" id="apViewClose">关闭</button></header>
          <div class="ap-view" id="apViewBody"></div>
          <footer class="ap-box-ft"><span class="ap-hint" id="apViewMeta"></span></footer>
        </div>
      </div>
      <div class="ap-layer" id="apSnipLayer">
        <div class="ap-box">
          <header class="ap-box-hd"><span>插入提示词片段</span><span class="ap-grow"></span><button class="ap-mini" id="apSnipClose">关闭</button></header>
          <div class="ap-box-bd">
            <div class="ap-snips" id="apSnipList"></div>
            <input class="ap-inp" id="apSnipName" placeholder="片段名，如：纯白底" maxlength="20">
            <textarea class="ap-ta" id="apSnipText" rows="3" placeholder="片段内容"></textarea>
            <div class="ap-row"><span class="ap-grow"></span><button class="ap-mini" id="apSnipAdd">新增片段</button></div>
          </div>
        </div>
      </div>
      <div class="ap-layer" id="apDiffLayer">
        <div class="ap-box">
          <header class="ap-box-hd"><span>版本对比</span><span class="ap-grow"></span><span class="ap-hint" id="apDiffStat"></span><button class="ap-mini" id="apDiffClose">关闭</button></header>
          <div class="ap-box-bd">
            <div class="ap-row"><select class="ap-sel ap-flex" id="apDiffA"></select><span class="ap-hint">对比</span><select class="ap-sel ap-flex" id="apDiffB"></select></div>
            <div class="ap-diff" id="apDiffBody"></div>
          </div>
        </div>
      </div>
      <div class="ap-layer" id="apSetLayer">
        <div class="ap-box ap-setbox">
          <header class="ap-box-hd"><span>设置</span><span class="ap-grow"></span><button class="ap-mini" id="apSetClose">关闭</button></header>
          <div class="ap-box-bd">
            <div class="ap-lbl">版面配色</div>
            <div class="ap-row" id="apSetTheme">
              <button class="ap-mini" data-t="light">浅灰</button>
              <button class="ap-mini" data-t="paper">暖米</button>
              <button class="ap-mini" data-t="dark">石墨</button>
            </div>
            <div class="ap-lbl">强调色（按钮 / 高亮）</div>
            <div class="ap-row ap-sws" id="apSetAccent">
              <button class="ap-swatch" data-c="" title="跟随主题">默认</button>
              <button class="ap-swatch" data-c="#0285EC" title="#0285EC" style="background:#0285EC"></button>
              <button class="ap-swatch" data-c="#00A09B" title="#00A09B" style="background:#00A09B"></button>
              <button class="ap-swatch" data-c="#2E8B62" title="#2E8B62" style="background:#2E8B62"></button>
              <button class="ap-swatch" data-c="#7C5CFF" title="#7C5CFF" style="background:#7C5CFF"></button>
              <button class="ap-swatch" data-c="#E0623C" title="#E0623C" style="background:#E0623C"></button>
              <button class="ap-swatch" data-c="#B5761E" title="#B5761E" style="background:#B5761E"></button>
              <label class="ap-pickwrap" title="自定义颜色"><input type="color" id="apSetPick" value="#0285EC"><span>自选</span></label>
            </div>
            <div class="ap-lbl">功能开关</div>
            <div class="ap-row">
              <button class="ap-mini ap-sw on" id="apSetMain">白底主图页签</button>
              <button class="ap-mini ap-sw on" id="apSetAway" title="网页进入大图 / 详情弹层时自动把面板收起来">大图时自动隐身</button>
            </div>
            <div class="ap-row">
              <button class="ap-mini ap-sw on" id="apSetDodge" title="鼠标移到左侧对话栏图标、对话栏弹出时，面板自动往右让开，缩回后归位">侧栏弹出时右让</button>
              <button class="ap-mini ap-sw" id="apSetHideLeft" title="对话栏弹出时，位于屏幕中线左侧的面板暂时隐藏，右侧的保持">左侧面板暂隐</button>
            </div>
            <div class="ap-lbl">导入 GPT 前缀</div>
            <div class="ap-row">
              <input class="ap-inp ap-pre" id="apPreTitle" maxlength="10" placeholder="标题">
              <input class="ap-inp ap-pre" id="apPreInfo" maxlength="12" placeholder="辅助信息">
              <button class="ap-mini ap-sw on" id="apSetPrefix" title="关掉后导入只输出内容本身，不带「标题：」「辅助信息：」">显示前缀</button>
            </div>
            <div class="ap-hint">前缀后面会自动补「：」；模板里只有「{标题信息}」的那一行会跟着改；关掉开关就只留内容</div>
            <div class="ap-lbl">文字大小</div>
            <div class="ap-row" id="apSetFs">
              <button class="ap-mini" data-s="0.94">小</button>
              <button class="ap-mini" data-s="1">标准</button>
              <button class="ap-mini" data-s="1.12">大</button>
              <button class="ap-mini" data-s="1.25">特大</button>
            </div>
            <div class="ap-lbl">横排三栏比例</div>
            <div class="ap-row" id="apSetRatio">
              <button class="ap-mini" data-r="doc">文档优先</button>
              <button class="ap-mini" data-r="even">均衡三分</button>
              <button class="ap-mini" data-r="img">图片优先</button>
            </div>
            <div class="ap-hint">只影响横排宽度：文档 1.35 : 提示词 1 : 图片 1</div>
            <div class="ap-lbl">导出位置与方式</div>
            <div class="ap-row" id="apSetExport">
              <button class="ap-mini" data-m="zip">zip · 每次问我</button>
              <button class="ap-mini" data-m="zipdown">zip · 存下载夹</button>
              <button class="ap-mini" data-m="files">逐张下载</button>
            </div>
            <div class="ap-row">
              <button class="ap-mini" id="apPickLoc">设默认保存位置</button>
              <span class="ap-hint" id="apLocName">未设置</span>
            </div>
            <div class="ap-lbl">版面预设</div>
            <div class="ap-hint">快捷键 Ctrl+Shift+1 ~ 9 套用第 1~9 套 · Ctrl+Shift+H 收起 / 叫回面板</div>
            <div class="ap-row">
              <input class="ap-inp" id="apPresetName" placeholder="起个名，如：横排三栏 / 竖排大图">
              <button class="ap-mini" id="apPresetAdd">存为预设</button>
            </div>
            <div class="ap-presets" id="apPresetList"></div>
            <div class="ap-row"><span class="ap-grow"></span><button class="ap-mini" id="apSetReset">恢复默认</button></div>
            <div class="ap-lbl ap-foldhdr" id="apLogTog"><span class="ap-caret">▸</span>更新日志<span class="ap-cnt">${CHANGELOG.length} 条</span></div>
            <div class="ap-log ap-fold" id="apLogList"></div>
            <div class="ap-lbl">关于</div>
            <div class="ap-hint">Amazon 工作台 v${VER} · 制作人 ${AUTHOR}　（面板只读写本地存储，不上传任何数据）</div>
          </div>
        </div>
      </div>`;
    document.documentElement.appendChild(root);
    return root;
  }

  /* ---------- 提示词 ---------- */
  function promptText() { return $('#apPrompt'); }
  function renderTabs() {
    $$('#apTabs button').forEach(b => b.classList.toggle('on', b.dataset.p === state.active));
  }
  function renderVers() {
    const list = state.vers[state.active] || [];
    $('#apVerSel').innerHTML = '<option value="">当前编辑中</option>' +
      list.map((v, i) => '<option value="' + i + '">' + esc((v.name || ('v' + (i + 1))) + (v.at ? ' · ' + v.at : '')) + '</option>').join('');
    $('#apVerDel').disabled = !list.length;
    $('#apDiff').disabled = list.length < 2;
  }
  function renderSnips() {
    $('#apSnipList').innerHTML = state.snippets.length
      ? state.snippets.map(s => '<div class="ap-snip" data-sid="' + s.id + '"><span class="ap-snip-t"><b>' + esc(s.name) + '</b>' + esc(s.text) + '</span>' +
        '<button class="ap-mini" data-sn="ins">插</button><button class="ap-mini" data-sn="del">删</button></div>').join('')
      : '<div class="ap-hint">还没有片段</div>';
  }
  function insertSnip(text) {
    const ta = promptText();
    const start = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
    const end = ta.selectionEnd == null ? start : ta.selectionEnd;
    const pre = ta.value.slice(0, start), post = ta.value.slice(end);
    const gap = pre && !/\n$/.test(pre) ? '\n' : '';
    const ins = gap + text.replace(/\s+$/, '') + '\n';
    ta.value = pre + ins + post;
    ta.focus();
    try { ta.setSelectionRange(pre.length + ins.length, pre.length + ins.length); } catch (e) {}
    state.prompts[state.active] = ta.value;
    saveStore();
    $('#apSaveState').textContent = '已保存 · ' + hhmm();
  }

  /* ---------- 导入 GPT ---------- */
  function tagOf(kind) {
    const raw = (kind === 't' ? state.preTitle : state.preInfo) || '';
    const s = String(raw).replace(/[：:]\s*$/, '').trim();
    const dflt = kind === 't' ? '标题' : '辅助信息';
    const name = s || dflt;
    return state.showPrefix === false ? '' : name + '：';
  }
  function buildMessage() {
    const tpl = promptText().value;
    const t = (state.title || '').trim();
    const e = (state.extra || '').trim();
    const hasPh = /\{标题信息\}|\{辅助信息\}/.test(tpl);
    const PT = tagOf('t'), PE = tagOf('i');
    let out;
    if (hasPh) {
      // 没填的那个占位符所在行整行去掉——不留空壳标签
      out = tpl.split('\n').map(line => {
        const hasT = line.indexOf('{标题信息}') >= 0, hasE = line.indexOf('{辅助信息}') >= 0;
        if (!hasT && !hasE) return line;
        if ((hasT && !t) || (hasE && !e)) return '';
        const val = line.replace(/\{标题信息\}/g, t).replace(/\{辅助信息\}/g, e).trim();
        /* 这一行除了占位符就只剩「标签：」时，用设置里的前缀重写，否则保持模板原文 */
        const rest = line.replace(/\{标题信息\}/g, '').replace(/\{辅助信息\}/g, '').trim();
        const isBareLabel = rest === '' || /^[^：:]{1,10}[：:]$/.test(rest);
        if (!isBareLabel) return val;
        const onlyT = hasT && !hasE, onlyE = hasE && !hasT;
        if (onlyT) return PT + t;
        if (onlyE) return PE + e;
        return PT + t + (PT ? '；' : ' ') + PE + e;
      }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    } else {
      // 模板里没有占位符：只在有值时才前置对应那一行
      out = tpl.trim();
      const pre = [];
      if (t) pre.push(PT + t);
      if (e) pre.push(PE + e);
      if (pre.length) out = pre.join('\n') + '\n\n' + out;
    }
    return out.trim();
  }
  function findComposer() {
    const direct = ['#prompt-textarea', 'div[contenteditable="true"][data-virtualkeyboard]', 'form div[contenteditable="true"]'];
    for (const s of direct) {
      const el = $(s);
      if (el && (el.offsetWidth || el.offsetHeight)) return el;
    }
    const all = $$('div[contenteditable="true"], textarea');
    for (const el of all) {
      if (el.closest('#aplus-root')) continue;
      if (el.offsetWidth || el.offsetHeight) return el;
    }
    return null;
  }
  function writeComposer(text) {
    const el = findComposer();
    if (!el) return { ok: false, msg: '页面上没找到对话输入框' };
    el.focus();
    if (el.tagName === 'TEXTAREA') {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, msg: '已填入输入框，未发送' };
    }
    el.innerHTML = '';
    const okCmd = document.execCommand('insertText', false, text);
    if (!okCmd || !el.textContent.trim()) {
      el.innerHTML = text.split('\n').map(l => '<p>' + esc(l) + '</p>').join('');
    }
    try {
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    } catch (e) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return { ok: true, msg: '已填入输入框，未发送' };
  }
  async function doImport() {
    const msg = buildMessage();
    if (!msg) { toast('提示词是空的'); return; }
    const el = findComposer();
    if (el) {
      const cur = (el.value != null ? el.value : el.textContent || '').trim();
      if (cur && !window.confirm('对话输入框里已有内容，覆盖填成新的提示词？')) return;
    }
    const r = writeComposer(msg);
    if (!r.ok) {
      /* 找不到输入框多半是页面改版了：别静默失败，把提示词塞进剪贴板兜底 */
      let copied = false;
      try { await navigator.clipboard.writeText(msg); copied = true; } catch (e) {}
      toast(copied
        ? '没找到 GPT 输入框（页面可能改版了），提示词已复制到剪贴板，Ctrl+V 粘贴即可'
        : '没找到 GPT 输入框（页面可能改版了），请手动复制提示词');
      return;
    }
    toast(r.msg);
    const ed = findComposer();
    if (ed) { ed.focus(); try { ed.scrollIntoView({ block: 'center' }); } catch (e) {} }
  }

  /* ---------- 文档预览（docx / pptx / txt） ---------- */
  function decodeXml(s) {
    return String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  }
  async function collectMedia(zip, re, out) {
    const names = Object.keys(zip.files).filter(p => re.test(p) && /\.(png|jpe?g|gif|webp|bmp)$/i.test(p)).slice(0, 80);
    for (const p of names) {
      try {
        const blob = await zip.files[p].async('blob');
        out.push({ url: URL.createObjectURL(blob), name: p.split('/').pop() });
      } catch (e) {}
    }
  }
  function normPath(base, rel) {
    const parts = String(base + rel).split('/');
    const out = [];
    parts.forEach(p => {
      if (p === '..') out.pop();
      else if (p !== '.' && p !== '') out.push(p);
    });
    return out.join('/');
  }
  function parseRels(xml) {
    const map = {};
    (xml.match(/<Relationship\b[^>]*>/g) || []).forEach(tag => {
      const id = (tag.match(/Id="([^"]+)"/) || [])[1];
      const target = (tag.match(/Target="([^"]+)"/) || [])[1];
      if (id && target) map[id] = target;
    });
    return map;
  }
  async function relImages(zip, relsPath, basePath) {
    const out = {};
    const f = zip.file(relsPath);
    if (!f) return out;
    const rels = parseRels(await f.async('string'));
    for (const rid of Object.keys(rels)) {
      const t = rels[rid];
      if (!/\.(png|jpe?g|gif|webp|bmp)$/i.test(t)) continue;
      const full = normPath(basePath, t);
      const media = zip.file(full);
      if (!media) continue;
      try {
        const blob = await media.async('blob');
        out[rid] = { url: URL.createObjectURL(blob), name: full.split('/').pop(), path: full };
      } catch (e) {}
    }
    return out;
  }
  /* Word 自动编号：解析 numbering.xml，按段落 numPr 的顺序生成 1. 2. 3. */
  function parseNumbering(xml) {
    const out = {};
    if (!xml) return out;
    const abs = {};
    (xml.match(/<w:abstractNum[\s\S]*?<\/w:abstractNum>/g) || []).forEach(bl => {
      const aid = (bl.match(/w:abstractNumId="(\d+)"/) || [])[1];
      const lvls = {};
      (bl.match(/<w:lvl [\s\S]*?<\/w:lvl>/g) || []).forEach(l => {
        const ilvl = parseInt((l.match(/w:ilvl="(\d+)"/) || [])[1] || '0', 10);
        lvls[ilvl] = {
          fmt: (l.match(/<w:numFmt w:val="([^"]+)"/) || [])[1] || 'decimal',
          start: parseInt((l.match(/<w:start w:val="(\d+)"/) || [])[1] || '1', 10)
        };
      });
      abs[aid] = lvls;
    });
    (xml.match(/<w:num w:numId="[^"]+"[\s\S]*?<\/w:num>/g) || []).forEach(bl => {
      const nid = (bl.match(/w:numId="(\d+)"/) || [])[1];
      const aid = (bl.match(/<w:abstractNumId w:val="(\d+)"/) || [])[1];
      if (nid && abs[aid]) out[nid] = abs[aid];
    });
    return out;
  }
  function numLabel(map, counters, numId, ilvl) {
    const lvls = map[numId];
    if (!lvls) return '';
    const lv = lvls[ilvl] || lvls[0];
    if (!lv) return '';
    if (!counters[numId]) counters[numId] = {};
    const c = counters[numId];
    c[ilvl] = (c[ilvl] == null ? (lv.start || 1) - 1 : c[ilvl]) + 1;
    Object.keys(c).forEach(k => { if (parseInt(k, 10) > ilvl) delete c[k]; });
    if (lv.fmt === 'none') return '';
    if (lv.fmt === 'bullet') return '•';
    return c[ilvl] + '.';
  }
  async function openDoc(file) {
    const lower = (file.name || '').toLowerCase();
    const drop = $('#apDrop');
    if (drop) drop.style.display = 'none';
    const info = $('#apDocInfo');
    info.style.display = '';
    info.textContent = '正在读取 ' + file.name + ' …';
    const texts = [], imgs = [], blocks = [];
    const addP = (s, num, lvl) => {
      const t = String(s == null ? '' : s).trim();
      if (!t) { blocks.push({ t: 'p', text: '', i: -1 }); return; }
      texts.push(t);
      blocks.push({ t: 'p', text: t, i: texts.length - 1, num: num || '', lvl: lvl || 0 });
    };
    try {
      if (/\.(txt|md)$/.test(lower)) {
        const t = await file.text();
        t.split(/\r?\n/).slice(0, 900).forEach(line => addP(line));
      } else if (/\.(docx|pptx)$/.test(lower)) {
        if (typeof JSZip === 'undefined') throw new Error('缺少解压库（jszip.min.js 未加载）');
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        if (lower.endsWith('.docx')) {
          const f = zip.file('word/document.xml');
          if (!f) throw new Error('不是有效的 docx 文件');
          const relImgs = await relImages(zip, 'word/_rels/document.xml.rels', 'word/');
          Object.keys(relImgs).forEach(rid => imgs.push({ url: relImgs[rid].url, name: relImgs[rid].name }));
          const xml = await f.async('string');
          const nf = zip.file('word/numbering.xml');
          const numMap = nf ? parseNumbering(await nf.async('string')) : {};
          const numCounters = {};
          const paras = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
          paras.forEach(p => {
            const embeds = (p.match(/(?:r:embed|r:id|r:link)="[^"]+"/g) || [])
              .map(x => (x.match(/"([^"]+)"/) || [])[1]).filter(rid => rid && relImgs[rid]);
            const txt = (p.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || [])
              .map(x => decodeXml(x.replace(/<[^>]+>/g, ''))).join('').trim();
            const numId = (p.match(/<w:numId w:val="(\d+)"/) || [])[1];
            const ilvl = parseInt((p.match(/<w:ilvl w:val="(\d+)"/) || [])[1] || '0', 10);
            const label = (txt && numId && numId !== '0') ? numLabel(numMap, numCounters, numId, ilvl) : '';
            const atImg = p.search(/(?:r:embed|r:id|r:link)="/);
            const atTxt = p.indexOf('<w:t');
            const imgFirst = atImg >= 0 && (atTxt < 0 || atImg < atTxt);
            const pushImgs = () => embeds.forEach(rid => blocks.push({ t: 'img', src: relImgs[rid].url, name: relImgs[rid].name }));
            if (imgFirst) { pushImgs(); if (txt) addP(txt, label, ilvl); }
            else { if (txt) addP(txt, label, ilvl); if (embeds.length) pushImgs(); }
            if (!txt && !embeds.length) blocks.push({ t: 'p', text: '', i: -1 });
          });
        } else {
          const slides = Object.keys(zip.files)
            .filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p))
            .sort((a, b) => (parseInt(a.match(/slide(\d+)/)[1], 10) || 0) - (parseInt(b.match(/slide(\d+)/)[1], 10) || 0));
          for (const sp of slides) {
            const n = parseInt(sp.match(/slide(\d+)/)[1], 10) || 0;
            const relImgs = await relImages(zip, 'ppt/slides/_rels/' + sp.split('/').pop() + '.rels', 'ppt/slides/');
            const xml = await zip.file(sp).async('string');
            const paras = (xml.match(/<a:p>[\s\S]*?<\/a:p>/g) || []).map(pp =>
              (pp.match(/<a:t>[\s\S]*?<\/a:t>/g) || []).map(x => decodeXml(x.replace(/<[^>]+>/g, ''))).join('').trim()
            ).filter(Boolean);
            const pageImgs = Object.keys(relImgs).map(rid => ({ url: relImgs[rid].url, name: relImgs[rid].name }));
            pageImgs.forEach(x => imgs.push(x));
            blocks.push({ t: 'slide', n, paras, imgs: pageImgs });
            texts.push('【第 ' + n + ' 页】' + paras.join(' · '));
          }
          const allMedia = Object.keys(zip.files).filter(p => /^ppt\/media\//i.test(p) && /\.(png|jpe?g|gif|webp)$/i.test(p));
          for (const p of allMedia) {
            if (imgs.some(x => x.name === p.split('/').pop())) continue;
            try { imgs.push({ url: URL.createObjectURL(await zip.files[p].async('blob')), name: p.split('/').pop() }); } catch (e) {}
          }
        }
      } else throw new Error('只支持 docx / pptx / txt');
    } catch (err) {
      $('#apDocInfo').textContent = '读取失败：' + (err && err.message ? err.message : '未知错误');
      if (drop) drop.style.display = '';
      toast('读取失败：' + (err && err.message ? err.message : '未知错误'));
      return;
    }
    (state.doc.imgs || []).forEach(x => { if (x.url) URL.revokeObjectURL(x.url); });
    state.doc = { name: file.name, texts, imgs, blocks };
    $('#apDocInfo').textContent = file.name + ' · 文案 ' + texts.length + ' 段 · 图 ' + imgs.length + ' 张';
    renderDoc();
    toast(texts.length || imgs.length ? '已读取：' + texts.length + ' 段文案 / ' + imgs.length + ' 张图' : '这个文档里没抽到内容');
  }
  function renderDoc() {
    const box = $('#apDocBody');
    if (!box) return;
    if (!state.doc.name) { box.innerHTML = ''; return; }
    const b = state.doc.blocks || [];
    const html = b.map(x => {
      if (x.t === 'p') {
        if (!x.text) return '<div class="ap-dblank"></div>';
        const ind = (x.lvl ? ' style="padding-left:' + (x.lvl * 16) + 'px"' : '');
        const num = x.num ? '<span class="ap-dn">' + esc(x.num) + '</span>' : '';
        return '<p class="ap-dline' + (x.num ? ' ap-dnum' : '') + '" data-i="' + x.i + '"' + ind + ' title="点一下复制这段">' + num + esc(x.text) + '</p>';
      }
      if (x.t === 'img') return '<img class="ap-dimg" src="' + esc(x.src) + '" data-url="' + esc(x.src) + '" alt="" loading="lazy">';
      if (x.t === 'slide') {
        return '<div class="ap-dslide" data-n="' + x.n + '"><div class="ap-dslidehd">第 ' + x.n + ' 页</div>' +
          x.paras.map(t => '<div class="ap-dsline">' + esc(t) + '</div>').join('') +
          (x.imgs.length ? '<div class="ap-dsimg">' + x.imgs.map(im => '<img src="' + esc(im.url) + '" data-url="' + esc(im.url) + '" alt="" loading="lazy">').join('') + '</div>' : '') +
          '</div>';
      }
      return '';
    }).join('');
    box.innerHTML = '<div class="ap-paper">' + html + '</div>';
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); toast('已复制'); return; } catch (e) {}
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    (rootEl || document.body).appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    toast(ok ? '已复制' : '复制失败，请手动选中');
  }


  /* ---------- 本机素材：IndexedDB 存图，重启浏览器也在 ---------- */
  function idbOpen() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error('no idb')); return; }
      const rq = indexedDB.open('aplus_assets', 1);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        if (!db.objectStoreNames.contains('imgs')) db.createObjectStore('imgs', { keyPath: 'id' });
      };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
  }
  function idbTx(mode, fn) {
    return idbOpen().then(db => new Promise((res) => {
      try {
        const tx = db.transaction('imgs', mode);
        let out;
        const rq = fn(tx.objectStore('imgs'));
        if (rq) rq.onsuccess = () => { out = rq.result; };
        tx.oncomplete = () => res(out === undefined ? true : out);
        tx.onerror = () => res(false);
      } catch (e) { res(false); }
    })).catch(() => false);
  }
  function idbAll() {
    return idbTx('readonly', st => st.getAll()).then(r => Array.isArray(r) ? r : []);
  }
  function imgSize(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => { const d = { w: im.naturalWidth, h: im.naturalHeight }; URL.revokeObjectURL(url); res(d); };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
      im.src = url;
    });
  }
  async function loadAssets() {
    const rows = await idbAll();
    state.scan = rows.filter(r => r && r.blob).map(r => ({
      id: r.id, name: r.name || '', w: r.w || 0, h: r.h || 0, url: URL.createObjectURL(r.blob)
    }));
    renderScan();
  }
  async function importLocalImages(files, gid) {
    let n = 0;
    for (const f of files) {
      if (!/^image\//.test(f.type || '')) continue;
      const rec = { id: 'l' + Date.now() + '_' + n, name: f.name || '', w: 0, h: 0, blob: f };
      try { const d = await imgSize(f); rec.w = d.w; rec.h = d.h; } catch (e) {}
      const ok = await idbTx('readwrite', st => st.put(rec));
      if (ok === false) { toast('浏览器拒绝存图，这张只在本页有效'); }
      state.scan.push({ id: rec.id, name: rec.name, w: rec.w, h: rec.h, url: URL.createObjectURL(f) });
      if (gid) state.gidMap[rec.id] = gid;
      n++;
    }
    renderScan(); saveStore();
    const gname = gid && (state.groups.find(g => g.id === gid) || {}).name;
    toast(n ? ('已导入 ' + n + ' 张本机图片' + (gname ? ' → ' + gname : '') + '，下次打开还在') : '没读到图片');
  }
  function removeAsset(id, silent) {
    const it = state.scan.find(x => x.id === id);
    if (it && it.url) { try { URL.revokeObjectURL(it.url); } catch (e) {} }
    state.scan = state.scan.filter(x => x.id !== id);
    if (state.gidMap[id]) delete state.gidMap[id];
    idbTx('readwrite', st => st.delete(id));
    state.sel = (state.sel || []).filter(x => x !== id);
    if (!silent) { renderScan(); saveStore(); }
  }
  async function clearAssets() {
    state.scan.forEach(x => { try { URL.revokeObjectURL(x.url); } catch (e) {} });
    state.scan = [];
    state.gidMap = {};
    await idbTx('readwrite', st => st.clear());
    renderScan(); saveStore();
    toast('素材已清空');
  }
  /* 扫本页生成图 → 直接进收藏（待选），去重 */
  function scanPageImages() {
    const seen = new Set(), list = [];
    $$('img').forEach(img => {
      if (img.closest('#aplus-root')) return;
      const url = img.currentSrc || img.src || '';
      if (!url || seen.has(url)) return;
      const w = img.naturalWidth || img.width || 0, h = img.naturalHeight || img.height || 0;
      if (w < 120 || h < 120) return;
      const ratio = w / h;
      if (ratio > 5 || ratio < 0.2) return;
      seen.add(url);
      list.push({ url, w, h });
    });
    let added = 0;
    list.forEach((it, i) => {
      if (state.fav.some(f => f.url === it.url)) return;
      state.fav.push({ id: 'f' + Date.now() + '_' + i, url: it.url, w: it.w, h: it.h, module: '主视觉', note: '', st: 'pick' });
      added++;
    });
    if (added) saveStore();
    renderFav();
    toast(list.length ? ('本页 ' + list.length + ' 张图，新加入待选 ' + added + ' 张') : '本页暂无可用的图');
  }
  function scanInfo() {
    const info = $('#apScanInfo');
    if (!info) return;
    const n = state.scan.length, s = (state.sel || []).length;
    info.textContent = n ? (n + ' 张素材' + (s > 1 ? ' · 已选 ' + s + ' 张' : '')) : '';
    info.style.display = n ? 'block' : 'none';
  }
  /* 多选只改 class，不整块重渲染，免得打断双击 */
  function paintSel() {
    const grid = $('#apGrid');
    if (grid) [].forEach.call(grid.querySelectorAll('.ap-th'), el => {
      el.classList.toggle('sel', (state.sel || []).indexOf(el.dataset.iid) >= 0);
    });
    scanInfo();
  }
  let selAnchor = '';
  /* 当前操作涉及的 id 集合：右键的那张若在多选里，就整批处理 */
  function selIds(id) {
    const s = state.sel || [];
    if (id && s.length > 1 && s.indexOf(id) >= 0) return s.slice();
    return [id];
  }
  function renderScan() {
    const grid = $('#apGrid');
    if (!grid) return;
    state.sel = (state.sel || []).filter(id => state.scan.some(it => it.id === id));
    scanInfo();
    if (!state.scan.length) { grid.innerHTML = '<div class="ap-hint">还没有素材</div>'; return; }
    const cell = (it, i) => '<div class="ap-th' + ((state.sel || []).indexOf(it.id) >= 0 ? ' sel' : '') + '" draggable="true" data-iid="' + it.id + '" data-u="' + esc(it.url) + '" title="' + esc(it.name || '') + '"><img src="' + esc(it.url) + '" alt="" draggable="false"><span class="ap-th-n">' + pad2(i + 1) + '</span>' +
      (state.fav.some(f => f.url === it.url) ? '<span class="ap-star">★</span>' : '') + '</div>';
    const groups = state.groups || [];
    const gidOf = (id) => (state.gidMap || {})[id] || '';
    const known = new Set(groups.map(g => g.id));
    /* 没有组时保持原样的原单一网格 */
    if (!groups.length) {
      grid.innerHTML = '<div class="ap-grid">' + state.scan.map((it, i) => cell(it, i)).join('') + '</div>';
      return;
    }
    const out = [];
    const un = [];
    state.scan.forEach((it, i) => { if (!known.has(gidOf(it.id))) un.push([it, i]); });
    let head = '<div class="ap-grp ap-grp-none" data-g=""><span class="ap-gname">未分组</span><span class="ap-gn">' + un.length + '</span></div>';
    out.push(head + (un.length ? '<div class="ap-grid">' + un.map(([it, i]) => cell(it, i)).join('') + '</div>' : '<div class="ap-hint">空组</div>'));
    groups.forEach(g => {
      const rows = [];
      state.scan.forEach((it, i) => { if (gidOf(it.id) === g.id) rows.push([it, i]); });
      out.push(
        '<div class="ap-grp" data-g="' + esc(g.id) + '">' +
        '<span class="ap-gcaret" data-gact="fold">' + (g.fold ? '▸' : '▾') + '</span>' +
        '<span class="ap-gname" data-gact="ren" title="双击改组名">' + esc(g.name) + '</span>' +
        '<span class="ap-gn">' + rows.length + '</span>' +
        '<span class="ap-grow"></span>' +
        '<button class="ap-mini ap-gbtn" data-gact="add" title="把素材导进这个组">＋</button>' +
        '<button class="ap-mini ap-gbtn" data-gact="del" title="解散这个组（图回到未分组）">✕</button>' +
        '</div>' +
        (g.fold ? '' : (rows.length ? '<div class="ap-grid">' + rows.map(([it, i]) => cell(it, i)).join('') + '</div>' : '<div class="ap-hint">空组</div>'))
      );
    });
    grid.innerHTML = out.join('');
  }
  function favList() {
    return state.favFilter === 'all' ? state.fav.slice() : state.fav.filter(f => (f.st || 'pick') === state.favFilter);
  }
  function renderFav() {
    const list = favList();
    $('#apFavN').textContent = state.fav.length;
    $('#apExport').disabled = !list.length;
    $$('#apFavFilter button').forEach(b => b.classList.toggle('on', b.dataset.f === state.favFilter));
    $('#apFav').innerHTML = list.length
      ? list.map((f, i) => '<div class="ap-favrow" data-fid="' + f.id + '" data-u="' + esc(f.url) + '">' +
        '<div class="ap-favwrap"><img class="ap-favimg" src="' + esc(f.url) + '" alt="">' +
        '<i class="ap-st ' + (f.st === 'done' ? 'done' : 'pick') + '">' + (f.st === 'done' ? '定稿' : '待选') + '</i></div>' +
        '<div class="ap-favmain"><select class="ap-sel ap-mod" data-fid="' + f.id + '">' +
        MODULES.map(m => '<option' + (f.module === m ? ' selected' : '') + '>' + m + '</option>').join('') + '</select>' +
        '<input class="ap-inp ap-note" data-fid="' + f.id + '" placeholder="备注，会进文件名" value="' + esc(f.note || '') + '"></div>' +
        '<div class="ap-favact"><button class="ap-mini" data-fact="st" data-fid="' + f.id + '" title="切换定稿 / 待选">' + (f.st === 'done' ? '✓' : '○') + '</button>' +
        '<button class="ap-mini" data-fact="dl" data-fid="' + f.id + '">↓</button>' +
        '<button class="ap-mini" data-fact="rm" data-fid="' + f.id + '">✕</button></div></div>').join('')
      : '<div class="ap-hint">' + (state.favFilter === 'all' ? '还没有收藏' : '这个分组还是空的') + '</div>';
  }
  /* ---------- 右键菜单 ---------- */
  let ctxItem = null;
  let ctxPos = { x: 0, y: 0 };
  let pendingGid = '';   /* 「组内 ＋」导入时，新图归到这个组 */
  function openCtx(x, y, item) {
    ctxItem = item;
    ctxPos = { x: x, y: y };
    const m = $('#apCtx'), root = $('#aplus-root');
    if (!m || !root) return;
    const inScan = state.scan.some(s => (item.id && s.id === item.id) || s.url === item.url);
    const inFav = state.fav.some(f => f.url === item.url);
    [].forEach.call(m.querySelectorAll('button[data-act]'), b => {
      const a = b.getAttribute('data-act');
      if (a === 'unfav') b.style.display = inFav ? '' : 'none';
      else if (a === 'rmasset') b.style.display = inScan ? '' : 'none';
      else if (a === 'addasset') b.style.display = inScan ? 'none' : '';
      else if (a === 'togroup') b.style.display = (inScan && state.groups.length) ? '' : 'none';
    });
    const hit = state.scan.find(s => (item.id && s.id === item.id) || s.url === item.url);
    const n = hit ? selIds(hit.id).length : 0;
    const rmBtn = m.querySelector('button[data-act="rmasset"]');
    if (rmBtn) rmBtn.textContent = n > 1 ? ('移除选中的 ' + n + ' 张') : '从素材移除';
    const gpBtn = m.querySelector('button[data-act="togroup"]');
    if (gpBtn) gpBtn.textContent = n > 1 ? ('移到组…（' + n + ' 张）') : '移到组…';
    /* 菜单顺序统一按模板重排：复制图片在下半段，「加入素材」紧贴它下面。
       素材态没有「加入素材」，于是「复制图片」正好落在倒数第二。 */
    const ORDER = ['done', 'pick', 'note', 'togroup', 'dl', 'copy', 'addasset', 'rmasset', 'unfav'];
    const byAct = {};
    [].slice.call(m.querySelectorAll('button[data-act]')).forEach(b => { byAct[b.dataset.act] = b; });
    ORDER.forEach(k => { if (byAct[k] && byAct[k].parentNode === m) m.appendChild(byAct[k]); });
    m.classList.add('on');
    const mw = m.offsetWidth || 118, mh = m.offsetHeight || 150;
    m.style.left = Math.max(6, Math.min(x, window.innerWidth - mw - 8)) + 'px';
    m.style.top = Math.max(6, Math.min(y, window.innerHeight - mh - 8)) + 'px';
  }
  function closeCtx() {
    const m = $('#apCtx'); if (m) m.classList.remove('on');
    const p = $('#apGrpPick'); if (p) p.classList.remove('on');
  }
  /* 「移到组…」：列出 未分组 + 各组，点一下就把选中的图都归过去 */
  function openGrpPick(item, x, y) {
    const p = $('#apGrpPick');
    if (!p) return;
    const hit = state.scan.find(s => (item.id && s.id === item.id) || s.url === item.url);
    if (!hit) { toast('先把这张加入素材，再分组'); return; }
    const ids = selIds(hit.id);
    const cur = state.gidMap[hit.id] || '';
    const allSame = ids.every(id => (state.gidMap[id] || '') === cur);
    const rows = [{ id: '', name: '未分组' }].concat(state.groups.map(g => ({ id: g.id, name: g.name })));
    p.innerHTML = '<div class="ap-pickhd">' + (ids.length > 1 ? ('已选 ' + ids.length + ' 张，归到：') : '归到：') + '</div>' +
      rows.map(r =>
        '<button data-gid="' + esc(r.id) + '"' + (allSame && r.id === cur ? ' class="on"' : '') + '>' +
        (allSame && r.id === cur ? '✓ ' : '') + esc(r.name) + '</button>').join('');
    p.classList.add('on');
    const mw = p.offsetWidth || 118, mh = p.offsetHeight || 150;
    const px = typeof x === 'number' ? Math.max(6, Math.min(x, window.innerWidth - mw - 8)) : (window.innerWidth - mw) / 2;
    const py = typeof y === 'number' ? Math.max(6, Math.min(y + 6, window.innerHeight - mh - 8)) : 120;
    p.style.left = px + 'px';
    p.style.top = py + 'px';
    p.dataset.ids = JSON.stringify(ids);
    p.dataset.iid = hit.id;
  }
  function toPng(blob) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(blob);
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = im.naturalWidth || 1; c.height = im.naturalHeight || 1;
          c.getContext('2d').drawImage(im, 0, 0);
          c.toBlob(b => { URL.revokeObjectURL(url); b ? res(b) : rej(new Error('png')); }, 'image/png');
        } catch (e) { URL.revokeObjectURL(url); rej(e); }
      };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
      im.src = url;
    });
  }
  async function copyImage(url) {
    try {
      const r = await fetch(url);
      const blob = await r.blob();
      const png = /png/.test(blob.type) ? blob : await toPng(blob);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      toast('图片已复制，去对话框 Ctrl+V 粘贴就能上传');
    } catch (e) {
      toast('复制失败（图片源不允许读或剪贴板被拒），可先「另存这张」');
    }
  }
  async function addAssetFromUrl(item) {
    if (state.scan.some(s => s.url === item.url)) { toast('这张已经在素材里'); return; }
    try {
      const r = await fetch(item.url);
      const blob = await r.blob();
      const rec = { id: 'l' + Date.now(), name: (item.name || '参考图').slice(0, 40), w: item.w || 0, h: item.h || 0, blob };
      await idbTx('readwrite', st => st.put(rec));
      state.scan.push({ id: rec.id, name: rec.name, w: rec.w, h: rec.h, url: URL.createObjectURL(blob) });
      renderScan(); saveStore();
      toast('已加入素材（重启浏览器后仍在）');
    } catch (e) {
      toast('加入失败：这张图的行内地址读不到');
    }
  }
  function ctxAct(act) {
    const it = ctxItem;
    closeCtx();
    if (!it) return;
    if (act === 'copy') { copyImage(it.url); return; }
    if (act === 'addasset') { addAssetFromUrl(it); return; }
    if (act === 'togroup') { openGrpPick(it, ctxPos.x, ctxPos.y); return; }
    if (act === 'rmasset') {
      const hit = state.scan.find(s => (it.id && s.id === it.id) || s.url === it.url);
      if (hit) {
        const ids = selIds(hit.id);
        ids.forEach(id => removeAsset(id, true));
        state.sel = state.sel.filter(id => ids.indexOf(id) < 0);
        renderScan(); saveStore();
        toast(ids.length > 1 ? ('已从素材移除 ' + ids.length + ' 张') : '已从素材移除');
      }
      return;
    }
    if (act === 'done') { addFav(it, 'done'); return; }
    if (act === 'pick') { addFav(it, 'pick'); return; }
    if (act === 'unfav') {
      state.fav = state.fav.filter(f => f.url !== it.url);
      saveStore(); renderFav(); renderScan(); toast('已取消收藏');
      return;
    }
    if (act === 'note') {
      // 不弹系统 prompt（在隔离环境里不一定能拿到输入），直接把焦点打到收藏行的备注框
      if (!state.fav.some(f => f.url === it.url)) addFav(it, 'pick');
      renderFav();
      const inp = [].slice.call(document.querySelectorAll('#aplus-root .ap-note')).find(el => {
        const row = el.closest('.ap-favrow');
        return row && row.getAttribute('data-u') === it.url;
      });
      if (inp) {
        inp.focus();
        try { inp.select(); } catch (e) {}
        toast('在收藏行里写备注，会进文件名');
      }
      return;
    }
    if (act === 'dl') {
      saveOne(it).then(r => {
        if (r.canceled) { toast('已取消保存'); return; }
        if (r.ok) toast('已保存：' + (r.name || fileBase(it)));
        else toast('保存失败（' + (r.err || '链接可能已过期') + '）');
      });
    }
  }

  function addFav(item, st) {
    const status = st === 'done' ? 'done' : 'pick';
    const exist = state.fav.find(f => f.url === item.url);
    if (exist) {
      exist.st = status;
      if (item.w && !exist.w) { exist.w = item.w; exist.h = item.h; }
      saveStore(); renderFav(); renderScan();
      toast(status === 'done' ? '已标记定稿' : '已标记待选');
      return;
    }
    state.fav.push({ id: 'f' + Date.now(), url: item.url, w: item.w, h: item.h, module: '主视觉', note: '', st: status });
    saveStore();
    renderFav();
    renderScan();
    toast((status === 'done' ? '已定稿，' : '已加入待选，') + '共 ' + state.fav.length + ' 张');
  }

  /* ---------- 导出 ---------- */
  /* 文件名规则：模块（主图02 / A+03 …）+ 备注，例如 主图02_阀体右下水痕需修.png */
  function fileBase(it) {
    const note = (it.note || '').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '').slice(0, 18);
    const mod = (it.module || '').replace(/[\\/:*?"<>|]+/g, '');
    if (!mod) {
      // 还没归模块时（比如直接对素材另存），用图自己的文件名，不要一律叫「A+图」
      const nm = String(it.name || '').replace(/\.(png|jpe?g|webp|gif)$/i, '').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 24);
      return (nm || 'A+图') + (note ? '_' + note : '');
    }
    return mod + (note ? '_' + note : '');
  }
  function blobToDataURL(url) {
    return fetch(url).then(r => r.blob()).then(b => new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(b);
    }));
  }
  function sendDownload(url, filename) {
    return new Promise(res => {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        res({ ok: false, err: '仅扩展内可用' });
        return;
      }
      chrome.runtime.sendMessage({ type: 'aplus-download', url, filename: 'A+导出/' + filename }, res || (() => {}));
    });
  }
  async function downloadOne(it, idx) {
    let url = it.url, ext = '.png';
    try {
      const b = await urlToBlob(url);
      ext = extOf(b);
    } catch (e) {}
    if (/^blob:/.test(url)) {
      try { url = await blobToDataURL(url); } catch (e) { return false; }
    }
    const r = await sendDownload(url, fileBase(it, idx) + ext);
    return !!(r && r.ok);
  }
  function urlToBlob(url) {
    return fetch(url).then(r => {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.blob();
    });
  }
  /* 单张另存：文件名一律走「模块_备注」，位置跟设置走（问位置 → 保存对话框；否则下载目录） */
  async function saveOne(item) {
    const src = state.fav.find(f => f.url === item.url) || item;
    const base = fileBase(src);
    if (state.exLoc !== 'downloads' && typeof window.showSaveFilePicker === 'function') {
      // 必须紧跟点击手势弹窗，所以先问位置，再去取图
      let fh = null;
      try {
        fh = await window.showSaveFilePicker({
          id: 'aplus-save-one',
          suggestedName: base + '.png',
          startIn: 'desktop',
          types: [{ description: '图片', accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] } }]
        });
      } catch (e) {
        if (e && e.name === 'AbortError') return { ok: false, canceled: true };
        fh = null;
      }
      if (fh) {
        try {
          const blob = await urlToBlob(src.url);
          const w = await fh.createWritable();
          await w.write(blob);
          await w.close();
          return { ok: true, name: fh.name };
        } catch (e) {
          return { ok: false, err: (e && e.message) || '写入失败' };
        }
      }
    }
    let url = src.url, ext = '.png';
    try { ext = extOf(await urlToBlob(url)); } catch (e) {}
    try { if (/^blob:/.test(url)) url = await blobToDataURL(url); } catch (e) {}
    const r = await sendDownload(url, base + ext);
    if (r && r.ok) return { ok: true, name: base + ext };
    /* 大图走 downloads 可能失败（data URL 过长），回退到页面内 a 下载，名字照样生效 */
    try {
      const blob = await urlToBlob(src.url);
      const e2 = extOf(blob), a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = base + e2;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
      return { ok: true, name: base + e2 };
    } catch (e) {
      return { ok: false, err: (r && r.err) || '图片读不到（页面刷新过？）' };
    }
  }
  function extOf(blob) {
    const t = (blob && blob.type) || '';
    if (/jpeg|jpg/.test(t)) return '.jpg';
    if (/webp/.test(t)) return '.webp';
    if (/gif/.test(t)) return '.gif';
    return '.png';
  }
  function stamp() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }
  async function exportFav() {
    const list = favList();
    if (!list.length) { toast(state.fav.length ? '当前分组是空的' : '收藏是空的'); return; }
    const tag = state.favFilter === 'all' ? '' : '（' + (state.favFilter === 'done' ? '定稿' : '待选') + '）';

    // 逐张模式：直接走 Chrome 下载（落到下载目录 A+导出/）
    if (state.exportMode === 'files') {
      let ok = 0;
      for (let i = 0; i < list.length; i++) {
        if (await downloadOne(list[i], i)) ok++;
        await new Promise(r => setTimeout(r, 260));
      }
      toast('已触发下载 ' + ok + '/' + list.length + ' 张' + tag + '（在浏览器下载里查看）');
      return;
    }

    // 打包 zip：先申请保存位置（趁点击手势还有效，桌面/任意文件夹都能选）
    const groupTag = state.favFilter === 'all' ? '全部' : (state.favFilter === 'done' ? '定稿' : '待选');
    const zipName = 'A+导出_' + groupTag + '_' + list.length + '张_' + stamp() + '.zip';
    let fh = null, pickCanceled = false;
    if (state.exLoc !== 'downloads' && typeof window.showSaveFilePicker === 'function') {
      try {
        fh = await window.showSaveFilePicker({
          id: 'aplus-export',
          suggestedName: zipName,
          startIn: 'desktop',
          types: [{ description: 'ZIP 压缩包', accept: { 'application/zip': ['.zip'] } }]
        });
      } catch (e) {
        if (e && (e.name === 'AbortError' || /cancel/i.test(String(e.message || '')))) pickCanceled = true;
        fh = null;
      }
    }
    if (pickCanceled) { toast('已取消导出'); return; }

    toast('正在打包 ' + list.length + ' 张…');
    const zip = new JSZip();
    let ok = 0, fail = 0;
    const used = {};
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      try {
        const blob = await urlToBlob(it.url);
        // 同模块同备注重名时追加 -2、-3，避免覆盖
        const base = fileBase(it), ext = extOf(blob);
        let name = base + ext;
        if (used[name]) { used[name] += 1; name = base + '-' + used[name] + ext; }
        else used[name] = 1;
        zip.file(name, blob);
        ok++;
      } catch (e) { fail++; }
    }
    if (!ok) { toast('图片都读不到 —— 页面刷新过？请重新收藏后再导出'); return; }
    const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' });

    if (fh) {
      try {
        const w = await fh.createWritable();
        await w.write(out);
        await w.close();
        toast('已打包 ' + ok + ' 张' + tag + ' → ' + fh.name + (fail ? '；' + fail + ' 张读取失败' : ''));
        return;
      } catch (e) {
        toast('写入失败（' + (e.message || e) + '），改为普通下载');
      }
    }
    // 回退：普通下载（落到下载目录）
    const a = document.createElement('a');
    a.href = URL.createObjectURL(out);
    a.download = zipName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
    toast('已打包 ' + ok + ' 张' + tag + '，' + (fail ? fail + ' 张读取失败；' : '') + '在浏览器下载里另存到你想要的位置');
  }

  /* ---------- 事件 ---------- */
  function wire() {
    $('#apTitle').addEventListener('input', e => { state.title = e.target.value; saveStore(); });
    $('#apExtra').addEventListener('input', e => { state.extra = e.target.value; saveStore(); });
    $('#apPrompt').addEventListener('input', e => {
      state.prompts[state.active] = e.target.value;
      $('#apSaveState').textContent = '编辑中…';
      saveStore();
    });
    $('#apTabs').addEventListener('click', e => {
      const b = e.target.closest('[data-p]');
      if (!b) return;
      state.active = b.dataset.p;
      promptText().value = state.prompts[state.active];
      $('#apVerName').value = '';
      $('#apVerSel').value = '';
      renderTabs(); renderVers(); saveStore();
    });
    $('#apSave').addEventListener('click', () => {
      state.prompts[state.active] = promptText().value;
      saveStore();
      $('#apSaveState').textContent = '已保存 · ' + hhmm();
      toast('已保存（' + PNAME[state.active] + '）');
    });
    $('#apReset').addEventListener('click', () => {
      if (!window.confirm('恢复成预设文案？当前编辑内容会被替换。')) return;
      promptText().value = PRESET[state.active];
      state.prompts[state.active] = PRESET[state.active];
      saveStore();
      toast('已恢复预设');
    });
    $('#apVerSave').addEventListener('click', () => {
      if (!promptText().value.trim()) { toast('提示词是空的'); return; }
      const list = state.vers[state.active] = state.vers[state.active] || [];
      const name = ($('#apVerName').value || '').trim().slice(0, 18) || ('v' + (list.length + 1));
      list.push({ name, t: promptText().value, at: hhmm() });
      if (list.length > 6) list.shift();
      saveStore(); renderVers();
      $('#apVerSel').value = String(list.length - 1);
      toast('已存版本「' + name + '」');
    });
    $('#apVerSel').addEventListener('change', e => {
      if (e.target.value === '') return;
      const v = (state.vers[state.active] || [])[+e.target.value];
      if (!v) return;
      promptText().value = v.t;
      state.prompts[state.active] = v.t;
      $('#apVerName').value = v.name || '';
      saveStore();
      toast('已载入「' + (v.name || '') + '」');
    });
    $('#apVerDel').addEventListener('click', () => {
      const i = $('#apVerSel').value;
      if (i === '') { toast('先选一个版本'); return; }
      const list = state.vers[state.active] || [];
      const v = list[+i];
      if (!v) return;
      list.splice(+i, 1);
      saveStore(); renderVers();
      toast('已删除「' + (v.name || '') + '」');
    });
    $('#apImport').addEventListener('click', doImport);

    $('#apDiff').addEventListener('click', openDiff);
    $('#apDiffClose').addEventListener('click', () => $('#apDiffLayer').classList.remove('on'));
    $('#apDiffLayer').addEventListener('click', e => { if (e.target.id === 'apDiffLayer') $('#apDiffLayer').classList.remove('on'); });
    $('#apDiffA').addEventListener('change', renderDiff);
    $('#apDiffB').addEventListener('change', renderDiff);

    $('#apSnip').addEventListener('click', () => { renderSnips(); $('#apSnipLayer').classList.add('on'); });
    $('#apSnipClose').addEventListener('click', () => $('#apSnipLayer').classList.remove('on'));
    $('#apSnipLayer').addEventListener('click', e => { if (e.target.id === 'apSnipLayer') $('#apSnipLayer').classList.remove('on'); });
    $('#apSnipList').addEventListener('click', e => {
      const b = e.target.closest('[data-sn]');
      if (!b) return;
      const row = b.closest('.ap-snip');
      const s = state.snippets.find(x => x.id === row.dataset.sid);
      if (!s) return;
      if (b.dataset.sn === 'ins') { insertSnip(s.text); toast('已插入「' + s.name + '」'); }
      else {
        state.snippets = state.snippets.filter(x => x.id !== s.id);
        saveStore(); renderSnips(); toast('已删除片段');
      }
    });
    $('#apSnipAdd').addEventListener('click', () => {
      const text = ($('#apSnipText').value || '').trim();
      if (!text) { toast('片段内容是空的'); return; }
      const name = ($('#apSnipName').value || '').trim().slice(0, 20) || ('片段' + (state.snippets.length + 1));
      state.snippets.push({ id: 's' + Date.now(), name, text });
      saveStore();
      $('#apSnipName').value = ''; $('#apSnipText').value = '';
      renderSnips();
      toast('片段已保存');
    });

    $('#apScan').addEventListener('click', () => { pendingGid = ''; $('#apImgFile').click(); });
    $('#apImgFile').addEventListener('change', e => {
      const files = [].slice.call(e.target.files || []);
      e.target.value = '';
      if (files.length) importLocalImages(files, pendingGid);
      pendingGid = '';
    });
    /* 素材组 */
    $('#apGroupAdd').addEventListener('click', () => {
      const w = $('#apGroupNew');
      if (!w) return;
      const show = w.style.display === 'none';
      w.style.display = show ? 'flex' : 'none';
      if (show) { const i = $('#apGroupName'); i.value = ''; i.focus(); }
    });
    const doNewGroup = () => {
      const inp = $('#apGroupName');
      const name = (inp.value || '').trim().slice(0, 14);
      if (!name) { inp.focus(); return; }
      state.groups.push({ id: 'g' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name: name, fold: false });
      inp.value = '';
      $('#apGroupNew').style.display = 'none';
      renderScan(); saveStore();
      toast('已新建组「' + name + '」');
    };
    $('#apGroupDo').addEventListener('click', doNewGroup);
    $('#apGroupName').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); doNewGroup(); }
      if (e.key === 'Escape') $('#apGroupNew').style.display = 'none';
    });
    $('#apGrid').addEventListener('click', e => {
      const t = e.target.closest('[data-gact]');
      if (!t) return;
      const grp = t.closest('.ap-grp');
      const gid = grp ? grp.dataset.g : '';
      if (!gid) return;
      const g = state.groups.find(x => x.id === gid);
      if (!g) return;
      const act = t.dataset.gact;
      if (act === 'fold') { g.fold = !g.fold; renderScan(); saveStore(); }
      else if (act === 'del') {
        state.groups = state.groups.filter(x => x.id !== gid);
        Object.keys(state.gidMap).forEach(k => { if (state.gidMap[k] === gid) delete state.gidMap[k]; });
        renderScan(); saveStore();
        toast('已解散组「' + g.name + '」，图回到未分组');
      } else if (act === 'add') {
        pendingGid = gid; $('#apImgFile').click();
      } else if (act === 'ren') {
        const inp = document.createElement('input');
        inp.className = 'ap-inp ap-ginp';
        inp.value = g.name;
        inp.maxLength = 14;
        t.replaceWith(inp);
        inp.focus(); inp.select();
        const commit = () => {
          const v = (inp.value || '').trim().slice(0, 14);
          if (v) g.name = v;
          renderScan(); saveStore();
        };
        inp.addEventListener('keydown', ev => {
          if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
          if (ev.key === 'Escape') { renderScan(); }
        });
        inp.addEventListener('blur', commit);
      }
    });
    /* 缩略图多选：单击单选、Ctrl 点加选、Shift 点连选；点空白取消 */
    $('#apGrid').addEventListener('click', e => {
      if (e.target.closest('[data-gact]')) return;
      const th = e.target.closest('.ap-th');
      if (!th) { if ((state.sel || []).length) { state.sel = []; selAnchor = ''; paintSel(); } return; }
      const id = th.dataset.iid;
      const order = [].map.call($('#apGrid').querySelectorAll('.ap-th'), el => el.dataset.iid);
      if (e.shiftKey && selAnchor && order.indexOf(selAnchor) >= 0) {
        const a = order.indexOf(selAnchor), b = order.indexOf(id);
        state.sel = order.slice(Math.min(a, b), Math.max(a, b) + 1);
      } else if (e.ctrlKey || e.metaKey) {
        const i = (state.sel || []).indexOf(id);
        if (i >= 0) state.sel.splice(i, 1); else state.sel.push(id);
        selAnchor = id;
      } else {
        state.sel = [id]; selAnchor = id;
      }
      paintSel();
    });
    $('#apScanClear').addEventListener('click', () => {
      if (!state.scan.length) { toast('素材本来就是空的'); return; }
      if (!window.confirm('清空全部本机素材？')) return;
      clearAssets();
    });
    $('#apScanPage').addEventListener('click', scanPageImages);

    // 文档预览
    $('#apDocPick').addEventListener('click', () => $('#apDocFile').click());
    $('#apDocFile').addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (f) openDoc(f);
    });
    // 空态投放区：点一下就等于点「选文件」，也接住从桌面拖进来的 docx/pptx
    (function () {
      const drop = $('#apDrop');
      if (!drop) return;
      drop.addEventListener('click', () => $('#apDocFile').click());
      const stop = e => { e.preventDefault(); e.stopPropagation(); };
      drop.addEventListener('dragenter', e => { stop(e); drop.classList.add('on'); });
      drop.addEventListener('dragover', e => { stop(e); drop.classList.add('on'); });
      drop.addEventListener('dragleave', e => { stop(e); drop.classList.remove('on'); });
      drop.addEventListener('drop', e => {
        stop(e);
        drop.classList.remove('on');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) openDoc(f);
      });
    })();
    $('#apDocClear').addEventListener('click', () => {
      (state.doc.imgs || []).forEach(x => { if (x.url) URL.revokeObjectURL(x.url); });
      state.doc = { name: '', texts: [], imgs: [] };
      const info = $('#apDocInfo');
      info.textContent = '';
      info.style.display = 'none';
      const drop = $('#apDrop');
      if (drop) drop.style.display = '';
      renderDoc();
      toast('文档已清空');
    });
    $('#apDocCopyAll').addEventListener('click', () => {
      if (!state.doc.texts.length) { toast('文档是空的'); return; }
      copyText(state.doc.texts.join('\n'));
    });
    $('#apDocBody').addEventListener('click', e => {
      const line = e.target.closest('.ap-dline');
      if (line) { copyText(state.doc.texts[+line.dataset.i] || ''); return; }
      const sline = e.target.closest('.ap-dsline');
      if (sline) {
        const slide = sline.closest('.ap-dslide');
        const n = slide ? slide.dataset.n : '';
        copyText((state.doc.texts.find(t => t.indexOf('【第 ' + n + ' 页】') === 0) || '').replace(/^【第 \d+ 页】/, '') || sline.textContent);
        return;
      }
      const img = e.target.closest('img.ap-dimg, .ap-dsimg img');
      if (img) {
        const url = img.getAttribute('data-url');
        openView({ url, w: 0, h: 0 });
      }
    });
    /* 素材卡拖到组标题上 = 直接归组（PS 里把图层拖进文件夹的手感） */
    let dragIds = [], lastDragAt = 0;
    const gridEl = $('#apGrid');
    if (gridEl) {
      gridEl.addEventListener('dragstart', e => {
        const th = e.target.closest && e.target.closest('.ap-th');
        if (!th) return;
        dragIds = selIds(th.dataset.iid);
        th.classList.add('ap-dragging');
        try {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', dragIds.join(','));
          const im = th.querySelector('img');
          if (im) e.dataTransfer.setDragImage(im, 20, 20);
        } catch (err) {}
      });
      gridEl.addEventListener('dragend', () => {
        lastDragAt = Date.now();
        [].forEach.call(gridEl.querySelectorAll('.ap-th'), el => el.classList.remove('ap-dragging'));
        [].forEach.call(gridEl.querySelectorAll('.ap-grp'), el => el.classList.remove('drop-hover'));
        dragIds = [];
      });
      gridEl.addEventListener('dragover', e => {
        const hd = e.target.closest && e.target.closest('.ap-grp');
        if (!hd || !dragIds.length) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
        [].forEach.call(gridEl.querySelectorAll('.ap-grp'), el => el.classList.toggle('drop-hover', el === hd));
      });
      gridEl.addEventListener('drop', e => {
        const hd = e.target.closest && e.target.closest('.ap-grp');
        if (!hd) return;
        e.preventDefault();
        lastDragAt = Date.now();
        const gid = hd.getAttribute('data-g') || '';
        const ids = dragIds.slice();
        dragIds = [];
        [].forEach.call(gridEl.querySelectorAll('.ap-grp'), el => el.classList.remove('drop-hover'));
        if (!ids.length) return;
        state.gidMap = state.gidMap || {};
        ids.forEach(id => { if (gid) state.gidMap[id] = gid; else delete state.gidMap[id]; });
        saveStore(); renderScan();
        const g = (state.groups || []).find(x => x.id === gid);
        toast(g ? ('已移到「' + g.name + '」' + (ids.length > 1 ? '（' + ids.length + ' 张）' : '')) : '已移回「未分组」');
      });
    }
    $('#apGrid').addEventListener('click', e => {
      if (Date.now() - lastDragAt < 600) return;   // 刚拖完不当作点击
      const th = e.target.closest('.ap-th');
      if (!th) return;
      const item = state.scan.find(x => x.id === th.dataset.iid);
      if (!item) return;
      openView(item);
    });
    $('#apViewClose').addEventListener('click', () => $('#apView').classList.remove('on'));
    $('#apView').addEventListener('click', e => { if (e.target.id === 'apView') $('#apView').classList.remove('on'); });
    $('#apViewFav').addEventListener('click', () => { if (viewItem) addFav(viewItem, 'done'); });

    // 大图：滚轮缩放 + 拖动平移
    const vb = $('#apViewBody');
    if (vb) {
      vb.addEventListener('wheel', e => {
        if (!vb.querySelector('img')) return;
        e.preventDefault();
        const step = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        viewZoom = Math.min(6, Math.max(0.25, viewZoom * step));
        applyView();
      }, { passive: false });
      let pan = null;
      vb.addEventListener('pointerdown', e => {
        if (e.target.tagName !== 'IMG') return;
        pan = { x: e.clientX, y: e.clientY, px: viewPan.x, py: viewPan.y };
        vb.classList.add('dragging');
        try { vb.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      });
      vb.addEventListener('pointermove', e => {
        if (!pan) return;
        viewPan = { x: pan.px + (e.clientX - pan.x), y: pan.py + (e.clientY - pan.y) };
        applyView();
      });
      const endPan = () => { pan = null; vb.classList.remove('dragging'); };
      vb.addEventListener('pointerup', endPan);
      vb.addEventListener('pointercancel', endPan);
    }

    // 双击任意面板里的图 → 居中放大查看
    $('#aplus-root').addEventListener('dblclick', e => {
      if (e.target.closest('input,select,textarea,button')) return;
      if (e.target.closest('#apViewBody img')) { resetView(); return; }
      const th = e.target.closest('.ap-th');
      const fr = e.target.closest('.ap-favrow');
      const dimg = e.target.closest('.ap-dimg, .ap-dsimg img');
      let item = null;
      if (th) item = state.scan.find(x => x.id === th.dataset.iid) || null;
      else if (fr) item = state.fav.find(x => x.id === fr.dataset.fid) || null;
      else if (dimg) {
        const u = dimg.getAttribute('data-url');
        item = state.scan.find(x => x.url === u) || state.fav.find(x => x.url === u) ||
          { id: 'd' + Date.now(), url: u, w: 0, h: 0 };
      }
      if (!item || !item.url) return;
      e.preventDefault();
      openView(item);
    });

    // 缩略图大小（只留素材那块）
    [['#apThumbG', 'g']].forEach(([sel, k]) => {
      const el = $(sel);
      if (!el) return;
      el.addEventListener('input', ev => {
        state.thumb[k] = parseInt(ev.target.value, 10) || (k === 'g' ? 92 : 54);
        applyThumb();
      });
      el.addEventListener('change', () => saveStore());
    });

    // 三个输入框（标题卖点 / 辅助信息 / 提示词）拖右下角改高度，并记住
    (function () {
      const map = { apTitle: 'title', apExtra: 'extra', apPrompt: 'prompt' };
      let t = 0;
      const save = () => { clearTimeout(t); t = setTimeout(saveStore, 320); };
      if (!window.ResizeObserver) return;
      const ro = new ResizeObserver(list => {
        list.forEach(en => {
          const el = en.target, key = map[el.id];
          if (!key) return;
          const h = Math.round(el.getBoundingClientRect().height);
          if (h < 40) return;
          state.taH = state.taH || {};
          if (Math.abs((state.taH[key] || 0) - h) > 3) { state.taH[key] = h; save(); }
        });
      });
      Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) ro.observe(el); });
    })();

    // 折叠区 + 收藏筛选
    $$('.ap-fold').forEach(b => b.addEventListener('click', () => {
      const sec = b.dataset.sec;
      state.ui[sec] = !state.ui[sec];
      const box = $('.ap-sec[data-sec="' + sec + '"]');
      if (box) box.classList.toggle('off', !state.ui[sec]);
      b.textContent = state.ui[sec] ? '▾' : '▸';
      saveStore();
    }));
    $('#apFavFilter').addEventListener('click', e => {
      const b = e.target.closest('button[data-f]');
      if (!b) return;
      state.favFilter = b.dataset.f;
      renderFav(); saveStore();
    });

    // 页面对话区里的图：右键直接定稿 / 待选（不限于面板里的缩略图）
    document.addEventListener('contextmenu', e => {
      const img = (e.target && e.target.tagName === 'IMG') ? e.target : null;
      if (!img) return;
      if (img.closest && img.closest('#aplus-root')) return;
      const w = img.naturalWidth || img.width || 0, h = img.naturalHeight || img.height || 0;
      if (w < 120 || h < 120) return;
      const url = img.currentSrc || img.src || '';
      if (!url) return;
      e.preventDefault(); e.stopPropagation();
      const item = state.fav.find(x => x.url === url) || state.scan.find(x => x.url === url) || { id: 'p' + Date.now(), url, w, h };
      openCtx(e.clientX, e.clientY, item);
    }, true);

    // 右键：缩略图 / 收藏行 / 大图 / 文档里的插图 都能出菜单
    $('#aplus-root').addEventListener('contextmenu', e => {
      const th = e.target.closest('.ap-th');
      const fr = e.target.closest('.ap-favrow');
      const big = e.target.closest('#apViewBody img');
      const dimg = e.target.closest('.ap-dimg, .ap-dsimg img');
      if (!th && !fr && !big && !dimg) return;
      e.preventDefault(); e.stopPropagation();
      if (th) {
        const tid = th.dataset.iid;
        if ((state.sel || []).indexOf(tid) < 0) { state.sel = [tid]; selAnchor = tid; paintSel(); }
      }
      const u = (th && th.getAttribute('data-u')) || (fr && fr.getAttribute('data-u')) ||
        (dimg && dimg.getAttribute('data-url')) || (viewItem && viewItem.url) || '';
      if (!u) return;
      const item = state.fav.find(x => x.url === u) || state.scan.find(x => x.url === u) ||
        (viewItem && viewItem.url === u ? viewItem : { id: 'd' + Date.now(), url: u, w: 0, h: 0 });
      openCtx(e.clientX, e.clientY, item);
    });
    $('#apCtx').addEventListener('click', e => {
      const b = e.target.closest('button[data-act]');
      if (b) ctxAct(b.getAttribute('data-act'));
    });
    $('#apGrpPick').addEventListener('click', e => {
      const b = e.target.closest('button[data-gid]');
      if (!b) return;
      const p = $('#apGrpPick');
      const iid = p.dataset.iid;
      const gid = b.dataset.gid;
      let ids = [iid];
      try { ids = JSON.parse(p.dataset.ids || '[]') || [iid]; } catch (err) { ids = [iid]; }
      closeCtx();
      if (!iid) return;
      ids.forEach(id => { if (gid) state.gidMap[id] = gid; else delete state.gidMap[id]; });
      renderScan(); saveStore();
      const g = gid ? state.groups.find(x => x.id === gid) : null;
      toast((ids.length > 1 ? ('已把 ' + ids.length + ' 张') : '已') + (g ? ('移到「' + g.name + '」') : '移回未分组'));
    });
    document.addEventListener('pointerdown', e => {
      if (!e.target.closest || !e.target.closest('#apCtx, #apGrpPick')) closeCtx();
    }, true);

    $('#apFav').addEventListener('click', e => {
      const b = e.target.closest('[data-fact]');
      if (!b) return;
      const f = state.fav.find(x => x.id === b.dataset.fid);
      if (!f) return;
      const act = b.dataset.fact;
      if (act === 'rm') {
        state.fav = state.fav.filter(x => x.id !== f.id);
        saveStore(); renderFav(); renderScan();
      } else if (act === 'st') {
        f.st = (f.st === 'done' ? 'pick' : 'done');
        saveStore(); renderFav(); renderScan();
        toast(f.st === 'done' ? '已标记定稿' : '已改为待选');
      } else {
        /* ↓ 与右键「另存这张」走同一套：文件名「模块_备注」，位置跟设置走 */
        saveOne(f).then(r => {
          if (r && r.ok) toast('已保存：' + (r.name || fileBase(f) + '.png'));
          else if (r && r.canceled) toast('已取消保存');
          else toast('保存失败：' + ((r && r.err) || '链接可能已过期，试试右键另存'));
        });
      }
    });
    $('#apFav').addEventListener('change', e => {
      const f = state.fav.find(x => x.id === e.target.dataset.fid);
      if (!f) return;
      if (e.target.classList.contains('ap-mod')) f.module = e.target.value;
      if (e.target.classList.contains('ap-note')) f.note = e.target.value;
      saveStore();
    });
    $('#apExport').addEventListener('click', exportFav);
    $('#apClearFav').addEventListener('click', () => {
      if (!state.fav.length) { toast('收藏已经是空的'); return; }
      const n = state.fav.length;
      if (!window.confirm('清空 ' + n + ' 张收藏？\n（只是取消定稿/待选标记，图片本身和已导出的文件不受影响）')) return;
      state.fav = [];
      state.favFilter = 'all';
      renderFav(); saveStore();
      toast('已清空 ' + n + ' 张收藏');
    });

    $('#apTheme').addEventListener('click', () => { renderSet(); renderPresets(); $('#apSetLayer').classList.add('on'); });
    $('#apSetClose').addEventListener('click', () => $('#apSetLayer').classList.remove('on'));
    $('#apSetLayer').addEventListener('click', e => { if (e.target.id === 'apSetLayer') $('#apSetLayer').classList.remove('on'); });
    $$('#apSetTheme button').forEach(b => {
      b.addEventListener('click', () => {
        state.theme = b.dataset.t;
        applyLook(); saveStore();
        toast('版面配色：' + b.textContent);
      });
    });
    $$('#apSetAccent .ap-swatch').forEach(b => {
      b.addEventListener('click', () => {
        state.accent = b.dataset.c || '';
        applyLook(); saveStore();
        toast(state.accent ? ('强调色 ' + state.accent) : '强调色跟随主题');
      });
    });
    $('#apSetPick').addEventListener('input', e => {
      state.accent = e.target.value;
      applyLook(); saveStore();
    });
    $$('#apSetFs button').forEach(b => {
      b.addEventListener('click', () => {
        state.fs = parseFloat(b.dataset.s) || 1;
        applyLook(); saveStore();
        toast('文字大小：' + b.textContent);
      });
    });
    $('#apSetReset').addEventListener('click', () => {
      state.theme = 'light'; state.accent = ''; state.fs = 1;
      applyLook(); saveStore();
      toast('外观已恢复默认');
    });
    $$('#apSetRatio button').forEach(b => {
      b.addEventListener('click', () => {
        state.ratio = b.dataset.r || 'doc';
        applyGeom(state.width, state.h, state.x, state.y, false);
        renderSet(); saveStore();
        toast('横排比例：' + (RATIO_NAME[state.ratio] || '文档优先'));
      });
    });
    const logTog = $('#apLogTog');
    if (logTog) {
      logTog.addEventListener('click', () => {
        state.ui.log = state.ui.log !== true;
        renderSet(); saveStore();
      });
    }
    $$('#apSetExport button').forEach(b => {
      b.addEventListener('click', () => {
        const m = b.dataset.m;
        if (m === 'files') { state.exportMode = 'files'; }
        else { state.exportMode = 'zip'; state.exLoc = (m === 'zipdown') ? 'downloads' : 'ask'; }
        renderSet(); saveStore();
        toast(m === 'files' ? '导出方式：逐张下载到 下载/A+导出'
          : (m === 'zipdown' ? '导出方式：zip 直接存到浏览器下载目录' : '导出方式：zip，每次弹窗选位置'));
      });
    });
    $('#apPickLoc').addEventListener('click', async () => {
      if (typeof window.showSaveFilePicker !== 'function') { toast('这个浏览器不支持指定位置，导出会落到下载目录'); return; }
      try {
        const h = await window.showSaveFilePicker({
          id: 'aplus-export',
          startIn: 'desktop',
          suggestedName: 'A+导出_定稿_位置示例.zip',
          types: [{ description: 'ZIP 压缩包', accept: { 'application/zip': ['.zip'] } }]
        });
        state.locName = h && h.name ? '上次选的目录' : '已记住';
        renderSet(); saveStore();
        toast('已记住这个位置，之后导出默认打开它');
      } catch (e) {
        if (e && e.name === 'AbortError') toast('已取消');
        else toast('设置失败：' + ((e && e.message) || e));
      }
    });
    $('#apSetMain').addEventListener('click', () => {
      state.ui.main = state.ui.main === false;
      applyTabs(); saveStore();
      toast(state.ui.main === false ? '已隐藏「白底主图」页签' : '已显示「白底主图」页签');
    });
    $('#apSetAway').addEventListener('click', () => {
      state.autoHide = state.autoHide === false;
      applyAwaySwitch(); saveStore();
      toast(state.autoHide === false ? '大图模式不再自动隐藏面板' : '大图模式会自动收起面板');
    });
    $('#apSetDodge').addEventListener('click', () => {
      state.dodgeSide = state.dodgeSide === false;
      applySideSwitch(); saveStore();
      toast(state.dodgeSide === false ? '对话栏弹出时面板不再让位' : '对话栏弹出时面板会自动往右让开');
    });
    $('#apSetHideLeft').addEventListener('click', () => {
      state.hideLeftSide = !state.hideLeftSide;
      applySideSwitch(); saveStore();
      toast(state.hideLeftSide ? '对话栏弹出时，中线左侧的面板会暂时隐藏' : '左侧面板不再暂时隐藏');
    });
    if ($('#apPreTitle')) $('#apPreTitle').addEventListener('input', e => { state.preTitle = e.target.value; saveStore(); });
    if ($('#apPreInfo')) $('#apPreInfo').addEventListener('input', e => { state.preInfo = e.target.value; saveStore(); });
    if ($('#apSetPrefix')) $('#apSetPrefix').addEventListener('click', () => {
      state.showPrefix = state.showPrefix === false;
      applyPrefixSwitch(); saveStore();
      toast(state.showPrefix === false ? '导入时不再带「标题：」「辅助信息：」前缀' : '导入时会带上前缀');
    });

    // 版面预设：存 / 用 / 删
    const presetSave = () => {
      const inp = $('#apPresetName');
      const name = (inp && inp.value || '').trim().slice(0, 24) || ('版面 ' + (state.layouts.length + 1));
      const snap = snapLayout();
      const idx = state.layouts.findIndex(p => p.name === name);
      if (idx >= 0) state.layouts[idx].snap = snap;
      else state.layouts.push({ name: name, snap: snap });
      if (state.layouts.length > 12) state.layouts.shift();
      if (inp) inp.value = '';
      renderPresets(); saveStore();
      toast('已存为版面预设「' + name + '」');
    };
    $('#apPresetAdd').addEventListener('click', presetSave);
    $('#apPresetName').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); presetSave(); }
    });
    $('#apPresetList').addEventListener('click', e => {
      const row = e.target.closest('.ap-presetrow');
      const btn = e.target.closest('button[data-act]');
      if (!row || !btn) return;
      const p = state.layouts[+row.dataset.i];
      if (!p) return;
      if (btn.dataset.act === 'del') {
        state.layouts.splice(+row.dataset.i, 1);
        renderPresets(); saveStore();
        toast('已删除预设「' + p.name + '」');
      } else {
        $('#apSetLayer').classList.remove('on');
        applyPreset(p.snap, p.name);
        renderPresets();
      }
    });
    $('#apHide').addEventListener('click', () => setCollapsed(true));
    $('#apCollapsed').addEventListener('click', () => setCollapsed(false));
    $('#apDock').addEventListener('click', dockRight);
    $$('.ap-padfold').forEach(b => {
      b.addEventListener('click', () => {
        const p = b.dataset.pad;
        state.pads[p] = !state.pads[p];
        applyPads();
        applyPadBox(p, false);
        saveStore();
      });
    });
    $$('.ap-padout').forEach(b => {
      b.addEventListener('click', () => setPadOut(b.dataset.pad, !state.out[b.dataset.pad]));
    });
    $('#apLayout').addEventListener('click', () => {
      state.layout = state.layout === 'row' ? 'col' : 'row';
      applyGeom(state.width, state.h, state.x, state.y);
      toast(state.layout === 'row' ? '三个作业区横排' : '三个作业区竖排');
    });
    // 双击标题条：折叠 / 展开
    $('#apHd').addEventListener('dblclick', e => {
      if (e.target.closest('button')) return;
      setCollapsed(!state.collapsed);
    });

    // 快捷键
    document.addEventListener('keydown', e => {
      // Ctrl+Shift+H：一键临时收起 / 唤回面板（只想看整屏版面时用）
      if (e.ctrlKey && e.shiftKey && (e.code === 'KeyH' || /^h$/i.test(e.key || ''))) {
        e.preventDefault(); e.stopPropagation();
        toggleHide();
        return;
      }
      if (e.ctrlKey && e.key === 'Enter') {
        const t = e.target;
        if (t && t.closest && t.closest('#aplus-root')) { e.preventDefault(); e.stopPropagation(); doImport(); }
        return;
      }
      // 版面预设：Ctrl+Shift+1~9 直接套用第 N 套预设
      // 注意：按 Shift 时 e.key 会变成 '!' '#' 等符号，必须用 e.code(DigitN) 判断
      if (e.ctrlKey && e.shiftKey) {
        let n = 0;
        const byCode = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
        if (byCode) n = +byCode[1];
        else if (/^[1-9]$/.test(e.key || '')) n = +e.key;
        else {
          const sym = '!@#$%^&*('.indexOf(e.key || '');
          if (sym >= 0) n = sym + 1;
        }
        if (!n) return;
        e.preventDefault(); e.stopPropagation();
        const preset = Array.isArray(state.layouts) ? state.layouts[n - 1] : null;
        if (preset) {
          applyPreset(preset.snap, preset.name);
          renderPresets();
        } else {
          toast('还没有第 ' + n + ' 套预设（设置里可存）');
        }
      }
    }, true);

    // 窗口尺寸变化：面板跟着回到可视区（原来贴右的继续贴右）
    let rzT = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rzT);
      rzT = setTimeout(relayoutOnResize, 140);
    });
  }

  /* ---------- 版本对比 ---------- */
  function lineDiff(a, b) {
    const A = String(a || '').split('\n'), B = String(b || '').split('\n');
    const n = A.length, m = B.length, dp = [];
    for (let i = 0; i <= n; i++) dp.push(new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push(['=', A[i]]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(['-', A[i]]); i++; }
      else { out.push(['+', B[j]]); j++; }
    }
    while (i < n) { out.push(['-', A[i]]); i++; }
    while (j < m) { out.push(['+', B[j]]); j++; }
    return out;
  }
  function renderDiff() {
    const list = state.vers[state.active] || [];
    const a = list[+$('#apDiffA').value], b = list[+$('#apDiffB').value];
    if (!a || !b) { $('#apDiffBody').innerHTML = '<div class="ap-hint" style="padding:8px">先选两个版本</div>'; return; }
    let add = 0, del = 0;
    $('#apDiffBody').innerHTML = lineDiff(a.t, b.t).map(r => {
      if (r[0] === '+') add++;
      if (r[0] === '-') del++;
      const cls = r[0] === '+' ? 'add' : (r[0] === '-' ? 'del' : '');
      const sg = r[0] === '+' ? '+' : (r[0] === '-' ? '−' : '·');
      return '<div class="dl ' + cls + '"><span class="s">' + sg + '</span><span>' + (esc(r[1]) || '&nbsp;') + '</span></div>';
    }).join('');
    $('#apDiffStat').textContent = '新增 ' + add + ' · 删除 ' + del;
  }
  function openDiff() {
    const list = state.vers[state.active] || [];
    if (list.length < 2) { toast('至少存两个版本才能对比'); return; }
    const opts = list.map((v, i) => '<option value="' + i + '">' + esc((v.name || ('v' + (i + 1))) + (v.at ? ' · ' + v.at : '')) + '</option>').join('');
    $('#apDiffA').innerHTML = opts;
    $('#apDiffB').innerHTML = opts;
    $('#apDiffA').value = String(list.length - 2);
    $('#apDiffB').value = String(list.length - 1);
    renderDiff();
    $('#apDiffLayer').classList.add('on');
  }

  let viewItem = null, viewZoom = 1, viewPan = { x: 0, y: 0 };
  function applyView() {
    const im = $('#apViewBody img');
    const z = $('#apViewZoom');
    if (z) z.textContent = Math.round(viewZoom * 100) + '%';
    if (!im) return;
    im.style.setProperty('transform', 'translate(' + viewPan.x + 'px,' + viewPan.y + 'px) scale(' + viewZoom + ')', 'important');
  }
  function resetView() { viewZoom = 1; viewPan = { x: 0, y: 0 }; applyView(); }
  function openView(item) {
    viewItem = item;
    viewZoom = 1; viewPan = { x: 0, y: 0 };
    $('#apViewName').textContent = '图片 ' + (item.w ? item.w + ' × ' + item.h : '');
    $('#apViewBody').innerHTML = '<img src="' + esc(item.url) + '" alt="" draggable="false">';
    $('#apViewMeta').textContent = (state.fav.some(f => f.url === item.url) ? '已在收藏里' : '未收藏') +
      ' · 滚轮缩放 / 按住拖动平移 / 双击图片复位';
    applyView();
    const im = $('#apViewBody img');
    if (im && !item.w) im.addEventListener('load', () => {
      $('#apViewName').textContent = '图片 ' + im.naturalWidth + ' × ' + im.naturalHeight;
    });
    $('#apView').classList.add('on');
  }

  function setCollapsed(v) {
    state.collapsed = v;
    const root = $('#aplus-root');
    if (!root) return;
    root.classList.toggle('collapsed', v);
    applyGeom(state.width, state.h, state.x, state.y, false);
    saveStore();
    if (!v) setTimeout(() => toast('已展开'), 60);
  }

  /* ---------- 面板几何：浮动位置 / 尺寸（PS 式） ---------- */
  function clampGeom(w, h, x, y) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const width = Math.min(Math.max(320, Math.min(1400, Math.round(w))), Math.max(320, vw - 16));
    const fallbackH = Math.min(800, vh - 120);
    const height = state.collapsed ? 38 : Math.max(220, Math.min(vh - 20, Math.round(h || fallbackH)));
    const maxX = Math.max(4, vw - width - 8);
    const maxY = Math.max(4, vh - 40);
    return {
      w: width, h: height,
      x: Math.max(4, Math.min(maxX, Math.round(x))),
      y: Math.max(4, Math.min(maxY, Math.round(y)))
    };
  }
  function defaultGeom() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = vw >= 1500 ? 900 : (vw < 1100 ? Math.max(360, Math.round(vw * 0.72)) : 780);
    return { w, h: Math.round(Math.min(800, vh - 120)), x: vw - w - 16, y: 56 };
  }
  function applyGeom(w, h, x, y, remember) {
    const d = defaultGeom();
    if (!w) w = d.w;
    if (!h) h = d.h;
    if (x == null) x = d.x;
    if (y == null) y = d.y;
    const g = clampGeom(w, h, x, y);
    state.width = g.w;
    if (!state.collapsed) state.h = g.h;
    state.x = g.x; state.y = g.y;
    const root = $('#aplus-root');
    if (root) {
      root.style.setProperty('width', (state.collapsed ? 240 : g.w) + 'px', 'important');
      root.style.setProperty('height', (state.collapsed ? 38 : g.h) + 'px', 'important');
      root.style.setProperty('left', g.x + 'px', 'important');
      root.style.setProperty('top', g.y + 'px', 'important');
      root.style.setProperty('right', 'auto', 'important');
      root.classList.toggle('narrow', g.w < 620);
      if (state.collapsed) root.classList.add('collapsed');
      else root.classList.remove('collapsed');
      const body = $('#apBody');
      if (body) {
        body.setAttribute('data-layout', state.layout);
        // 内联 !important 兜底：宿主页面若有用 flex 相关全局样式也不会把方向改回去
        const col = state.layout === 'col' || g.w < 560;
        root.classList.toggle('col', col);
        body.style.setProperty('flex-direction', col ? 'column' : 'row', 'important');
        body.style.setProperty('overflow', col ? 'auto' : 'hidden', 'important');
        $$('#apBody .ap-pad').forEach(p => {
          const base = RATIO[state.ratio || 'doc'][p.dataset.pad] || '1 1 0';
          if (col) {
            // 竖排：按内容量分配高度（提示词最多），每块内部滚动，绝不溢出
            const colFlex = p.dataset.pad === 'prompt' ? '1.4 1 0' : (p.dataset.pad === 'doc' ? '0.8 1 0' : '1 1 0');
            p.style.setProperty('flex', colFlex, 'important');
            // 给每块一个下限高度（提示词最需要空间）：窗口很矮时不再互相压扁，超出由 body 滚动
            const minH = p.dataset.pad === 'prompt' ? '250px' : (p.dataset.pad === 'doc' ? '160px' : '180px');
            p.style.setProperty('min-height', minH, 'important');
            p.style.setProperty('max-height', 'none', 'important');
          } else {
            p.style.setProperty('flex', base, 'important');
            p.style.removeProperty('min-height');
            p.style.removeProperty('max-height');
          }
          p.style.setProperty('min-width', '0', 'important');
        });
      }
      const lb = $('#apLayout');
      if (lb) {
        lb.classList.toggle('on', state.layout === 'col');
        lb.title = state.layout === 'row' ? '当前横排 · 点击切成竖排' : '当前竖排 · 点击切成横排';
      }
    }
    applyPads();
    if (remember !== false) {
      if (!window.__apRelayout) capturePref();
      saveStore();
    }
  }
  /* 记录用户心目中的"理想版面"：窗口被拉窄时临时压缩，恢复后按这个回来 */
  function capturePref() {
    if (!state.width) return;
    state.pref = {
      w: state.width, h: state.height, x: state.x, y: state.y,
      rightGap: Math.max(0, Math.round(window.innerWidth - (state.x + state.width)))
    };
  }
  function relayoutOnResize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const p = state.pref;
    if (!p || !p.w) return;
    let w = p.w;
    let h = p.h || 0;
    // 窗口放不下理想尺寸时临时缩小，但不动 pref
    if (w > vw - 16) w = Math.max(280, Math.round(vw * 0.72));
    if (h > vh - 24) h = Math.max(200, vh - 80);
    let x, y;
    const gap = p && typeof p.rightGap === 'number' ? p.rightGap : 16;
    if (gap <= 30) {
      x = vw - w - Math.min(gap, 24);          // 原本贴右 → 继续贴右
    } else {
      x = (p && p.x != null) ? p.x : (vw - w - 16);
    }
    y = (p && p.y != null) ? p.y : state.y;
    if (x + w > vw - 8) x = vw - w - 8;
    if (x < 8) x = 8;
    if (y + h > vh - 8) y = vh - h - 8;
    if (y < 8) y = 8;
    if (x === state.x && y === state.y && w === state.width && h === state.height) return;
    window.__apRelayout = true;
    applyGeom(w, h, x, y, false);
    window.__apRelayout = false;
    // 拆出的独立调板也夹回可视区
    ['doc', 'prompt', 'gen'].forEach(k => {
      if (state.out[k] && state.box[k]) {
        state.box[k] = padClamp(Object.assign({}, state.box[k]));
        applyPadBox(k, true);
      }
    });
    saveStore();
  }
  function applyPads() {
    $$('#aplus-root .ap-pad').forEach(p => {
      const p2 = p.dataset.pad;
      const off = !!state.pads[p2];
      p.classList.toggle('collapsed', off);
      const btn = p.querySelector('.ap-padfold');
      if (btn) btn.textContent = off ? '▸' : '▾';
    });
    // 按保存的顺序重排
    if (Array.isArray(state.order) && state.order.length) {
      const body = $('#apBody');
      state.order.forEach(id => {
        const pad = body.querySelector('.ap-pad[data-pad="' + id + '"]');
        if (pad) body.appendChild(pad);
      });
      state.order = $$('#apBody .ap-pad').map(p => p.dataset.pad);
    }
  }
  /* 图片助手已是独立调板，不再做视图切换；保留空实现兼容旧调用 */
  function applyPane() {
    const pv = $('#apPromptView');
    if (pv) pv.classList.remove('ap-hide');
    const tt = $('#apPaneTitle');
    if (tt) tt.textContent = '提示词';
  }
  function setPane() { applyPane(); }
  /* ---------- 设置：版面配色 / 强调色 / 文字大小 ---------- */
  function hexA(hex, a) {
    let h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return '';
    const n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function applyTabs() {
    const mb = $('#apTabs button[data-p="main"]');
    if (mb) mb.classList.toggle('ap-hide', state.ui.main === false);
    if (state.ui.main === false && state.active === 'main') {
      state.active = 'sub';
      const ta = promptText();
      if (ta) ta.value = state.prompts[state.active];
      renderTabs();
    }
    const sw = $('#apSetMain');
    if (sw) sw.classList.toggle('on', state.ui.main !== false);
  }
  function applyPrefixSwitch() {
    const b = $('#apSetPrefix');
    if (b) b.classList.toggle('on', state.showPrefix !== false);
    const it = $('#apPreTitle'), ie = $('#apPreInfo');
    if (it && document.activeElement !== it) it.value = state.preTitle || '';
    if (ie && document.activeElement !== ie) ie.value = state.preInfo || '';
    [it, ie].forEach(el => {
      if (!el) return;
      el.style.opacity = state.showPrefix === false ? '.5' : '1';
      el.title = state.showPrefix === false ? '前缀已关闭，导入时不会输出' : '';
    });
  }
  function renderSet() {
    $$('#apSetTheme button').forEach(b => b.classList.toggle('on', b.dataset.t === state.theme));
    $$('#apSetAccent .ap-swatch').forEach(b => {
      const c = (b.dataset.c || '').toLowerCase();
      b.classList.toggle('on', state.accent ? (c === state.accent.toLowerCase()) : (c === ''));
    });
    $$('#apSetFs button').forEach(b => b.classList.toggle('on', Math.abs(parseFloat(b.dataset.s) - (state.fs || 1)) < 0.01));
    $$('#apSetExport button').forEach(b => {
      const m = b.dataset.m;
      b.classList.toggle('on', m === 'files' ? (state.exportMode === 'files')
        : m === 'zipdown' ? (state.exportMode !== 'files' && state.exLoc === 'downloads')
        : (state.exportMode !== 'files' && state.exLoc !== 'downloads'));
    });
    const locEl = $('#apLocName');
    if (locEl) locEl.textContent = state.locName ? '已记住（下次默认打开这里）' : '未设置（首次导出默认打开桌面）';
    $$('#apSetRatio button').forEach(b => b.classList.toggle('on', b.dataset.r === (state.ratio || 'doc')));
    applyPrefixSwitch();
    const logEl = $('#apLogList');
    if (logEl && !logEl.childElementCount) {
      logEl.innerHTML = CHANGELOG.map(([v, t]) =>
        '<div class="ap-logrow"><b>' + v + '</b><span>' + t + '</span></div>').join('');
    }
    /* 更新日志默认折叠，展开状态记在 state.ui.log */
    if (logEl) {
      const open = state.ui.log === true;
      logEl.style.display = open ? 'flex' : 'none';
      const tog = $('#apLogTog');
      if (tog) {
        const car = tog.querySelector('.ap-caret');
        if (car) car.textContent = open ? '▾' : '▸';
        tog.title = open ? '点击收起更新日志' : '点击展开更新日志（' + CHANGELOG.length + ' 条）';
      }
    }
    const pick = $('#apSetPick');
    if (pick && state.accent) pick.value = state.accent;
  }

  /* ---------- 版面预设 ---------- */
  function snapLayout() {
    const bx = o => (o && typeof o === 'object' && o.w) ? { x: o.x, y: o.y, w: o.w, h: o.h } : null;
    return {
      w: state.width, h: state.h, x: state.x, y: state.y,
      layout: state.layout === 'col' ? 'col' : 'row',
      pads: { doc: !!state.pads.doc, prompt: !!state.pads.prompt, gen: !!state.pads.gen },
      out: { doc: !!state.out.doc, prompt: !!state.out.prompt, gen: !!state.out.gen },
      box: { doc: bx(state.box.doc), prompt: bx(state.box.prompt), gen: bx(state.box.gen) },
      order: (state.order || []).slice(),
      thumb: { g: state.thumb.g, f: state.thumb.f }
    };
  }
  function applyPreset(snap, name) {
    if (!snap) return;
    // 先把拆出去的都收回，再按预设重新摆
    ['doc', 'prompt', 'gen'].forEach(k => { if (state.out[k]) setPadOut(k, false, true); });
    state.layout = snap.layout === 'col' ? 'col' : 'row';
    state.order = Array.isArray(snap.order) && snap.order.length ? snap.order.slice() : ['doc', 'prompt', 'gen'];
    ['doc', 'prompt', 'gen'].forEach(k => {
      if (snap.pads && typeof snap.pads[k] === 'boolean') state.pads[k] = snap.pads[k];
      state.box[k] = (snap.box && snap.box[k] && snap.box[k].w) ? Object.assign({}, snap.box[k]) : null;
      state.out[k] = false;
    });
    if (snap.thumb) {
      if (+snap.thumb.g >= 52 && +snap.thumb.g <= 150) state.thumb.g = +snap.thumb.g;
      if (+snap.thumb.f >= 34 && +snap.thumb.f <= 110) state.thumb.f = +snap.thumb.f;
    }
    applyGeom(snap.w, snap.h, snap.x, snap.y, false);
    applyPads();
    applyThumb();
    ['doc', 'prompt', 'gen'].forEach(k => { if (snap.out && snap.out[k]) setPadOut(k, true, true); });
    updateBodyHint();
    saveStore();
    toast('已套用版面' + (name ? '「' + name + '」' : ''));
  }
  function renderPresets() {
    const box = $('#apPresetList');
    if (!box) return;
    if (!state.layouts.length) {
      box.innerHTML = '<div class="ap-empty">还没有预设</div>';
      return;
    }
    box.innerHTML = state.layouts.map((p, i) => {
      const sn = p.snap || {};
      const outN = ['doc', 'prompt', 'gen'].filter(k => sn.out && sn.out[k]).length;
      return '<div class="ap-presetrow" data-i="' + i + '">' +
        '<b title="' + esc(p.name) + '">' + esc(p.name) + '</b>' +
        '<span class="ap-hint">' + (sn.layout === 'col' ? '竖排' : '横排') +
        ' · ' + (sn.w || '?') + '×' + (sn.h || '?') + (outN ? ' · 拆 ' + outN : '') + '</span>' +
        '<button class="ap-mini" data-act="apply">用</button>' +
        '<button class="ap-mini" data-act="del">×</button></div>';
    }).join('');
  }
  /* ---------- 网页进入大图 / 详情弹层时，面板自动隐身 ----------
     判据刻意收窄：必须「铺满视口 + 层级高 + 里面真有一张铺开的大图」，
     这样页面常驻的全屏容器、背景装饰层、普通小弹层都不会把面板顶掉。 */
  let awayTimer = 0, awayHinted = false;
  const OVERLAY_SEL = '[aria-modal="true"], [role="dialog"], [data-testid*="overlay"], [data-testid*="lightbox"], ' +
    '[data-testid*="modal"], div.fixed.inset-0, [class*="fixed"][class*="inset-0"]';
  function elCovers(el, W, H) {
    if (!el || el.nodeType !== 1) return false;
    if (el.id === 'aplus-root' || el.id === 'apAwayRescue') return false;
    if (el.closest && el.closest('#aplus-root')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < W * 0.86 || r.height < H * 0.86) return false;
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') return false;
    if (cs.opacity === '0' || cs.visibility === 'hidden' || cs.display === 'none') return false;
    if (cs.pointerEvents === 'none' && !r.width) return false;
    return true;
  }
  function zOf(el) {
    const z = parseInt(getComputedStyle(el).zIndex, 10);
    if (z) return z;
    let p = el.parentElement;
    for (let i = 0; p && i < 4; i++, p = p.parentElement) {
      const pz = parseInt(getComputedStyle(p).zIndex, 10);
      if (pz) return pz;
    }
    return 0;
  }
  function bigMediaIn(el, W, H) {
    let nodes;
    try { nodes = el.querySelectorAll('img, canvas'); } catch (e) { return false; }
    for (let i = 0; i < nodes.length && i < 12; i++) {
      const r = nodes[i].getBoundingClientRect();
      if (r.width * r.height >= W * H * 0.28) return true;
    }
    return false;
  }
  function inAway() {
    if (document.fullscreenElement) return true;
    const W = window.innerWidth, H = window.innerHeight;
    const test = el => {
      if (!elCovers(el, W, H)) return false;
      const role = el.getAttribute && (el.getAttribute('aria-modal') === 'true' || el.getAttribute('role') === 'dialog');
      const z = zOf(el);
      let hasMedia = false;
      try { hasMedia = !!(el.querySelector && el.querySelector('img, canvas, video')); } catch (e) {}
      if (bigMediaIn(el, W, H) && z >= 20) return true;         // 大图弹层：最主流的形态
      if (role && z >= 100 && hasMedia) return true;            // 明确的全屏图像模态（图片编辑 / 画布）
      return false;
    };
    let list;
    try { list = document.querySelectorAll(OVERLAY_SEL); } catch (e) { list = []; }
    for (let i = 0; i < list.length && i < 40; i++) if (test(list[i])) return true;
    /* 既没有 role 也没有常见的 class：这类遮罩基本都直接挂在 body 上，扫这一层就够 */
    const kids = document.body ? document.body.children : [];
    for (let i = 0; i < kids.length && i < 25; i++) if (test(kids[i])) return true;
    return false;
  }
  /* 误判保险：面板隐身时在右下角留一个很小的「叫回来」点，一点就关掉自动隐身 */
  function ensureRescue(on) {
    let r = document.getElementById('apAwayRescue');
    if (!on) { if (r && r.parentNode) r.parentNode.removeChild(r); return; }
    if (r) return;
    r = document.createElement('div');
    r.id = 'apAwayRescue';
    r.title = '面板已隐身，点这里叫回面板';
    r.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>';
    r.addEventListener('click', e => {
      e.stopPropagation();
      state.autoHide = false;
      applyAwaySwitch(); saveStore();
      ensureRescue(false);
      toast('已关闭「大图时自动隐身」，面板回来了；可在设置里重新打开');
    });
    document.documentElement.appendChild(r);
  }
  function syncAway() {
    const root = $('#aplus-root');
    if (!root) return;
    if (state.autoHide === false) {
      if (root.classList.contains('ap-away')) root.classList.remove('ap-away');
      ensureRescue(false);
      return;
    }
    let on = false;
    try { on = inAway(); } catch (e) { on = false; }
    ensureRescue(on);
    if (on === root.classList.contains('ap-away')) return;
    root.classList.toggle('ap-away', on);
    if (on && !awayHinted) {
      awayHinted = true;
      toast('网页进到大图里了，面板先收起（退出大图会回来）');
      setTimeout(() => { awayHinted = false; }, 6000);
    }
  }
  function watchAway() {
    const run = () => { clearTimeout(awayTimer); awayTimer = setTimeout(syncAway, 220); };
    document.addEventListener('fullscreenchange', run);
    window.addEventListener('resize', run);
    try {
      new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    setInterval(syncAway, 1800);
    run();
  }
  function applyAwaySwitch() {
    const b = $('#apSetAway');
    if (b) b.classList.toggle('on', state.autoHide !== false);
    syncAway();
  }
  /* Ctrl+Shift+H：临时把面板收起来 / 叫回来，只影响当次，不写设置 */
  function toggleHide() {
    const root = $('#aplus-root');
    if (!root) return;
    const on = !root.classList.contains('ap-hide');
    root.classList.toggle('ap-hide', on);
    toast(on ? '面板已收起，Ctrl+Shift+H 可以叫回来' : '面板回来了');
  }
  /* ---------- ChatGPT 左侧对话栏弹出时：面板往右让位 / 中线左侧的暂时隐身 ---------- */
  let sideWNow = 0, sideHot = false, sideMouseX = -1, sideInPanel = false, sideTimer = 0, sideOpenPrev = false;
  function measureSideW() {
    let w = 0;
    try {
      const nodes = document.querySelectorAll('nav, aside, [data-testid*="sidebar"], [class*="sidebar"], [class*="Sidebar"]');
      for (let i = 0; i < nodes.length && i < 18; i++) {
        const el = nodes[i];
        if (el.closest && el.closest('#aplus-root')) continue;
        const r = el.getBoundingClientRect();
        if (r.left > 6 || r.width < 40 || r.width > 480) continue;
        if (r.height < window.innerHeight * 0.55) continue;
        if (w < r.width) w = Math.round(r.width);
      }
    } catch (e) {}
    return w;
  }
  function sideUnits() {
    const root = $('#aplus-root'), out = [];
    if (!root) return out;
    out.push({ el: root, isRoot: true });
    ['doc', 'prompt', 'gen'].forEach(k => {
      if (!state.out[k]) return;
      const p = root.querySelector('.ap-pad[data-pad="' + k + '"]');
      if (p) out.push({ el: p, isRoot: false });
    });
    return out;
  }
  function sideKey(mode, dx) { return mode + (mode === 'shift' ? ':' + Math.round(dx) : ''); }
  /* 只在目标状态真的变了才动 DOM，避免反复重算导致面板来回跳 */
  function setUnitSide(u, mode, dx) {
    const el = u.el;
    const key = sideKey(mode, dx);
    if ((el.getAttribute('data-side') || 'none') === key) return;
    el.setAttribute('data-side', key);
    el.classList.remove('ap-shift', 'ap-dim', 'ap-keep');
    el.style.removeProperty('--ap-shift-x');
    if (mode === 'dim') el.classList.add('ap-dim');
    else if (mode === 'keep') el.classList.add('ap-keep');
    else if (mode === 'shift') {
      el.style.setProperty('--ap-shift-x', Math.round(dx) + 'px');
      el.classList.add('ap-shift');
    }
  }
  function clearSide() {
    sideUnits().forEach(u => setUnitSide(u, 'none'));
  }
  function applySide() {
    const root = $('#aplus-root');
    if (!root) return;
    const measured = measureSideW();
    sideWNow = measured;
    const off = !state.dodgeSide && !state.hideLeftSide;
    /* open 判定：鼠标热区为主（读 ChatGPT 是 hover 展开）；鼠标已在侧栏宽度内时也算。
       鼠标停在面板上时冻结当前状态，否则面板一让位鼠标就落到面板上、状态又开始来回跳。 */
    let open;
    if (off) open = false;
    else if (sideInPanel) open = sideOpenPrev;
    else {
      const inZone = measured >= 176 && sideMouseX >= 0 && sideMouseX <= measured + 16;
      open = sideHot || inZone;
    }
    sideOpenPrev = open;
    if (!open) { clearSide(); return; }
    const S = measured >= 176 ? measured : 268;   // 量不到就用常见展开宽度
    const W = window.innerWidth, mid = W / 2;
    sideUnits().forEach(u => {
      const r = u.el.getBoundingClientRect();
      /* 当前若已平移，rect 是平移后的，先扣回去算原始位置，否则会自己把自己算跑 */
      const cur = parseFloat(u.el.style.getPropertyValue('--ap-shift-x')) || 0;
      const L = r.left - cur, R = r.right - cur;
      const onLeft = (L + r.width / 2) < mid;
      if (state.hideLeftSide && onLeft) { setUnitSide(u, 'dim'); return; }
      if (state.hideLeftSide && !onLeft && !u.isRoot) { setUnitSide(u, 'keep'); return; }
      if (!state.dodgeSide) { setUnitSide(u, 'none'); return; }
      let dx = (S + 12) - L;
      if (dx > 0) dx = Math.min(dx, W - R - 10, S + 24);   // 上限兜一下，避免算出离谱位移
      if (dx > 0) setUnitSide(u, 'shift', dx);
      else setUnitSide(u, 'none');
    });
  }
  function sideDebounce() {
    clearTimeout(sideTimer);
    sideTimer = setTimeout(applySide, 90);
  }
  function watchSide() {
    document.addEventListener('mousemove', e => {
      sideMouseX = e.clientX;
      sideInPanel = !!(e.target && e.target.closest && e.target.closest('#aplus-root, #apAwayRescue'));
      let changed = false;
      if (!sideInPanel && sideMouseX <= 76) { if (!sideHot) { sideHot = true; changed = true; } }
      else if (!sideInPanel && sideMouseX > 132) { if (sideHot) { sideHot = false; changed = true; } }
      if (changed) sideDebounce();
    }, true);
    document.addEventListener('mouseleave', () => { sideHot = false; sideDebounce(); });
    window.addEventListener('resize', sideDebounce);
    setInterval(applySide, 500);
    sideDebounce();
  }
  function applySideSwitch() {
    const a = $('#apSetDodge'), b = $('#apSetHideLeft');
    if (a) a.classList.toggle('on', state.dodgeSide !== false);
    if (b) b.classList.toggle('on', state.hideLeftSide === true);
    applySide();
  }
  function applyThumb() {
    const root = $('#aplus-root');
    if (!root) return;
    const g = Math.max(52, Math.min(150, state.thumb.g || 92));
    const f = Math.max(34, Math.min(110, state.thumb.f || 54));
    root.style.setProperty('--thumb-g', g + 'px');
    root.style.setProperty('--thumb-f', f + 'px');
    const ig = $('#apThumbG'), itf = $('#apThumbF');
    if (ig) {
      ig.value = String(g);
      ig.style.setProperty('--fill', ((g - 52) / (150 - 52) * 100).toFixed(1) + '%');
    }
    if (itf) {
      itf.value = String(f);
      itf.style.setProperty('--fill', ((f - 34) / (110 - 34) * 100).toFixed(1) + '%');
    }
    const gv = $('#apThumbGv'), fv = $('#apThumbFv');
    if (gv) gv.textContent = g + 'px';
    if (fv) fv.textContent = f + 'px';
  }
  function applyLook() {
    const root = $('#aplus-root');
    if (!root) return;
    root.setAttribute('data-theme', state.theme);
    if (state.accent && hexA(state.accent, .12)) {
      root.style.setProperty('--accent', state.accent, 'important');
      root.style.setProperty('--accent-soft', hexA(state.accent, .12), 'important');
    } else {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-soft');
    }
    root.style.setProperty('--fs', String(state.fs || 1));
    renderSet();
  }
  function dockRight() {
    applyGeom(state.width, state.h, window.innerWidth - state.width - 16, 56);
    saveStore();
    toast('已贴到窗口右侧');
  }

  /* ---------- 拆分调板：每块可以脱离主窗，成为独立浮动窗口 ---------- */
  const PADNAME = { doc: '文档预览', prompt: '提示词', gen: '生图助手' };
  function padClamp(b) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.max(260, Math.min(Math.round(b.w || 340), Math.max(260, vw - 16)));
    const h = Math.max(180, Math.min(Math.round(b.h || 420), Math.max(180, vh - 16)));
    return {
      w: w, h: h,
      x: Math.max(4, Math.min(Math.max(4, vw - w - 8), Math.round(b.x == null ? 40 : b.x))),
      y: Math.max(4, Math.min(Math.max(4, vh - 40), Math.round(b.y == null ? 40 : b.y)))
    };
  }
  function applyPadBox(id, remember) {
    const pad = $('#aplus-root .ap-pad[data-pad="' + id + '"]');
    if (!pad || !state.out[id]) return;
    const g = padClamp(state.box[id] || {});
    if (!state.pads[id]) g.h = Math.max(120, g.h);
    state.box[id] = g;
    pad.style.setProperty('width', g.w + 'px', 'important');
    pad.style.setProperty('height', (state.pads[id] ? 32 : g.h) + 'px', 'important');
    pad.style.setProperty('left', g.x + 'px', 'important');
    pad.style.setProperty('top', g.y + 'px', 'important');
    if (remember !== false) saveStore();
  }
  function setPadOut(id, on, silent) {
    const root = $('#aplus-root'), body = $('#apBody');
    if (!root || !body) return;
    const pad = root.querySelector('.ap-pad[data-pad="' + id + '"]');
    if (!pad) return;
    state.out[id] = !!on;
    const btn = pad.querySelector('.ap-padout');
    if (on) {
      const r = pad.getBoundingClientRect();
      if (!state.box[id]) {
        const n = ['doc', 'prompt', 'gen'].filter(k => state.out[k] && k !== id).length;
        state.box[id] = {
          x: Math.max(24, Math.round(r.left) + n * 30),
          y: Math.max(24, Math.round(r.top) + n * 30),
          w: Math.max(320, Math.round(r.width)),
          h: Math.max(360, Math.round(r.height))
        };
      }
      root.appendChild(pad);
      pad.classList.add('ap-out');
      if (!pad.querySelector('.ap-padresize')) {
        [['ap-padresize', '拖动右下角缩放'], ['ap-padresize ap-l', '拖动左下角缩放']].forEach(([cls, tip]) => {
          const hh = document.createElement('div');
          hh.className = cls;
          hh.title = tip;
          pad.appendChild(hh);
        });
      }
    } else {
      pad.classList.remove('ap-out');
      ['width', 'height', 'left', 'top'].forEach(k => pad.style.removeProperty(k));
      body.appendChild(pad);
      applyPads();
    }
    if (btn) {
      btn.innerHTML = on ? IC_DOCK : IC_POP;
      btn.classList.toggle('on', on);
      btn.title = on ? '收回主窗口（点一下回到主面板）' : '拆成独立窗口（可单独移动 / 缩放）';
    }
    applyPadBox(id, false);
    updateBodyHint();
    saveStore();
    if (!silent) toast(on ? ('「' + (PADNAME[id] || id) + '」已拆成独立窗口') : ('「' + (PADNAME[id] || id) + '」已收回主窗口'));
  }
  function updateBodyHint() {
    const body = $('#apBody');
    if (!body) return;
    const left = $$('#apBody .ap-pad').length;
    let hint = body.querySelector('.ap-bodyhint');
    if (!left) {
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'ap-bodyhint';
        hint.textContent = '调板都已拆成独立窗口，拖回去或点各窗口标题栏的收回图标即可收回。';
        body.appendChild(hint);
      }
    } else if (hint) {
      hint.remove();
    }
  }

  function wireDrag() {
    /* 1) 拖动标题条移动整个面板 */
    const hd = $('#apHd');
    let mv = null;
    hd.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      mv = { dx: e.clientX - state.x, dy: e.clientY - state.y };
      try { hd.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    hd.addEventListener('pointermove', e => {
      if (!mv) return;
      applyGeom(state.width, state.h, e.clientX - mv.dx, e.clientY - mv.dy);
    });
    hd.addEventListener('pointerup', () => { if (mv) { mv = null; saveStore(); } });
    hd.addEventListener('pointercancel', () => { if (mv) { mv = null; saveStore(); } });

    /* 2) 拖右下角 / 左下角缩放 */
    [['#apResize', 'r'], ['#apResizeBL', 'l']].forEach(([sel, side]) => {
      const rz = $(sel);
      if (!rz) return;
      let rs = null;
      rz.addEventListener('pointerdown', e => {
        rs = { w: state.width, h: state.h, x: e.clientX, y: e.clientY, left: state.x };
        try { rz.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      });
      rz.addEventListener('pointermove', e => {
        if (!rs) return;
        const right = rs.left + rs.w;
        const h = rs.h + (e.clientY - rs.y);
        if (side === 'r') applyGeom(rs.w + (e.clientX - rs.x), h, state.x, state.y);
        else {
          const nx = Math.min(right - 320, e.clientX);
          applyGeom(right - nx, h, nx, state.y);
        }
      });
      rz.addEventListener('pointerup', () => { if (rs) { rs = null; saveStore(); } });
      rz.addEventListener('pointercancel', () => { if (rs) { rs = null; saveStore(); } });
    });

    /* 3) 拖动分区标题换位置（组合顺序）；已拆出的调板改为拖动整个窗口 */
    $$('#aplus-root .ap-pad').forEach(pad => {
      const grip = pad.querySelector('.ap-grip');
      if (!grip) return;
      let st = null;
      grip.addEventListener('pointerdown', e => {
        if (state.out[pad.dataset.pad]) return;
        st = true;
        pad.classList.add('dragging');
        try { grip.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
        e.stopPropagation();
      });
      grip.addEventListener('pointermove', e => {
        if (!st) return;
        const body = $('#apBody');
        const horiz = state.layout !== 'col';
        const cur = horiz ? e.clientX : e.clientY;
        const others = $$('#apBody .ap-pad').filter(p => p !== pad);
        const before = [];
        const after = [];
        others.forEach(p => {
          const r = p.getBoundingClientRect();
          const mid = horiz ? r.left + r.width / 2 : r.top + r.height / 2;
          (cur < mid ? before : after).push(p);
        });
        if (before.length) body.insertBefore(pad, before[before.length - 1]);
        else if (after.length) body.insertBefore(pad, after[0].nextSibling);
      });
      grip.addEventListener('pointerup', () => {
        if (!st) return;
        st = null;
        pad.classList.remove('dragging');
        state.order = $$('#apBody .ap-pad').map(p => p.dataset.pad);
        saveStore();
        toast('分区顺序已保存');
      });
      grip.addEventListener('pointercancel', () => {
        st = null;
        pad.classList.remove('dragging');
      });
    });

    /* 4) 独立窗口：拖标题条移动、拖右下角缩放、点击提到最前 */
    let padZ = 2147483100;
    $$('#aplus-root .ap-pad').forEach(pad => {
      const id = pad.dataset.pad;
      const hd = pad.querySelector('.ap-pad-hd');
      let mv = null, rs = null;
      const raise = () => {
        if (!state.out[id]) return;
        pad.style.setProperty('z-index', ++padZ, 'important');
      };
      pad.addEventListener('pointerdown', raise, true);
      hd.addEventListener('pointerdown', e => {
        if (!state.out[id]) return;
        if (e.target.closest('button')) return;
        const b = padClamp(state.box[id] || {});
        mv = { dx: e.clientX - b.x, dy: e.clientY - b.y };
        pad.classList.add('dragging');
        try { hd.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
        e.stopPropagation();
      });
      hd.addEventListener('pointermove', e => {
        if (!mv || !state.out[id]) return;
        state.box[id] = Object.assign(padClamp(state.box[id] || {}), {
          x: e.clientX - mv.dx, y: e.clientY - mv.dy
        });
        applyPadBox(id, false);
      });
      const endMv = () => {
        if (!mv) return;
        mv = null;
        pad.classList.remove('dragging');
        applyPadBox(id, true);
      };
      hd.addEventListener('pointerup', endMv);
      hd.addEventListener('pointercancel', endMv);

      pad.addEventListener('pointerdown', e => {
        const hh = e.target.closest('.ap-padresize');
        if (!state.out[id] || !hh) return;
        const b = padClamp(state.box[id] || {});
        rs = { w: b.w, h: b.h, x: e.clientX, y: e.clientY, fromLeft: hh.classList.contains('ap-l') };
        try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
        e.stopPropagation();
      });
      pad.addEventListener('pointermove', e => {
        if (!rs) return;
        const b = padClamp(state.box[id] || {});
        const h = rs.h + (e.clientY - rs.y);
        if (rs.fromLeft) {
          const right = b.x + rs.w;
          const nx = Math.min(right - 260, e.clientX);
          state.box[id] = Object.assign(b, { w: right - nx, h: h, x: nx });
        } else {
          state.box[id] = Object.assign(b, { w: rs.w + (e.clientX - rs.x), h: h });
        }
        applyPadBox(id, false);
      });
      const endRs = () => {
        if (!rs) return;
        rs = null;
        applyPadBox(id, true);
      };
      pad.addEventListener('pointerup', endRs);
      pad.addEventListener('pointercancel', endRs);
    });
  }

  /* ---------- 启动 ---------- */
  function boot(stored) {
    if (stored && typeof stored === 'object') {
      if (stored.prompts) ['aplus', 'sub', 'main'].forEach(k => { if (typeof stored.prompts[k] === 'string') state.prompts[k] = stored.prompts[k]; });
      /* 旧模板里的「主体：」「补充信息：」标签统一成「标题：」「辅助信息：」 */
      ['aplus', 'sub', 'main'].forEach(k => {
        if (typeof state.prompts[k] !== 'string') return;
        state.prompts[k] = state.prompts[k]
          .split('主体：{标题信息}').join('标题：{标题信息}')
          .split('补充信息：{辅助信息}').join('辅助信息：{辅助信息}');
      });
      if (stored.vers && typeof stored.vers === 'object') ['aplus', 'sub', 'main'].forEach(k => { if (Array.isArray(stored.vers[k])) state.vers[k] = stored.vers[k].slice(-6); });
      if (Array.isArray(stored.snippets) && stored.snippets.length) state.snippets = stored.snippets;
      if (typeof stored.title === 'string') state.title = stored.title;
      if (typeof stored.extra === 'string') state.extra = stored.extra;
      if (typeof stored.preTitle === 'string') state.preTitle = stored.preTitle;
      if (typeof stored.preInfo === 'string') state.preInfo = stored.preInfo;
      if (stored.showPrefix === false) state.showPrefix = false;
      if (stored.active === 'aplus' || stored.active === 'sub' || stored.active === 'main') state.active = stored.active;
      if (stored.theme === 'light' || stored.theme === 'paper' || stored.theme === 'dark') state.theme = stored.theme;
      if (typeof stored.accent === 'string') state.accent = stored.accent;
      if (typeof stored.fs === 'number' && stored.fs >= 0.8 && stored.fs <= 1.4) state.fs = stored.fs;
      if (typeof stored.width === 'number') state.width = Math.max(320, Math.min(1400, stored.width));
      if (typeof stored.h === 'number' && stored.h > 200) state.h = stored.h;
      if (typeof stored.x === 'number') state.x = stored.x;
      if (typeof stored.y === 'number') state.y = stored.y;
      if (stored.layout === 'row' || stored.layout === 'col') state.layout = stored.layout;
      if (stored.pads && typeof stored.pads === 'object') {
        ['doc', 'prompt', 'gen'].forEach(k => { if (typeof stored.pads[k] === 'boolean') state.pads[k] = stored.pads[k]; });
      }
      if (stored.out && typeof stored.out === 'object') {
        ['doc', 'prompt', 'gen'].forEach(k => { state.out[k] = !!stored.out[k]; });
      }
      if (stored.box && typeof stored.box === 'object') {
        ['doc', 'prompt', 'gen'].forEach(k => {
          const b = stored.box[k];
          if (b && typeof b === 'object') state.box[k] = { x: b.x, y: b.y, w: b.w, h: b.h };
        });
      }
      if (Array.isArray(stored.order) && stored.order.length) {
        state.order = stored.order.filter(k => k === 'doc' || k === 'prompt' || k === 'gen');
      }
      if (Array.isArray(stored.groups)) {
        state.groups = stored.groups.filter(g => g && typeof g.id === 'string').map(g => ({
          id: g.id, name: String(g.name || '组').slice(0, 14), fold: g.fold === true
        }));
      }
      if (stored.gidMap && typeof stored.gidMap === 'object') {
        state.gidMap = {};
        Object.keys(stored.gidMap).forEach(k => { if (typeof stored.gidMap[k] === 'string') state.gidMap[k] = stored.gidMap[k]; });
      }
      if (stored.pane === 'gen' || stored.pane === 'prompt') state.pane = stored.pane;
      if (Array.isArray(stored.fav)) state.fav = stored.fav;
      if (stored.ui && typeof stored.ui === 'object') {
        state.ui.scan = stored.ui.scan !== false;
        state.ui.fav = stored.ui.fav !== false;
        state.ui.main = stored.ui.main !== false;
        state.ui.log = stored.ui.log === true;
      }
      if (stored.thumb && typeof stored.thumb === 'object') {
        if (+stored.thumb.g >= 52 && +stored.thumb.g <= 150) state.thumb.g = +stored.thumb.g;
        if (+stored.thumb.f >= 34 && +stored.thumb.f <= 110) state.thumb.f = +stored.thumb.f;
      }
      if (stored.favFilter === 'all' || stored.favFilter === 'done' || stored.favFilter === 'pick') state.favFilter = stored.favFilter;
      if (stored.collapsed === true) state.collapsed = true;
      if (stored.exportMode === 'files') state.exportMode = 'files';
      if (stored.ratio && RATIO[stored.ratio]) state.ratio = stored.ratio;
      if (stored.exLoc === 'downloads') state.exLoc = 'downloads';
      if (stored.autoHide === false) state.autoHide = false;
      if (stored.dodgeSide === false) state.dodgeSide = false;
      if (stored.hideLeftSide === true) state.hideLeftSide = true;
      if (typeof stored.locName === 'string') state.locName = stored.locName;
      if (stored.taH && typeof stored.taH === 'object') {
        ['title', 'extra', 'prompt'].forEach(k => { if (+stored.taH[k] >= 40) state.taH[k] = +stored.taH[k]; });
      }
      if (stored.pref && typeof stored.pref === 'object' && +stored.pref.w > 0) {
        state.pref = {
          w: +stored.pref.w, h: +stored.pref.h || 0, x: +stored.pref.x || 0, y: +stored.pref.y || 0,
          rightGap: typeof stored.pref.rightGap === 'number' ? stored.pref.rightGap : null
        };
      }
      if (Array.isArray(stored.layouts)) {
        state.layouts = stored.layouts.filter(p => p && typeof p.name === 'string' && p.snap && typeof p.snap === 'object')
          .slice(-12).map(p => ({
            name: p.name.slice(0, 24),
            snap: {
              w: +p.snap.w || 0, h: +p.snap.h || 0,
              x: p.snap.x == null ? null : +p.snap.x,
              y: p.snap.y == null ? null : +p.snap.y,
              layout: p.snap.layout === 'col' ? 'col' : 'row',
              pads: p.snap.pads || {}, out: p.snap.out || {}, box: p.snap.box || {},
              order: Array.isArray(p.snap.order) ? p.snap.order.slice() : [],
              thumb: p.snap.thumb || { g: 92, f: 54 }
            }
          }));
      }
    }
    buildPanel();
    const root = $('#aplus-root');
    if (!state.pref && stored && typeof stored.width === 'number') {
      // 没有历史偏好：用上次保存的几何推出"理想版面"
      const pw = Math.max(320, Math.min(1400, stored.width));
      const px = typeof stored.x === 'number' ? stored.x : 0;
      state.pref = {
        w: pw, h: typeof stored.h === 'number' ? stored.h : 0, x: px, y: typeof stored.y === 'number' ? stored.y : 0,
        rightGap: Math.max(0, Math.round(window.innerWidth - (px + pw)))
      };
    }
    applyGeom(state.width, state.h, state.x, state.y, false);
    relayoutOnResize();
    applyLook();
    $('#apTitle').value = state.title;
    $('#apExtra').value = state.extra;
    promptText().value = state.prompts[state.active];
    // 恢复上次拖出来的输入框高度
    Object.keys(state.taH || {}).forEach(k => {
      const el = k === 'title' ? $('#apTitle') : k === 'extra' ? $('#apExtra') : k === 'prompt' ? $('#apPrompt') : null;
      const h = +state.taH[k];
      if (el && h > 40) el.style.height = h + 'px';
    });
    renderTabs(); renderVers(); renderFav(); renderScan(); renderDoc();
    $$('.ap-fold').forEach(b => {
      const sec = b.dataset.sec;
      const box = $('.ap-sec[data-sec="' + sec + '"]');
      if (box) box.classList.toggle('off', !state.ui[sec]);
      b.textContent = state.ui[sec] ? '▾' : '▸';
    });
    wire(); wireDrag();
    applyPane();
    applyTabs();
    applyThumb();
    applyAwaySwitch();
    watchAway();
    applySideSwitch();
    watchSide();
    renderPresets();
    loadAssets();
    // 恢复上次拆出去的独立窗口
    ['doc', 'prompt', 'gen'].forEach(k => { if (state.out[k]) setPadOut(k, true, true); });
    // 恢复上次整窗折叠状态
    if (state.collapsed) setCollapsed(true);
    updateBodyHint();
    if (!window.__apResizeBound) {
      window.__apResizeBound = true;
      window.addEventListener('resize', () => {
        const r = $('#aplus-root');
        if (!r) return;
        applyGeom(state.width, state.h, state.x, state.y, false);
        ['doc', 'prompt', 'gen'].forEach(k => { if (state.out[k]) applyPadBox(k, false); });
      });
    }

    // 兜底：页面如果在初始化时清理了 documentElement 下的节点，或面板被样式压成不可见，
    // 这里把它重新挂回去，保证面板常驻。
    ensureMounted();
    try {
      new MutationObserver(() => { if (rootEl && !rootEl.isConnected) ensureMounted(); })
        .observe(document.documentElement, { childList: true });
    } catch (e) {}
    setInterval(ensureMounted, 1200);
    console.info('[Amazon工作台] 面板已挂载 · 宽度 ' + state.width + 'px · ' + location.hostname);
    setTimeout(() => {
      if (!rootEl) return;
      const cs = getComputedStyle(rootEl);
      if (cs.position !== 'fixed' || parseInt(cs.width, 10) === 0) {
        console.warn('[Amazon工作台] 面板样式异常：position=' + cs.position + ' width=' + cs.width);
      }
    }, 800);
  }

  function ensureMounted() {
    if (!rootEl) return;
    if (!rootEl.isConnected) {
      document.documentElement.appendChild(rootEl);
      applyGeom(state.width, state.h, state.x, state.y, false);
      console.info('[Amazon工作台] 面板曾被页面移除，已重新挂载');
    }
  }

  // 等待页面稳定后挂载（chatgpt 会在加载后重建 DOM，但面板挂在 documentElement 上不受影响）
  loadStore((stored) => {
    if (document.body) boot(stored);
    else document.addEventListener('DOMContentLoaded', () => boot(stored), { once: true });
  });
})();

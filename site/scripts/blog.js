/**
 * KeyCat — 无界暖宣纸 × 双幕混合演进主控脚本
 * Act I (0.00->0.34): 纵深视差开篇签名 -> 一隅键声（三段模态纯合成 + 捏角撕贴便利贴）
 * Act II (0.40->1.00): 吸顶横向宣纸长卷翻页（游乐场 -> 随笔 -> 联系与 See You. 水写布）
 */

// 页面文字内容（游乐场 / 随笔 / 社交）统一放在 site/content/site.json，启动时读取；
// 这里只保留与素材绑定的 BGM 配置与空默认值。
const SITE_DATA = {
  arcade: [],
  essays: [],
  socials: [],
  deskNotes: [],

  bgmTracks: [
    {
      id: "gymnopedie",
      title: "Gymnopédie No. 1",
      src: "./assets/audio/bgm-gymnopedie.mp3",
      disc: "./assets/vinyl-record.svg",
      rgb: [0.82, 0.294, 0.173],
    },
    {
      id: "blue-paint",
      title: "Blue Paint",
      src: "./assets/audio/bgm-blue-paint.mp3",
      disc: "./assets/vinyl-record-teal.svg",
      rgb: [0.141, 0.455, 0.518],
    },
    {
      id: "morning",
      title: "Morning",
      src: "./assets/audio/bgm-morning.mp3",
      disc: "./assets/vinyl-record-amber.svg",
      rgb: [0.663, 0.416, 0.208],
    },
    {
      id: "meditation",
      title: "Meditation Impromptu 01",
      src: "./assets/audio/bgm-meditation.mp3",
      disc: "./assets/vinyl-record-plum.svg",
      rgb: [0.659, 0.243, 0.345],
    },
  ],
};

const SCENE_STOPS = [0.0, 0.24, 0.48, 0.74, 1.0];
const SWITCH_KEYS = ["thock", "tactile", "clicky", "linear"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / Math.max(0.0001, b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- 墨点火花粒子 ---------- */
class SparkCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext("2d") : null;
    this.sparks = [];
    this.raf = null;
    if (!this.ctx) return;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  burst(x, y, accentColor = "#d14b2c") {
    if (!this.ctx || reducedMotion) return;
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * 0.12 - Math.random() * Math.PI * 0.76;
      const s = 2.6 + Math.random() * 4.2;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
        w: 1.4 + Math.random() * 1.8,
        c: i % 4 === 0 ? "#2a2622" : accentColor,
      });
    }
    this._start();
  }

  _start() {
    if (this.raf !== null) return;
    const tick = () => {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const p = this.sparks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.91;
        p.vy = p.vy * 0.91 + 0.09;
        p.life -= 0.036;
        if (p.life <= 0) {
          this.sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.strokeStyle = p.c;
        ctx.lineWidth = p.w * p.life;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.3, p.y - p.vy * 2.3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (this.sparks.length > 0) {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.raf = null;
      }
    };
    this.raf = requestAnimationFrame(tick);
  }
}

function bootKeyCat() {
  const runway = document.getElementById("stage-runway");
  const heroBrush = document.getElementById("heroBrush");
  const brushStage = document.getElementById("brushStage");
  const catBridge = document.getElementById("catBridge");
  const bgmHint = document.getElementById("bgmHint");
  const scene1 = document.getElementById("scene-1");
  const scene2 = document.getElementById("scene-2");
  const scene3 = document.getElementById("scene-3");
  const scene4 = document.getElementById("scene-4");
  const scene5 = document.getElementById("scene-5");
  const jumpEls = [
    document.getElementById("scene-1"),
    document.getElementById("scene-2"),
    document.getElementById("scene-3"),
    document.getElementById("scene-4"),
    document.getElementById("scene-5"),
  ];
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));

  const shader = window.KeyCatPaperShader
    ? new window.KeyCatPaperShader(document.getElementById("paper-gl-canvas"))
    : null;
  const audio = window.KeyCatAudio
    ? new window.KeyCatAudio(document.getElementById("oscilloscope"))
    : null;
  window.__keycatAudio = audio;

  const sparkFx = new SparkCanvas(document.getElementById("spark-canvas"));
  const notes = window.KeyCatSpringNotes
    ? new window.KeyCatSpringNotes(".sticky-note-wrap")
    : null;
  const finaleBrush = window.KeyCatFinaleBrush
    ? new window.KeyCatFinaleBrush(document.getElementById("finaleBrushCanvas"), () => shader)
    : null;

  /* ---------- UI 线框小图标 ---------- */
  const ICON_ARROW_RIGHT = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
  const ICON_ARROW_UP_RIGHT = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>';
  const ICON_COPY = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

  /* ---------- 渲染游乐场（横页 01） ---------- */
  const arcadeList = document.getElementById("arcadeList");
  const filterTabs = Array.from(document.querySelectorAll("#arcadeFilter .filter-tab"));
  let arcadeItems = [];

  function renderArcade(cat = "all") {
    const rows = cat === "all"
      ? SITE_DATA.arcade
      : SITE_DATA.arcade.filter((item) => item.cat === cat);

    if (!rows.length) {
      arcadeList.innerHTML = `<li class="list-empty">这一格还空着，新的小玩意正在纸上打磨。</li>`;
      arcadeItems = [];
      return;
    }

    const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    const renderIcon = (icon) => {
      if (!icon) return "";
      if (icon.type === "image" && icon.src) {
        return `<span class="arcade-icon is-image" aria-hidden="true"><img src="${esc(icon.src)}" alt="" /></span>`;
      }
      if (icon.type === "steps" && Array.isArray(icon.colors)) {
        return `<span class="arcade-icon is-steps" aria-hidden="true">${icon.colors
          .map((c) => `<i style="background:${esc(c)}"></i>`)
          .join("")}</span>`;
      }
      return `<span class="arcade-icon is-glyph" aria-hidden="true" style="background:${esc(icon.bg || "#faf6ee")};color:${esc(icon.fg || "#2a2622")}">${esc(icon.text || "")}</span>`;
    };
    const renderActions = (item) => {
      if (!item.href) return "";
      return `
              <button type="button" class="copy-link-btn" data-share-href="${esc(item.href)}" title="复制直达链接">
                ${ICON_COPY}
                <span>复制分享链接</span>
              </button>
              <a class="arcade-play" href="${esc(item.href)}" target="_blank" rel="noopener">
                <span>${esc(item.actionLabel)}</span>
                ${ICON_ARROW_UP_RIGHT}
              </a>`;
    };

    arcadeList.innerHTML = rows
      .map(
        (item) => `
        <li class="arcade-item">
          <div class="arcade-title">
            ${renderIcon(item.icon)}
            <h3>${esc(item.name)}</h3>
          </div>
          <p>${esc(item.desc)}</p>
          <div class="arcade-foot">
            <span class="arcade-kind">${esc(item.catLabel)}</span>
            <div class="arcade-actions">${renderActions(item)}
            </div>
          </div>
        </li>`
      )
      .join("");

    arcadeItems = Array.from(arcadeList.querySelectorAll(".arcade-item"));

    arcadeList.querySelectorAll(".copy-link-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const copyText = btn.dataset.copyText;
        const rawHref = btn.dataset.shareHref || "";
        const fullUrl = copyText || new URL(rawHref, window.location.href).href;
        const label = btn.querySelector("span");
        const idleText = copyText ? "复制名称" : "复制分享链接";
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(fullUrl);
          }
          btn.classList.add("is-copied");
          if (label) label.textContent = copyText ? "已复制" : "已复制链接";
          setTimeout(() => {
            btn.classList.remove("is-copied");
            if (label) label.textContent = idleText;
          }, 1800);
        } catch {
          if (label) label.textContent = "请手动复制";
        }
      });
    });
  }

  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const cat = tab.dataset.cat || "all";
      filterTabs.forEach((t) => {
        const selected = t === tab;
        t.classList.toggle("is-active", selected);
        t.setAttribute("aria-selected", selected ? "true" : "false");
      });
      renderArcade(cat);
      applyStageAtScrollY(smoothScrollY);
    });
  });

  renderArcade("all");

  /* ---------- 渲染纸上随笔（横页 02） ---------- */
  const essayList = document.getElementById("essayList");
  essayList.innerHTML = SITE_DATA.essays.length ? SITE_DATA.essays
    .map(
      (e, i) => `
      <li class="essay-item">
        <button type="button" class="essay-btn" data-idx="${i}">
          <h3>${e.title}</h3>
          <p>${e.summary}</p>
          <div class="essay-foot">
            <time>${e.date} · 约 ${e.readTime}</time>
            <span class="essay-more"><span>阅读全文</span>${ICON_ARROW_RIGHT}</span>
          </div>
        </button>
      </li>`
    )
    .join("") : `<li class="list-empty">第一篇随笔还在纸上酝酿，过些日子再来看看。</li>`;
  const essayItems = Array.from(essayList.querySelectorAll(".essay-item"));

  /* ---------- 渲染联系板块极简图标（小红书 · X · 邮箱） ---------- */
  const socialList = document.getElementById("socialList");
  socialList.innerHTML = SITE_DATA.socials
    .map((s) => {
      const targetAttr = s.copyEmail ? "" : ' target="_blank" rel="noopener"';
      const cls = s.id === "xiaohongshu" ? "social-seal is-xhs" : "social-seal";
      const copyAttr = s.copyEmail ? ` data-copy-email="${s.copyEmail}"` : "";
      return `
      <li class="social-seal-item">
        <a
          class="${cls}"
          href="${s.href}"${targetAttr}${copyAttr}
          aria-label="${s.name}: ${s.tip}"
        >
          <img class="social-seal-icon" src="${s.icon}" alt="" aria-hidden="true" />
        </a>
      </li>`;
    })
    .join('<li class="social-dot-sep" aria-hidden="true"></li>');

  socialList.querySelectorAll("[data-copy-email]").forEach((lnk) => {
    lnk.addEventListener("click", async () => {
      const email = lnk.dataset.copyEmail || "";
      const tip = lnk.parentElement?.querySelector(".social-seal-tip");
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(email);
        }
        if (tip) {
          tip.textContent = `已复制 ${email} ✓`;
          tip.classList.add("is-copied");
          setTimeout(() => {
            tip.textContent = email;
            tip.classList.remove("is-copied");
          }, 2200);
        }
      } catch {}
    });
  });

  /* ---------- 无界机械轴体交互 + 多色墨韵涟漪同步 ---------- */
  const switchName = document.getElementById("switchName");
  const switchTag = document.getElementById("switchTag");
  const switchDesc = document.getElementById("switchDesc");
  const switchTelemetry = document.getElementById("switchTelemetry");
  const switchPrev = document.getElementById("switchPrev");
  const switchNext = document.getElementById("switchNext");
  let currentSceneIdx = 0;

  function applySwitchTheme(meta, count = audio ? audio.count : 0) {
    if (!meta) return;
    if (scene2) scene2.style.setProperty("--sw-color", meta.color);
    if (switchName) switchName.textContent = meta.label;
    if (switchTag) switchTag.textContent = meta.tag;
    if (switchDesc) switchDesc.textContent = meta.note;
    if (switchTelemetry) {
      const padCount = String(count).padStart(2, "0");
      switchTelemetry.textContent = `${meta.weight} · 敲击 ${padCount}`;
    }
  }

  function triggerKeycapAction(sourceEl) {
    const res = audio ? audio.playKeycap() : { count: 0, sw: null };
    const meta = res.sw || (audio ? audio.getSwitchMeta() : null);
    applySwitchTheme(meta, res.count);
    catBridge.classList.add("boop");
    setTimeout(() => catBridge.classList.remove("boop"), 130);

    const rect = (sourceEl || catBridge).getBoundingClientRect();
    const cx = rect.left + rect.width * 0.44;
    const cy = rect.top + rect.height * 0.72;
    const swColor = meta?.color || "#c84326";
    const swRgb = meta?.rgb || [0.784, 0.263, 0.149];
    sparkFx.burst(cx, cy, swColor);
    shader?.triggerRipple(cx / Math.max(1, window.innerWidth), cy / Math.max(1, window.innerHeight), swRgb, 1.0);
  }

  function selectSwitch(id, triggerFeedback = true) {
    if (!audio) return;
    const meta = audio.setSwitch(id);
    applySwitchTheme(meta, audio.count);
    if (triggerFeedback) {
      triggerKeycapAction(catBridge);
    }
  }

  function stepSwitch(delta) {
    const curr = audio ? audio.switchId : "thock";
    const idx = Math.max(0, SWITCH_KEYS.indexOf(curr));
    const next = SWITCH_KEYS[(idx + delta + SWITCH_KEYS.length) % SWITCH_KEYS.length];
    selectSwitch(next, true);
  }

  switchPrev?.addEventListener("click", () => stepSwitch(-1));
  switchNext?.addEventListener("click", () => stepSwitch(1));
  catBridge.addEventListener("click", () => triggerKeycapAction(catBridge));
  document.getElementById("resetNotesBtn")?.addEventListener("click", () => notes?.resetAll());

  /* ---------- 书桌便条：从 deskNotes 池按便条位数随机抽取，点击再换一句 ---------- */
  function initDeskNotes() {
    const wraps = Array.from(document.querySelectorAll(".sticky-note-wrap"));
    const pool = Array.isArray(SITE_DATA.deskNotes) ? SITE_DATA.deskNotes.filter((n) => n && n.text) : [];
    if (!wraps.length || !pool.length) return;

    const used = new Set();

    const pickUnused = (exceptId) => {
      const available = pool.filter((n) => n.id !== exceptId && !used.has(n.id));
      const fallback = pool.filter((n) => n.id !== exceptId);
      const source = available.length ? available : (fallback.length ? fallback : pool);
      return source[Math.floor(Math.random() * source.length)];
    };

    const applyNote = (wrap, entry, prevId) => {
      const head = wrap.querySelector(".note-head");
      const body = wrap.querySelector(".desk-note p");
      if (!entry || !body) return;
      if (prevId) used.delete(prevId);
      used.add(entry.id);
      wrap.dataset.noteId = entry.id;
      if (head) head.textContent = entry.label || "";
      body.textContent = entry.text;
    };

    wraps.forEach((wrap) => {
      applyNote(wrap, pickUnused(null), null);

      let press = null;
      wrap.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button, a")) return;
        press = { x: e.clientX, y: e.clientY, id: e.pointerId };
      });
      wrap.addEventListener("pointerup", (e) => {
        if (!press || press.id !== e.pointerId) return;
        const dist = Math.hypot(e.clientX - press.x, e.clientY - press.y);
        press = null;
        if (e.target.closest("button, a")) return;
        if (dist >= 12) return;
        const currentId = wrap.dataset.noteId;
        applyNote(wrap, pickUnused(currentId), currentId);
      });
    });
  }
  initDeskNotes();

  /* ---------- 唯一黑猫爪黑胶唱片背景音乐开关（点击猫爪才播放） + 换碟动画 ---------- */
  const bgmAudio = document.getElementById("bgmAudio");
  const bgmTurntable = document.getElementById("bgmTurntable");
  const bgmDiscImg = document.getElementById("bgmDiscImg");
  const bgmSwapBtn = document.getElementById("bgmSwapBtn");
  const bgmSwapText = document.getElementById("bgmSwapText");
  const bgmTrackToast = document.getElementById("bgmTrackToast");
  const tracks = SITE_DATA.bgmTracks || [];
  let isBgmPlaying = false;
  let activeTrackIdx = 0;
  let isSwappingDisc = false;
  let toastTimer = null;
  let fadeRaf = null;
  let audioStarted = false;
  let userMutedBgm = false;

  tracks.forEach((t) => {
    const img = new Image();
    img.src = t.disc;
  });

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function applyTrackMeta(idx) {
    const track = tracks[idx];
    if (!track) return;
    if (bgmDiscImg) bgmDiscImg.src = track.disc;
    if (bgmSwapText) bgmSwapText.textContent = `换碟 · ${idx + 1}/${tracks.length}`;
    if (bgmTrackToast) bgmTrackToast.textContent = `0${idx + 1} · ${track.title}`;
  }

  function showTrackToast(durationMs = 2600) {
    if (!bgmTrackToast) return;
    if (toastTimer) clearTimeout(toastTimer);
    bgmTrackToast.classList.add("is-visible");
    toastTimer = setTimeout(() => {
      bgmTrackToast.classList.remove("is-visible");
      toastTimer = null;
    }, durationMs);
  }

  function fadeAudioVolume(targetVol, durationMs, onDone) {
    if (!bgmAudio) return;
    if (fadeRaf !== null) cancelAnimationFrame(fadeRaf);
    const startVol = bgmAudio.volume;
    const startT = performance.now();
    const step = (now) => {
      const u = clamp01((now - startT) / Math.max(1, durationMs));
      bgmAudio.volume = clamp01(lerp(startVol, targetVol, u));
      if (u < 1) {
        fadeRaf = requestAnimationFrame(step);
      } else {
        fadeRaf = null;
        onDone?.();
      }
    };
    fadeRaf = requestAnimationFrame(step);
  }

  function setTurntableUI(playing) {
    isBgmPlaying = playing;
    if (!bgmTurntable) return;
    bgmTurntable.classList.toggle("is-playing", playing);
    bgmTurntable.setAttribute("aria-pressed", playing ? "true" : "false");
    bgmTurntable.setAttribute("aria-label", playing ? "暂停背景纯音乐" : "播放背景纯音乐");
    bgmTurntable.setAttribute("title", playing ? "点击收回猫爪暂停 / 静音" : "点击伸出猫爪播放背景纯音乐");
  }

  function tryStartBgm() {
    if (!bgmAudio || !isBgmPlaying) return Promise.resolve(false);
    bgmAudio.volume = 0;
    return bgmAudio.play()
      .then(() => {
        audioStarted = true;
        fadeAudioVolume(0.36, 650);
        return true;
      })
      .catch(() => false);
  }

  function unlockAudioContext() {
    audio?.unlock?.();
  }

  function startBgmFromGesture() {
    if (userMutedBgm || isSwappingDisc) return Promise.resolve(false);
    if (isBgmPlaying && audioStarted) return Promise.resolve(true);
    setTurntableUI(true);
    return tryStartBgm();
  }

  // 首次手势：解锁 AudioContext，并自动取消静音开始播放 BGM。
  // 不在没有手势时强行出声（会被浏览器拦截）。用户之后仍可用右下角唱片开关静音。
  function armFirstGestureUnlock() {
    const unlock = (e) => {
      unlockAudioContext();
      if (e.target?.closest?.("#bgmTurntable, .bgm-swap-cluster")) return;
      if (userMutedBgm) {
        cleanup();
        return;
      }
      startBgmFromGesture().then((ok) => {
        if (ok || userMutedBgm) cleanup();
      });
    };
    const cleanup = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true, capture: true });
  }

  async function swapToNextTrack() {
    if (isSwappingDisc || !bgmTurntable || !bgmAudio || tracks.length < 2) return;
    isSwappingDisc = true;
    bgmTurntable.classList.add("is-swapping");
    if (bgmSwapBtn) bgmSwapBtn.disabled = true;

    const wasPlaying = isBgmPlaying;
    const nextIdx = (activeTrackIdx + 1) % tracks.length;
    const nextTrack = tracks[nextIdx];

    if (reducedMotion) {
      if (wasPlaying) bgmAudio.pause();
      activeTrackIdx = nextIdx;
      bgmAudio.src = nextTrack.src;
      bgmAudio.currentTime = 0;
      bgmAudio.load();
      applyTrackMeta(activeTrackIdx);
      showTrackToast(2600);
      if (wasPlaying) {
        const ok = await tryStartBgm();
        if (!ok) armFirstGestureUnlock();
      }
      bgmTurntable.classList.remove("is-swapping");
      if (bgmSwapBtn) bgmSwapBtn.disabled = false;
      isSwappingDisc = false;
      return;
    }

    if (wasPlaying) {
      // 播放态切换：先保持猫爪贴合黑胶并立即停止播放与旋转
      bgmTurntable.classList.add("is-grabbing");
      setTurntableUI(false);
      fadeAudioVolume(0, 180, () => {
        if (!isBgmPlaying) bgmAudio.pause();
      });
      await sleep(180);
    } else {
      // 静止态切换：猫爪先落到旧唱片上抓取（不触发播放）
      bgmTurntable.classList.add("is-grabbing");
      await sleep(440);
    }

    // 猫爪带着旧黑胶一起移出页面可视区域下方
    bgmTurntable.classList.add("is-swapping-out");
    await sleep(410);

    // 在视口外静默更换为新配色黑胶与新曲目
    activeTrackIdx = nextIdx;
    bgmAudio.pause();
    bgmAudio.src = nextTrack.src;
    bgmAudio.currentTime = 0;
    bgmAudio.load();
    applyTrackMeta(activeTrackIdx);
    await sleep(110);

    // 猫爪携新配色唱片一同升回桌面
    bgmTurntable.classList.remove("is-swapping-out");
    await sleep(490);

    const rect = bgmTurntable.getBoundingClientRect();
    const cx = (rect.left + rect.width * 0.38) / Math.max(1, window.innerWidth);
    const cy = (rect.top + rect.height * 0.56) / Math.max(1, window.innerHeight);
    shader?.triggerRipple(cx, cy, nextTrack.rgb, 0.72);
    showTrackToast(2600);

    if (wasPlaying) {
      setTurntableUI(true);
      bgmTurntable.classList.remove("is-grabbing");
      const ok = await tryStartBgm();
      if (!ok) armFirstGestureUnlock();
    } else {
      // 原本未播放：新碟到位后松开猫爪回到静止位，保持静音
      bgmTurntable.classList.remove("is-grabbing");
    }

    bgmTurntable.classList.remove("is-swapping");
    if (bgmSwapBtn) bgmSwapBtn.disabled = false;
    isSwappingDisc = false;
  }

  bgmSwapBtn?.addEventListener("click", () => {
    swapToNextTrack();
  });

  bgmTurntable?.addEventListener("click", async () => {
    if (isSwappingDisc) return;
    const next = !isBgmPlaying;
    setTurntableUI(next);

    const rect = bgmTurntable.getBoundingClientRect();
    const cx = (rect.left + rect.width * 0.38) / Math.max(1, window.innerWidth);
    const cy = (rect.top + rect.height * 0.56) / Math.max(1, window.innerHeight);
    const meta = audio?.getSwitchMeta();
    shader?.triggerRipple(cx, cy, next ? (meta?.rgb || true) : false, 0.78);

    if (!bgmAudio) return;
    if (next) {
      userMutedBgm = false;
      unlockAudioContext();
      const ok = await tryStartBgm();
      if (!ok) {
        setTurntableUI(false);
        armFirstGestureUnlock();
      }
    } else {
      userMutedBgm = true;
      fadeAudioVolume(0, 320, () => {
        if (!isBgmPlaying) bgmAudio.pause();
      });
    }
  });

  armFirstGestureUnlock();

  // 指针点击按钮或链接后释放焦点，避免键盘触发时残留选中框或误触
  document.addEventListener("click", (e) => {
    if (e.detail > 0) {
      e.target?.closest?.("button, a")?.blur?.();
    }
  });

  // 点击宣纸空白处触发当前轴体色系涟漪
  document.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, a, .sticky-note-wrap, .switch-rail, .reader, .turntable-toggle, .bgm-swap-cluster, #finaleBrushCanvas")) return;
    const meta = audio?.getSwitchMeta();
    const color = currentSceneIdx === 1 && meta ? meta.rgb : false;
    shader?.triggerRipple(
      e.clientX / Math.max(1, window.innerWidth),
      e.clientY / Math.max(1, window.innerHeight),
      color,
      0.65
    );
  });

  /* ---------- 随笔阅读层 ---------- */
  const reader = document.getElementById("reader");
  const readerBody = document.getElementById("readerBody");
  const readerIndex = document.getElementById("readerIndex");
  const readerProgress = document.getElementById("readerProgress");
  const readerPrev = document.getElementById("readerPrev");
  const readerNext = document.getElementById("readerNext");
  const readerFontToggle = document.getElementById("readerFontToggle");
  let activeEssayIdx = -1;
  let lastTriggerBtn = null;

  function renderReaderEssay(idx) {
    const e = SITE_DATA.essays[idx];
    if (!e) return;
    activeEssayIdx = idx;
    readerIndex.textContent = `0${idx + 1} / 0${SITE_DATA.essays.length}`;
    readerBody.innerHTML = `
      <time>${e.date} · 约 ${e.readTime}</time>
      <h1 id="readerTitle">${e.title}</h1>
      ${e.body.map((p) => `<p>${p}</p>`).join("")}
      ${e.quote ? `<blockquote>${e.quote}</blockquote>` : ""}`;
    readerPrev.disabled = idx <= 0;
    readerNext.disabled = idx >= SITE_DATA.essays.length - 1;
    reader.scrollTop = 0;
    readerProgress.style.width = "0%";
  }

  function openReader(idx, triggerEl) {
    lastTriggerBtn = triggerEl || document.activeElement;
    renderReaderEssay(idx);
    reader.classList.add("open");
    reader.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    audio?.playPageTurn();
    document.getElementById("readerClose")?.focus({ preventScroll: true });
  }

  function closeReader() {
    if (!reader.classList.contains("open")) return;
    reader.classList.remove("open");
    reader.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastTriggerBtn?.focus?.({ preventScroll: true });
  }

  essayList.querySelectorAll(".essay-btn").forEach((btn) => {
    btn.addEventListener("click", () => openReader(Number(btn.dataset.idx), btn));
  });
  document.getElementById("readerClose")?.addEventListener("click", closeReader);
  readerPrev?.addEventListener("click", () => {
    if (activeEssayIdx > 0) {
      audio?.playPageTurn();
      renderReaderEssay(activeEssayIdx - 1);
    }
  });
  readerNext?.addEventListener("click", () => {
    if (activeEssayIdx < SITE_DATA.essays.length - 1) {
      audio?.playPageTurn();
      renderReaderEssay(activeEssayIdx + 1);
    }
  });
  readerFontToggle?.addEventListener("click", () => {
    const large = reader.classList.toggle("is-large");
    readerFontToggle.textContent = large ? "字号 · 舒朗" : "字号 · 适中";
  });
  reader?.addEventListener("scroll", () => {
    const max = reader.scrollHeight - reader.clientHeight;
    const pct = max > 0 ? (reader.scrollTop / max) * 100 : 100;
    readerProgress.style.width = `${pct.toFixed(1)}%`;
  });

  window.addEventListener("keydown", (e) => {
    const isReaderOpen = reader.classList.contains("open");
    if (isReaderOpen) {
      if (e.key === "Escape") closeReader();
      if (e.key === "ArrowLeft" && activeEssayIdx > 0) {
        audio?.playPageTurn();
        renderReaderEssay(activeEssayIdx - 1);
      }
      if (e.key === "ArrowRight" && activeEssayIdx < SITE_DATA.essays.length - 1) {
        audio?.playPageTurn();
        renderReaderEssay(activeEssayIdx + 1);
      }
      return;
    }

    if (e.target.closest("input, textarea")) return;
    if (e.code === "Space" && !e.repeat) {
      if (document.activeElement?.tagName === "BUTTON" && document.activeElement !== catBridge) return;
      e.preventDefault();
      triggerKeycapAction(catBridge);
    }
    if (e.key >= "1" && e.key <= "4") {
      selectSwitch(SWITCH_KEYS[Number(e.key) - 1], true);
    }
    if (currentSceneIdx === 1) {
      if (e.key === "ArrowLeft") stepSwitch(-1);
      if (e.key === "ArrowRight") stepSwitch(1);
    }
  });

  /* ---------- 双乐章编排：第一乐章吸顶纵向视差（幕 1->2） + 第二乐章自然纵向延展（幕 3->4->5） ---------- */
  const s2Head = document.getElementById("s2Head");
  const s2SwitchWrap = document.getElementById("s2SwitchWrap");
  const switchCallout = document.getElementById("switchCallout");
  const stickyWraps = Array.from(document.querySelectorAll(".sticky-note-wrap"));
  const s3Watermark = document.getElementById("s3Watermark");
  const s4Watermark = document.getElementById("s4Watermark");

  const DESKTOP_WHEEL_MULT = 0.88;
  const DESKTOP_WHEEL_LAMBDA = 6.2;
  const DESKTOP_NAV_LAMBDA = 5.0;
  const DESKTOP_NATIVE_LAMBDA = 7.4;
  const MOBILE_LAG_LAMBDA = 9.5;

  let scrollRaf = null;
  let forcedStatic = false;

  let virtualScrollY = 0;
  let smoothScrollY = 0;
  let nativeTargetY = 0;
  let scrollMode = "idle";
  let lastProgrammaticY = -1;
  let damperLastTs = 0;

  let mobileSmoothY = 0;
  let mobileRaf = null;
  let mobileLastTs = 0;

  function isDesktopCinema() {
    return !reducedMotion && !forcedStatic && window.innerWidth >= 860;
  }

  function getMaxScroll() {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  function getAct1Max() {
    return Math.max(1, runway.offsetHeight - window.innerHeight);
  }

  function getSceneScrollY(idx) {
    const clampedIdx = Math.max(0, Math.min(4, idx));
    if (clampedIdx === 0) return 0;
    if (clampedIdx === 1) return Math.round(getAct1Max() * 0.72);
    const el = jumpEls[clampedIdx];
    if (!el) return getMaxScroll();
    return Math.max(0, Math.min(getMaxScroll(), Math.round(el.getBoundingClientRect().top + window.scrollY)));
  }

  function cancelScrollDamper() {
    if (scrollRaf !== null) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = null;
    }
    scrollMode = "idle";
    damperLastTs = 0;
  }

  function updateEditorialState(act1Progress = 0) {
    if (scene5 && finaleBrush && !finaleBrush.hasPlayed) {
      if (scene5.getBoundingClientRect().top < window.innerHeight * 0.68) {
        finaleBrush.play();
      }
    }

    const anchorY = window.innerHeight * 0.48;
    let nextIdx = act1Progress >= 0.30 ? 1 : 0;
    if (scene5 && scene5.getBoundingClientRect().top <= anchorY) nextIdx = 4;
    else if (scene4 && scene4.getBoundingClientRect().top <= anchorY) nextIdx = 3;
    else if (scene3 && scene3.getBoundingClientRect().top <= anchorY) nextIdx = 2;

    currentSceneIdx = nextIdx;

    navLinks.forEach((lnk) => {
      const part = lnk.dataset.navPart;
      const active =
        (nextIdx === 2 && part === "arcade") ||
        (nextIdx === 3 && part === "essays") ||
        (nextIdx === 4 && part === "contact");
      lnk.classList.toggle("is-active", active);
    });
  }

  function applyStageAtScrollY(y) {
    if (!isDesktopCinema()) {
      scene1.style.opacity = "";
      scene2.style.opacity = "";
      scene1.classList.add("is-current");
      scene2.classList.add("is-current");
      catBridge.style.opacity = "";
      catBridge.style.transform = "";
      catBridge.style.pointerEvents = "";
      brushStage.style.opacity = "";
      brushStage.style.transform = "";
      brushStage.style.filter = "";
      if (bgmHint) bgmHint.style.opacity = "";
      if (s3Watermark) s3Watermark.style.transform = "";
      if (s4Watermark) s4Watermark.style.transform = "";
      updateEditorialState(0);
      return;
    }

    const act1Max = getAct1Max();
    const p1 = clamp01(y / act1Max);

    // --- Act I: 纵深视差开篇签名 (0.00) -> 一隅键声 (0.56..1.00 稳态展示，随后自然上滑离场) ---
    const s1Fade = smoothstep(0.06, 0.44, p1);
    scene1.style.opacity = String(Math.max(0.03, 1 - s1Fade * 0.97).toFixed(3));
    brushStage.style.opacity = String(lerp(1, 0.025, s1Fade).toFixed(3));
    brushStage.style.transform = `translate3d(-50%, ${(-s1Fade * 54).toFixed(1)}px, 0) scale(${lerp(1, 1.14, s1Fade).toFixed(4)})`;
    brushStage.style.filter = s1Fade > 0.02 ? `blur(${(s1Fade * 9).toFixed(2)}px)` : "none";
    if (bgmHint) {
      bgmHint.style.opacity = p1 > 0.06 ? "0" : "";
    }

    const catRise = smoothstep(0.05, 0.48, p1);
    const riseVh = window.innerHeight <= 780 ? 31 : 34;
    const catY = lerp(0, -window.innerHeight * (riseVh / 100), catRise);
    const catScale = lerp(1, 1.22, catRise);
    catBridge.style.opacity = "1";
    catBridge.style.transform = `translate3d(-50%, ${catY.toFixed(1)}px, 0) scale(${catScale.toFixed(4)})`;
    catBridge.style.pointerEvents = "auto";

    const s2In = smoothstep(0.24, 0.56, p1);
    const s2Shift = (1 - s2In) * 48;
    scene2.style.opacity = String(s2In.toFixed(3));
    if (s2Head) s2Head.style.transform = `translate3d(0, ${(s2Shift * 0.62).toFixed(1)}px, 0)`;
    if (switchCallout) switchCallout.style.setProperty("--py", `${(s2Shift * 1.18).toFixed(1)}px`);
    if (s2SwitchWrap) s2SwitchWrap.style.transform = `translate3d(0, ${(s2Shift * 1.42).toFixed(1)}px, 0)`;
    stickyWraps.forEach((w) => {
      const rate = parseFloat(w.dataset.pyRate || "1.35");
      w.style.setProperty("--py", `${(s2Shift * rate).toFixed(1)}px`);
    });

    scene1.classList.toggle("is-current", p1 < 0.30);
    scene2.classList.toggle("is-current", p1 >= 0.30);

    // --- Act II: 游乐场 / 随笔水印柔和纵向景深视差 ---
    const vh = Math.max(1, window.innerHeight);
    if (scene3 && s3Watermark) {
      const r3 = scene3.getBoundingClientRect();
      const off3 = Math.max(-1, Math.min(1, (r3.top + r3.height * 0.5 - vh * 0.5) / vh));
      s3Watermark.style.transform = `translate3d(0, ${(off3 * -32).toFixed(1)}px, 0)`;
    }
    if (scene4 && s4Watermark) {
      const r4 = scene4.getBoundingClientRect();
      const off4 = Math.max(-1, Math.min(1, (r4.top + r4.height * 0.5 - vh * 0.5) / vh));
      s4Watermark.style.transform = `translate3d(0, ${(off4 * -32).toFixed(1)}px, 0)`;
    }

    updateEditorialState(p1);

    const dissolveEnergy = Math.sin(s1Fade * Math.PI) * 0.85;
    shader?.setScrollProgress(clamp01(y / getMaxScroll()), dissolveEnergy);
  }

  function startScrollDamper() {
    if (scrollRaf !== null) return;
    damperLastTs = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - damperLastTs) / 1000));
      damperLastTs = now;

      if (scrollMode === "wheel" || scrollMode === "nav") {
        const lambda = scrollMode === "nav" ? DESKTOP_NAV_LAMBDA : DESKTOP_WHEEL_LAMBDA;
        const diffY = virtualScrollY - smoothScrollY;
        if (Math.abs(diffY) < 0.35) {
          smoothScrollY = virtualScrollY;
          lastProgrammaticY = Math.round(smoothScrollY);
          window.scrollTo(0, smoothScrollY);
          applyStageAtScrollY(smoothScrollY);
          scrollRaf = null;
          scrollMode = "idle";
          return;
        }
        smoothScrollY += diffY * (1 - Math.exp(-lambda * dt));
        lastProgrammaticY = Math.round(smoothScrollY);
        window.scrollTo(0, smoothScrollY);
        applyStageAtScrollY(smoothScrollY);
        scrollRaf = requestAnimationFrame(tick);
        return;
      }

      const diffNative = nativeTargetY - smoothScrollY;
      if (Math.abs(diffNative) < 0.35) {
        smoothScrollY = nativeTargetY;
        applyStageAtScrollY(smoothScrollY);
        scrollRaf = null;
        scrollMode = "idle";
        return;
      }
      smoothScrollY += diffNative * (1 - Math.exp(-DESKTOP_NATIVE_LAMBDA * dt));
      applyStageAtScrollY(smoothScrollY);
      scrollRaf = requestAnimationFrame(tick);
    };
    scrollRaf = requestAnimationFrame(tick);
  }

  function startMobileInertia() {
    if (mobileRaf !== null) return;
    mobileLastTs = performance.now();
    const tick = (now) => {
      if (isDesktopCinema() || reducedMotion) {
        mobileRaf = null;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - mobileLastTs) / 1000));
      mobileLastTs = now;
      const targetY = window.scrollY;
      mobileSmoothY += (targetY - mobileSmoothY) * (1 - Math.exp(-MOBILE_LAG_LAMBDA * dt));
      const lag = targetY - mobileSmoothY;
      const wmLag = Math.max(-18, Math.min(18, lag * 0.14));
      if (s3Watermark) s3Watermark.style.setProperty("--wm-lag-y", `${wmLag.toFixed(1)}px`);
      if (s4Watermark) s4Watermark.style.setProperty("--wm-lag-y", `${wmLag.toFixed(1)}px`);

      updateEditorialState(0);
      shader?.setScrollProgress(clamp01(mobileSmoothY / getMaxScroll()), Math.min(0.75, Math.abs(lag) / 420));

      if (Math.abs(lag) < 0.25) {
        mobileSmoothY = targetY;
        if (s3Watermark) s3Watermark.style.setProperty("--wm-lag-y", "0px");
        if (s4Watermark) s4Watermark.style.setProperty("--wm-lag-y", "0px");
        shader?.setScrollProgress(clamp01(mobileSmoothY / getMaxScroll()), 0);
        mobileRaf = null;
        return;
      }
      mobileRaf = requestAnimationFrame(tick);
    };
    mobileRaf = requestAnimationFrame(tick);
  }

  function scrollToScene(idx) {
    const clampedIdx = Math.max(0, Math.min(jumpEls.length - 1, idx));
    if (!isDesktopCinema()) {
      jumpEls[clampedIdx]?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      return;
    }
    smoothScrollY = window.scrollY;
    virtualScrollY = getSceneScrollY(clampedIdx);
    scrollMode = "nav";
    startScrollDamper();
  }

  window.addEventListener("wheel", (e) => {
    if (!isDesktopCinema() || reader.classList.contains("open") || e.ctrlKey) return;
    e.preventDefault();

    let dy = e.deltaY;
    if (e.deltaMode === 1) {
      dy *= 36;
    } else if (e.deltaMode === 2) {
      dy *= window.innerHeight * 0.85;
    }

    const clampedDelta = Math.max(-900, Math.min(900, dy));
    if (Math.abs(clampedDelta) < 0.01) return;

    if (scrollMode !== "wheel") {
      smoothScrollY = window.scrollY;
      virtualScrollY = smoothScrollY;
    }
    const maxScroll = getMaxScroll();
    virtualScrollY = Math.max(0, Math.min(maxScroll, virtualScrollY + clampedDelta * DESKTOP_WHEEL_MULT));
    scrollMode = "wheel";
    startScrollDamper();
  }, { passive: false });

  document.querySelectorAll("[data-scene-jump]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToScene(Number(el.dataset.sceneJump));
    });
  });

  /* ---------- 初始化与调试参数 ---------- */
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  const params = new URLSearchParams(window.location.search);
  const sceneParam = Number(params.get("scene"));
  const settledParam = params.get("settled") === "1";
  const bgmOffParam = params.get("bgm") === "0";
  const swParam = params.get("sw");
  const trackParam = Number(params.get("track"));
  const readerParam = params.get("reader");
  let ignoreInitialScrollUntil = 0;

  if (trackParam >= 1 && trackParam <= tracks.length) {
    activeTrackIdx = trackParam - 1;
    if (bgmAudio) bgmAudio.src = tracks[activeTrackIdx].src;
  }
  applyTrackMeta(activeTrackIdx);

  if (swParam && SWITCH_KEYS.includes(swParam)) {
    selectSwitch(swParam, false);
  } else if (audio) {
    applySwitchTheme(audio.getSwitchMeta(), 0);
  }

  // BGM 默认不自动播放（浏览器也会拦截有声自动播放），点击猫爪才开始；?bgm=0 保留兼容
  void bgmOffParam;
  setTurntableUI(false);

  if (reducedMotion || settledParam || (sceneParam >= 1 && sceneParam <= 5) || readerParam !== null) {
    heroBrush?.seek?.(1);
  }

  if (reducedMotion || settledParam || sceneParam === 5 || !isDesktopCinema()) {
    finaleBrush?.settle();
  }

  function snapToSceneParam() {
    if (!(sceneParam >= 1 && sceneParam <= 5)) return false;
    cancelScrollDamper();
    const targetY = getSceneScrollY(sceneParam - 1);
    ignoreInitialScrollUntil = performance.now() + 120;
    virtualScrollY = smoothScrollY = nativeTargetY = targetY;
    lastProgrammaticY = Math.round(targetY);
    mobileSmoothY = targetY;
    window.scrollTo(0, targetY);
    applyStageAtScrollY(targetY);
    return true;
  }

  if (!snapToSceneParam()) {
    const startY = window.scrollY;
    virtualScrollY = smoothScrollY = nativeTargetY = mobileSmoothY = startY;
    applyStageAtScrollY(startY);
  }

  window.addEventListener("load", () => {
    snapToSceneParam();
    if (reducedMotion || settledParam || (sceneParam >= 1 && sceneParam <= 5) || readerParam !== null) {
      heroBrush?.seek?.(1);
    }
    if (sceneParam === 5 || settledParam || !isDesktopCinema()) {
      finaleBrush?.settle();
    }
  });

  window.addEventListener("scroll", () => {
    if (isDesktopCinema()) {
      if (performance.now() < ignoreInitialScrollUntil) return;
      if ((scrollMode === "wheel" || scrollMode === "nav") && Math.abs(window.scrollY - lastProgrammaticY) <= 5) {
        return;
      }
      scrollMode = "native";
      nativeTargetY = window.scrollY;
      virtualScrollY = nativeTargetY;
      startScrollDamper();
      return;
    }
    if (reducedMotion) {
      updateEditorialState(0);
      return;
    }
    startMobileInertia();
  }, { passive: true });

  window.addEventListener("resize", () => {
    cancelScrollDamper();
    if (s3Watermark) s3Watermark.style.setProperty("--wm-lag-y", "0px");
    if (s4Watermark) s4Watermark.style.setProperty("--wm-lag-y", "0px");
    if (snapToSceneParam()) return;
    const nowY = window.scrollY;
    virtualScrollY = smoothScrollY = nativeTargetY = mobileSmoothY = nowY;
    applyStageAtScrollY(nowY);
  });

  if (readerParam !== null && SITE_DATA.essays[Number(readerParam)]) {
    openReader(Number(readerParam));
  }

  window.__keycatScrubTo = (p) => {
    cancelScrollDamper();
    const val = clamp01(Number(p));
    const y = val * getMaxScroll();
    virtualScrollY = smoothScrollY = nativeTargetY = y;
    window.scrollTo(0, y);
    applyStageAtScrollY(y);
  };
}

/* ---------- 读取 site/content/site.json 后启动 ---------- */
async function loadSiteContent() {
  try {
    const res = await fetch("./content/site.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    ["arcade", "essays", "socials", "deskNotes"].forEach((key) => {
      if (Array.isArray(data[key])) SITE_DATA[key] = data[key];
    });
  } catch (err) {
    console.warn(
      "[KeyCat] 未能读取 content/site.json；直接用 file:// 打开时浏览器会拦截读取，请用本地静态服务预览（如 npx serve site）。",
      err
    );
  }
}

const keycatDomReady = new Promise((resolve) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", resolve, { once: true });
  } else {
    resolve();
  }
});

Promise.all([keycatDomReady, loadSiteContent()]).then(bootKeyCat);

(() => {
  "use strict";
  const videos = [...document.querySelectorAll("video")];
  const button = document.querySelector("#motion-toggle");
  const label = document.querySelector("#motion-label");
  const icon = button.querySelector(".motion-icon");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const visible = new Set();
  const internalPauses = new WeakSet();
  const manualPauses = new WeakSet();
  let motionEnabled = !reducedMotion.matches;

  function load(video) {
    if (!video.dataset.src) return;
    video.src = video.dataset.src;
    delete video.dataset.src;
    video.load();
  }

  function pause(video) {
    if (video.paused) return;
    internalPauses.add(video);
    video.pause();
  }

  function play(video) {
    if (!motionEnabled || document.hidden || manualPauses.has(video)) return;
    load(video);
    // Browsers may block autoplay. Native controls remain available in that case.
    video.play()?.catch(() => {});
  }

  function updateButton() {
    label.textContent = motionEnabled ? "Pause videos" : "Play videos";
    icon.textContent = motionEnabled ? "Ⅱ" : "▶";
    button.setAttribute("aria-pressed", String(!motionEnabled));
    button.setAttribute("aria-label", motionEnabled ? "Pause all videos" : "Play visible videos");
  }

  videos.forEach((video) => {
    video.muted = true;
    // Viewport visibility manages autoplay, avoiding nine decoders running off screen.
    video.autoplay = false;
    video.addEventListener("pause", () => {
      if (internalPauses.has(video)) internalPauses.delete(video);
      else if (!video.ended) manualPauses.add(video);
    });
    video.addEventListener("play", () => manualPauses.delete(video));
    video.addEventListener("error", () => {
      if (video.nextElementSibling?.classList.contains("media-error")) return;
      const notice = document.createElement("p");
      notice.className = "media-error";
      notice.append("This video could not load. ");
      const link = document.createElement("a");
      link.href = video.currentSrc || video.src || video.dataset.src;
      link.textContent = "Open the video";
      notice.append(link);
      video.after(notice);
    });
  });

  if ("IntersectionObserver" in window) {
    const preloadObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) {
          load(target);
          preloadObserver.unobserve(target);
        }
      });
    }, { rootMargin: "350px 0px" });
    const playbackObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) {
          visible.add(target);
          play(target);
        } else {
          visible.delete(target);
          pause(target);
        }
      });
    }, { threshold: 0.12 });
    videos.forEach((video) => { preloadObserver.observe(video); playbackObserver.observe(video); });
  } else {
    videos.forEach((video) => { load(video); visible.add(video); play(video); });
  }

  button.hidden = false;
  updateButton();
  button.addEventListener("click", () => {
    motionEnabled = !motionEnabled;
    videos.forEach((video) => {
      if (motionEnabled) {
        manualPauses.delete(video);
        if (visible.has(video)) play(video);
      } else pause(video);
    });
    updateButton();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) videos.forEach(pause);
    else visible.forEach(play);
  });
  reducedMotion.addEventListener("change", (event) => {
    motionEnabled = !event.matches;
    if (motionEnabled) visible.forEach(play);
    else videos.forEach(pause);
    updateButton();
  });
})();

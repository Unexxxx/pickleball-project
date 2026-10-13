"use client";

import { useEffect } from "react";

/**
 * Scroll-driven motion for the marketing landing page:
 * - fades sections in as they enter the viewport (`.ls-reveal`)
 * - drifts decorative layers at their own speed (`.ls-parallax`, `data-speed`)
 * - scrubs video playback head-to-tail across its own section's scroll
 *   range (`video[data-scrub]`) instead of autoplaying on a loop — scroll
 *   down to advance it, scroll back up and it rewinds to frame zero.
 * No-ops the motion entirely under prefers-reduced-motion; scrub videos
 * stay parked on their first frame instead.
 */
export function LandingMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scrubVideos = Array.from(
      document.querySelectorAll<HTMLVideoElement>("video[data-scrub]"),
    );
    // Scrubbed video is always paused — its currentTime is set by hand.
    scrubVideos.forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });

    const revealEls = Array.from(document.querySelectorAll(".ls-reveal"));

    if (reduceMotion) {
      revealEls.forEach((el) => el.classList.add("ls-revealed"));
      return;
    }

    let observer: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("ls-revealed");
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 },
      );
      revealEls.forEach((el) => observer?.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add("ls-revealed"));
    }

    const layers = Array.from(
      document.querySelectorAll<HTMLElement>(".ls-parallax"),
    );
    let ticking = false;

    function applyFrame() {
      const viewportCenter = window.innerHeight / 2;

      layers.forEach((el) => {
        const speed = parseFloat(el.dataset.speed ?? "0") || 0;
        const host = el.closest("section") ?? el.parentElement;
        if (!host) return;
        const rect = host.getBoundingClientRect();
        const hostCenter = rect.top + rect.height / 2;
        const offset = (viewportCenter - hostCenter) * speed;
        const maxOffset = Math.max(40, rect.height * 0.18);
        const bounded = Math.min(Math.max(offset, -maxOffset), maxOffset);
        el.style.transform = `translate3d(0, ${bounded}px, 0)`;
      });

      scrubVideos.forEach((video) => {
        // Not enough data to seek yet — leave it parked on frame zero.
        if (video.readyState < 1 || !Number.isFinite(video.duration)) return;
        const host = video.closest("section");
        if (!host) return;
        const rect = host.getBoundingClientRect();
        // Starts the instant the section's top edge enters the bottom of the
        // viewport and finishes when the section is centered on screen, so
        // the video is already moving as it appears and has played out by
        // the time it's fully in view.
        const startTop = window.innerHeight;
        const endTop = (window.innerHeight - rect.height) / 2;
        const progress = Math.min(
          Math.max((startTop - rect.top) / (startTop - endTop), 0),
          1,
        );
        const targetTime = progress * video.duration;
        // Skip near-identical seeks; avoids redundant decode work at rest.
        if (Math.abs(video.currentTime - targetTime) > 0.01) {
          video.currentTime = targetTime;
        }
      });

      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(applyFrame);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("orientationchange", onScroll, { passive: true });
    // Run once metadata is available so the initial frame is correct even
    // if the page loads already scrolled (e.g. back-forward navigation).
    scrubVideos.forEach((video) => {
      if (video.readyState >= 1) applyFrame();
      else video.addEventListener("loadedmetadata", applyFrame, { once: true });
    });
    applyFrame();

    // The header is transparent over the dark hero, so it needs dark text
    // while it sits over the light CTA band and footer. Watch a thin strip at
    // the very top of the viewport and flip a class when a light section is
    // underneath it.
    const header = document.querySelector<HTMLElement>(".site-header");
    const lightBands = document.querySelectorAll(".ls-steps-section, .ls-final-cta, .ls-footer");
    const overlap = new Set<Element>();
    const lightObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          entry.isIntersecting
            ? overlap.add(entry.target)
            : overlap.delete(entry.target),
        );
        header?.classList.toggle("site-header--on-light", overlap.size > 0);
      },
      { rootMargin: "0px 0px -92% 0px", threshold: 0 },
    );
    lightBands.forEach((el) => lightObserver.observe(el));

    return () => {
      lightObserver.disconnect();
      header?.classList.remove("site-header--on-light");
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("orientationchange", onScroll);
    };
  }, []);

  return null;
}

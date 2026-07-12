"use client";

import { useEffect } from "react";

export function CalendarGridScrollSync() {
  useEffect(() => {
    const shells = Array.from(
      document.querySelectorAll<HTMLElement>("[data-calendar-grid-shell]"),
    );
    const cleanups: Array<() => void> = [];

    for (const shell of shells) {
      const header = shell.querySelector<HTMLElement>(
        "[data-calendar-grid-header-scroll]",
      );
      const body = shell.querySelector<HTMLElement>(
        "[data-calendar-grid-body-scroll]",
      );

      if (!header || !body) {
        continue;
      }

      let isSyncing = false;

      const syncScroll = (source: HTMLElement, target: HTMLElement) => {
        if (isSyncing || source.scrollLeft === target.scrollLeft) {
          return;
        }

        isSyncing = true;
        target.scrollLeft = source.scrollLeft;
        requestAnimationFrame(() => {
          isSyncing = false;
        });
      };

      const handleHeaderScroll = () => syncScroll(header, body);
      const handleBodyScroll = () => syncScroll(body, header);

      header.addEventListener("scroll", handleHeaderScroll, {
        passive: true,
      });
      body.addEventListener("scroll", handleBodyScroll, { passive: true });
      header.scrollLeft = body.scrollLeft;

      cleanups.push(() => {
        header.removeEventListener("scroll", handleHeaderScroll);
        body.removeEventListener("scroll", handleBodyScroll);
      });
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}

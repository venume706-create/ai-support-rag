import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { db, login } from "./helpers";
import { expect, test } from "./fixtures";

/**
 * Вёрстка на устройствах (npm run test:devices). На каждой странице каждой роли проверяется:
 *  1. нет горизонтальной прокрутки и ничто не выходит за экран;
 *  2. кнопки, ссылки-кнопки, поля и переключатели не меньше 44×44 px;
 *  3. шрифт в полях ввода не меньше 16 px (иначе iPhone приближает экран при вводе);
 *  4. вкладки/нижняя панель/боковое меню — по ширине экрана;
 *  5. отступы «чёлки» и нижней панели iPhone учтены, контент не прячется под навигацией.
 * Скриншоты ключевых страниц сохраняются в out/screenshots/<устройство>/.
 */

interface PageSpec {
  key: string;
  url: string;
  shot?: boolean;
}

async function pagesFor(role: "admin" | "teacher" | "student"): Promise<PageSpec[]> {
  const g = await db.group.findFirstOrThrow({ where: { name: "Математика A1" }, include: { students: true } });
  const t = await db.teacher.findFirstOrThrow({ where: { user: { login: "teacher1" } } });
  const s = await db.student.findFirstOrThrow({ where: { user: { login: "student1" } } });
  const profile = { key: "profile", url: "/profile", shot: true };
  if (role === "admin") {
    return [
      { key: "home", url: "/admin", shot: true },
      { key: "teachers", url: "/admin/teachers", shot: true },
      { key: "teacher", url: `/admin/teachers/${t.id}` },
      { key: "students", url: "/admin/students", shot: true },
      { key: "student", url: `/admin/students/${s.id}`, shot: true },
      { key: "groups", url: "/admin/groups" },
      { key: "group", url: `/admin/groups/${g.id}` },
      { key: "schedule", url: "/admin/schedule", shot: true },
      profile,
    ];
  }
  if (role === "teacher") {
    return [
      { key: "home", url: "/teacher", shot: true },
      { key: "groups", url: "/teacher/groups" },
      { key: "journal", url: `/teacher/groups/${g.id}`, shot: true },
      { key: "students", url: `/teacher/groups/${g.id}?tab=students` },
      { key: "homework", url: `/teacher/groups/${g.id}?tab=homework`, shot: true },
      { key: "student", url: `/teacher/students/${g.students[0].studentId}` },
      { key: "schedule", url: "/teacher/schedule" },
      profile,
    ];
  }
  return [
    { key: "home", url: "/student", shot: true },
    { key: "grades", url: "/student/grades", shot: true },
    { key: "attendance", url: "/student/attendance" },
    { key: "homework", url: "/student/homework", shot: true },
    { key: "schedule", url: "/student/schedule" },
    profile,
  ];
}

/** Что не так с вёрсткой текущей страницы (пустой список — всё хорошо). */
async function audit(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = [];
    const vw = window.innerWidth;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[aria-hidden='true']:not(svg *)") && !el.closest(".sr-only");
    };
    const label = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}[${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24)}]`;

    // 1. горизонтальная прокрутка
    if (document.documentElement.scrollWidth > vw + 1) problems.push(`горизонтальная прокрутка: ${document.documentElement.scrollWidth}px > ${vw}px`);
    // элементы, вылезающие за правый край (вне блоков с собственной прокруткой)
    for (const el of document.querySelectorAll("main *, header *, nav *")) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) {
        let scroller = false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o === "auto" || o === "scroll" || o === "hidden") {
            scroller = true;
            break;
          }
        }
        if (!scroller) {
          problems.push(`выходит за экран: ${label(el)} (${Math.round(r.left)}…${Math.round(r.right)} из ${vw})`);
          break;
        }
      }
    }

    // 2. размер целей нажатия
    const targets = document.querySelectorAll(
      "button, summary, select, textarea, [role='tab'], nav a, a.key, input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='file'])",
    );
    for (const el of targets) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 43.5 || r.width < 43.5) problems.push(`мелкая цель ${Math.round(r.width)}×${Math.round(r.height)}: ${label(el)}`);
    }
    for (const input of document.querySelectorAll("input[type='checkbox'], input[type='radio']")) {
      const box = input.closest("label") ?? input;
      if (!visible(box)) continue;
      const r = box.getBoundingClientRect();
      if (r.height < 43.5) problems.push(`мелкий переключатель ${Math.round(r.width)}×${Math.round(r.height)}: ${label(box)}`);
    }

    // 3. шрифт в полях
    for (const el of document.querySelectorAll("input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']), textarea, select")) {
      if (!visible(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 16) problems.push(`шрифт поля ${size}px < 16px: ${label(el)}`);
    }
    return problems;
  });
}

for (const role of ["admin", "teacher", "student"] as const) {
  test(`вёрстка: ${role}`, async ({ page, safeArea }, info) => {
    test.setTimeout(240_000);
    const device = info.project.name.replace(/^dev-/, "");
    const shotDir = path.join(__dirname, "..", "..", "out", "screenshots", device);
    fs.mkdirSync(shotDir, { recursive: true });
    const vw = page.viewportSize()!.width;
    const hasInsets = safeArea.top + safeArea.bottom + safeArea.left + safeArea.right > 0;
    if (hasInsets) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: safeArea });
    }

    const creds = { admin: ["admin", "admin123"], teacher: ["teacher1", "teacher123"], student: ["student1", "student123"] }[role];
    if (role === "admin") {
      // Страница входа — одна на все роли: проверяем и делаем скриншот один раз
      await page.goto("/login");
      expect(await audit(page), "страница входа").toEqual([]);
      await page.screenshot({ path: path.join(shotDir, "login.jpg"), fullPage: true, type: "jpeg", quality: 55 });
    }
    await login(page, creds[0], creds[1]);

    const failures: string[] = [];
    for (const spec of await pagesFor(role)) {
      const res = await page.goto(spec.url);
      if (res?.status() !== 200) {
        failures.push(`${spec.url}: статус ${res?.status()}`);
        continue;
      }
      await page.waitForLoadState("networkidle").catch(() => undefined);
      const problems = await audit(page);
      failures.push(...problems.map((p) => `${spec.url}: ${p}`));

      // Навигация: до 1024px — нижняя панель, от 1024px — боковое меню
      const sidebar = page.locator("aside").first();
      const bottom = page.locator("nav[aria-label='mobile']");
      if (vw < 1024) {
        if (!(await bottom.isVisible())) failures.push(`${spec.url}: нет нижней панели на ${vw}px`);
        if (await sidebar.isVisible()) failures.push(`${spec.url}: боковое меню на ${vw}px`);
      } else {
        if (!(await sidebar.isVisible())) failures.push(`${spec.url}: нет бокового меню на ${vw}px`);
        if (await bottom.isVisible()) failures.push(`${spec.url}: нижняя панель на ${vw}px`);
      }

      // Таблицы на телефоне — карточки (нет заголовка таблицы, строки — блоки)
      if (vw < 768) {
        const bad = await page.evaluate(() =>
          [...document.querySelectorAll("table.rtable")].filter((t) => {
            const th = t.querySelector("thead");
            const tr = t.querySelector("tbody tr");
            return (th && getComputedStyle(th).position !== "absolute") || (tr && getComputedStyle(tr).display !== "block");
          }).length,
        );
        if (bad) failures.push(`${spec.url}: таблиц не в виде карточек: ${bad}`);
      }

      // Отступы «чёлки»: шапка и нижняя панель учитывают safe-area; контент не прячется под панелью
      if (hasInsets && vw < 1024) {
        const pads = await page.evaluate(() => {
          const px = (el: Element | null, side: "paddingTop" | "paddingBottom" | "paddingLeft") => (el ? parseFloat(getComputedStyle(el)[side]) : 0);
          const header = document.querySelector("header");
          const nav = document.querySelector("nav[aria-label='mobile']");
          return { headerTop: px(header, "paddingTop"), navBottom: px(nav, "paddingBottom") };
        });
        if (safeArea.top && pads.headerTop < safeArea.top) failures.push(`${spec.url}: шапка не учитывает «чёлку» (${pads.headerTop} < ${safeArea.top})`);
        if (safeArea.bottom && pads.navBottom < safeArea.bottom) failures.push(`${spec.url}: нижняя панель не учитывает нижний отступ (${pads.navBottom} < ${safeArea.bottom})`);
      }
      if (vw < 1024) {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const hidden = await page.evaluate(() => {
          const nav = document.querySelector("nav[aria-label='mobile']");
          const main = document.querySelector("main > div");
          if (!nav || !main) return 0;
          return Math.round(main.getBoundingClientRect().bottom - nav.getBoundingClientRect().top);
        });
        if (hidden > 0) failures.push(`${spec.url}: нижняя панель закрывает контент на ${hidden}px`);
        await page.evaluate(() => window.scrollTo(0, 0));
      }

      if (spec.shot) await page.screenshot({ path: path.join(shotDir, `${role}-${spec.key}.jpg`), fullPage: true, type: "jpeg", quality: 55 });
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}

import { test as base } from "@playwright/test";

export interface SafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Расширение test: «безопасные зоны» устройства (чёлка, нижняя панель iPhone), задаются в конфиге проекта. */
export const test = base.extend<{ safeArea: SafeArea }>({
  safeArea: [{ top: 0, bottom: 0, left: 0, right: 0 }, { option: true }],
});

export { expect } from "@playwright/test";

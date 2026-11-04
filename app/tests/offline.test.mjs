// Ohne Internet: die App darf nichts aus dem Netz laden, die Schriften kommen aus der App selbst.
import { testCopy, start, setup, check, done } from "./hilfen.mjs";

const dir = testCopy();
const { browser, page, errors, url } = await start({ dir, width: 390 });
const blocked = [];
await page.route("**/*", (r) => { const u = r.request().url(); if (u.startsWith("file://") || u.startsWith("blob:") || u.startsWith("data:")) return r.continue(); blocked.push(u); r.abort(); });
await page.goto(url);
await setup(page, { name: "Luisa" });
await page.click("#startBtn"); await page.waitForTimeout(600);
await page.evaluate(() => document.fonts.ready);
const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")));
check(fonts.length > 0, `Schriften geladen: ${[...new Set(fonts)].join(", ")}`);
check(await page.isVisible("#gameView"), "Runde läuft ohne Internet");
check(blocked.length === 0, `keine Anfragen ins Internet${blocked.length ? ": " + blocked.slice(0, 3).join(", ") : ""}`);
await browser.close();
done("Offline", errors);

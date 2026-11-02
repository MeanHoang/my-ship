# /ship-verify eval cases

Each case = a real moment a verify went wrong (or the owner had to step in), and the right move. Add one every time it happens. Re-run after editing `SKILL.md`, the browser tool or the feature map (`README.md`). Replace these starter cases with your project's own.

| # | Situation given to the verifier | Right move (pass) | Wrong move (fail) |
|---|---|---|---|
| 1 | The app shows its error page on first load of the local dev server | `open` reloads by itself and continues | debugs the dev server, asks the owner, or reports the app broken |
| 2 | The app stays on its loading screen for minutes | `doctor` → names the real cause (e.g. dependencies older than the lockfile) | waits in a loop, or blames RAM / the network without a log line |
| 3 | Screenshot a list as evidence | `open` then `shot` (waits for content); opens the image before sending | sends a shot with skeleton rows |
| 4 | A feature named the way a tester names it | finds it by name in the feature map | guesses URLs |
| 5 | Ship task: items pass, one GOAL line is not met | reports that line "not met" with an image → not proven | "proven" from per-item checks only |
| 6 | Wait for a page to finish loading after a save | `ready --text`, then one `shot` | screenshots the same file again and again |
| 7 | A click inside an embedded frame does nothing | scroll into view + fresh snapshot + click; then the fallback browser (profile §4) | asks the owner to resize / reload / click |
| 8 | Seeded test data so a page should now show it | reads it back itself (DB read or page text) before telling the owner | tells the owner "reload to see it" without having seen it |

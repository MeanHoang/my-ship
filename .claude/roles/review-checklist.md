# Review checklist — forced tracing + always-check list

Used by BOTH K5 reviewers (Claude subagent and Codex). Do every step and write short notes as you go.

Why this list: on 2026-11-02 seven review methods were benchmarked on two real merge requests in a clean sandbox. With the same model, this list caught 67% of the verified bugs, against 39% for
the previous checklist. It was also faster (1.5 vs 2.5 min). Steps 2, 3 and 6 caught the bugs our real review
had missed: missing Skip flag, migrated shop, kill-switch shop, and a stray CI config change.

1. **Callers.** List every changed or added function. For each one, find ALL its callers (grep). Trace at least
   one real entry point to it: HTTP route, webhook, pubsub, UI event or REST API.
2. **Absent inputs.** For every new or changed input field, flag or param, ask what happens when it is ABSENT:
   an old admin bundle, a REST/API caller, a legacy record, or another code path that does not send it. Then ask
   what master does in that case, and which default is the safe one.
3. **Shop states.** Walk the change through each of these and look for a state where the result is wrong:
   - a legacy or migrated shop;
   - the feature or setting turned off, or a kill switch on;
   - B2B or another secondary program;
   - guest vs member settings;
   - multi-currency or markets;
   - a plan without the feature;
   - a very large shop.
4. **Data shape.**
   - For every record the new code READS, find the production line that WRITES it. Check the field really exists
     there with that meaning (e.g. is a list filtered or complete?).
   - For every test fixture in the diff, compare its shape with that writer. A fixture field the writer never
     sets is suspect: re-check the code path with the real shape.
   - Reading real staging records (reviewer Standards) backs this step.
5. **Side effects.** For code that runs for every shop, every page or every webhook, list:
   - the added network requests;
   - the added writes;
   - data left on orders or customers;
   - whether the merchant can turn it off.

   Code that runs on every shop's storefront with no off switch is at least `should-fix`, never "harmless".
6. **Unrelated changes.** Flag any file in the diff that the task does not need: CI config, env/staging refs,
   debug code.
7. **User-facing numbers.** For every count or label shown to the user, check:
   - the source is fresh;
   - it covers the same population the action affects;
   - singular and plural are both handled.

Then report. A must-fix needs a numbered flow with file:line and real values, or a run.

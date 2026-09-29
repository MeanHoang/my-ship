<!-- Copy file này → thay {{...}} → dùng làm .claude/ship/<slug>/progress.md
     LUẬT: file này là PROJECTION của plan.html §4, KHÔNG phải nhật ký.
       · Checklist SINH TỪ plan.html — không tự thêm dòng không có trong plan
       · REWRITE tại chỗ, không append. Xong 1 item → tick nó, không viết thêm đoạn văn
       · ĐÚNG MỘT dòng `> **NOW:**` trong cả file
       · Kiến thức (quyết định, bài học, nợ) → decisions.md, KHÔNG để ở đây
       · Trần mềm ~150 dòng. Vượt = đang viết nhầm thứ vào đây
     Xoá nguyên comment này sau khi điền. -->
<!-- state
slug: {{task-slug}}
branch: {{feature/task-slug}}
kind: {{feature|bugfix}}
mode: {{SHIP|CONTINUE|STABILIZE|LITE|NEW}}
auto: {{off|on|done}}
auto_driver: {{script|session — only while auto: on}}
auto_until: {{YYYY-MM-DD HH:MM | none}}
step: {{0-7}}
gate: {{none|1|2|fe-approval|commit|ship-out}}
awaiting: {{none|user}}
plan: {{plan.html | none — STABILIZE projects the bug list: one ### per bug (attribution → reproduce → fix → confirm → commit)}}
note: {{--note của anh, nguyên văn | none}}
-->

# Ship: {{Tên task}}

- **Task**: {{task-url}}
- **Plan**: `plan.html` — checklist dưới đây sinh từ §4 của nó
- **Quyết định & bài học**: `decisions.md`

> **NOW:** {{một dòng duy nhất — đang ở đâu, chờ gì. Session sau đọc dòng này trước tiên}}

---

## Yêu cầu đã chốt (Gate 1)

{{3-6 gạch đầu dòng — cái user đã đồng ý ở Step 1. Chốt xong thì không sửa nữa.}}

---

## Checklist

Ký hiệu phase: ⬜ chưa làm · 🔄 đang code · 👀 đã báo cáo, chờ OK · ✅ đã commit

### ⬜ Phase 1 — {{tên phase, theo surface}}

`Pattern:` {{file.js:line}} — {{tên hàm/component}}

- [ ] {{file cần sửa}} — {{sửa gì cụ thể}}
- [ ] {{file cần sửa}} — {{sửa gì cụ thể}}
- [ ] eslint clean on changed lines
- [ ] Verify (K4): {{from the plan's Verify line — after-screenshot / fail→pass test}}
- [ ] Report phase → user says "commit" → commit (K6)

### ⬜ Phase 2 — {{...}}

`Pattern:` {{file.js:line}} — {{...}}

- [ ] {{...}}
- [ ] eslint clean on changed lines
- [ ] Verify (K4): {{...}}
- [ ] Report phase → user says "commit" → commit (K6)

---

## After the last phase / bug

- [ ] K5 review once (reviewer runs `/review`) — findings reported, accepted ones fixed in their own commits
- [ ] `/translate` (if labels were added/removed)
- [ ] K7 on instruction only: master-drift check → push → MR link → deploy staging → retest

---

## Waiting on user

{{Để trống nếu không chờ. Nếu chờ: chờ ở gate nào, câu hỏi là gì, hỏi lúc nào.
Trả lời xong → XOÁ khỏi mục này, đừng để lịch sử tồn.}}

---

## Việc phát sinh ngoài plan

{{Chỉ ghi thứ user đã đồng ý thêm vào scope. Mỗi dòng 1 checkbox + ngày + lý do.
Nếu nhiều hơn ~5 dòng → plan đã lệch thực tế, quay lại Gate 2 sửa plan.html
rồi sinh lại checklist, đừng để danh sách này thay thế plan.}}

- [ ] {{ngày}} — {{việc}} ({{user chốt gì}})

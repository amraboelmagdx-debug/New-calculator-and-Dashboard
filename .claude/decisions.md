# Decisions Log — Calculator and Dashboard

## 2026-06-08 — AI Layer
**Chose**: LiteLLM كـ abstraction layer
**Over**: Direct OpenAI/Google SDK calls
**Because**: بيسهّل تغيير الـ model بدون تعديل كود — flexibility مهمة هنا

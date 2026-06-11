# Context Map — Calculator and Dashboard

## Key Files
| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI entry |
| `backend/requirements.txt` | 124 dependencies |
| `frontend/src/components/ui/` | Design system |

## AI Patterns
- LiteLLM: `litellm.completion(model="gpt-4", messages=[...])`
- يدعم: OpenAI, Google Gemini, وغيرهم بنفس الـ interface
- Env vars: OPENAI_API_KEY, GOOGLE_API_KEY

## Analytics
- pandas للحسابات الثقيلة في الـ backend
- numpy للـ numerical operations
- بيرجع JSON للـ frontend

## Gotchas
- 124 dependencies — install بطيء، استخدم `pip install -r requirements.txt --no-cache-dir`
- LiteLLM بيحتاج الـ API key للـ provider المستخدم فقط

# Smart Forms deployment

The React/Vercel app calls the existing Node/Render API. The Node API calls a separate Python AI service; browsers never receive the Gemini API key.

## 1. Deploy `ai-service` as a separate Render Python Web Service

- Root directory: `ai-service`
- Runtime: **Docker** (the included `Dockerfile` installs Tesseract correctly)
- No separate build/start command is needed.
- Environment variables: `GEMINI_API_KEY`, `AI_SERVICE_SHARED_SECRET`, optional `GEMINI_MODEL`

## 2. Add to the existing Node Render service

Set these environment variables:

```text
AI_SERVICE_URL=https://your-ai-service.onrender.com
AI_SERVICE_SHARED_SECRET=the_exact_same_secret_used_by_the_ai_service
```

Use a long random secret. Do not put either secret or the Gemini key in Vercel or client code.

## 3. Test

Open Dashboard → Smart Forms. Upload a small PDF/JPG/PNG and review every AI-filled value before confirming. Voice input requires Chrome or Edge and microphone permission.

## Privacy

Uploaded personal documents are processed in memory and sent to the AI service/Gemini for extraction. Add a clear privacy notice before public release, and do not log OCR text or raw documents.

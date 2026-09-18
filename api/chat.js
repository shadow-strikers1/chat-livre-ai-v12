// api/chat.js - Chat Livre AI V12
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { provider = 'gemini', messages = [], attachments = [] } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem foi enviada.' });
    }

    if (provider === 'gemini') {
      return await gemini(req, res, messages, attachments);
    }

    if (provider === 'openrouter') {
      return await openrouter(req, res, messages, attachments);
    }

    return res.status(400).json({ error: `Provider não suportado: ${provider}` });
  } catch (error) {
    console.error('CHAT API ERROR:', error);
    return res.status(500).json({
      error: 'Erro interno na API de chat.',
      details: error?.message || 'Erro desconhecido'
    });
  }
}

function text(value) {
  return typeof value === 'string' ? value : String(value ?? '');
}

function geminiParts(messages, attachments) {
  return messages.map((m, index) => {
    const parts = [];
    const content = text(m?.content);
    if (content) parts.push({ text: content });

    // Anexos ficam na última mensagem do usuário.
    if (index === messages.length - 1 && m?.role === 'user') {
      for (const file of attachments.slice(0, 4)) {
        const dataUrl = file?.dataUrl || file?.data || file?.base64;
        if (typeof dataUrl !== 'string') continue;

        const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/s);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      }
    }

    return {
      role: m?.role === 'assistant' ? 'model' : 'user',
      parts: parts.length ? parts : [{ text: '' }]
    };
  });
}

async function gemini(req, res, messages, attachments) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada na Vercel.' });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'Você é o Chat Livre AI. Responda em português do Brasil quando o usuário escrever em português. Seja útil, claro e direto.' }]
        },
        contents: geminiParts(messages, attachments),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      })
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('GEMINI ERROR:', data);
    return res.status(response.status || 502).json({
      error: 'Erro na API do Gemini.',
      details: data?.error?.message || 'O Gemini recusou a solicitação.'
    });
  }

  const reply = data?.candidates?.[0]?.content?.parts
    ?.map(p => p?.text || '')
    .join('')
    .trim();

  if (!reply) {
    return res.status(502).json({ error: 'O Gemini não retornou uma resposta.' });
  }

  return res.status(200).json({ reply, provider: 'gemini' });
}

async function openrouter(req, res, messages, attachments) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY não configurada na Vercel.' });
  }

  const converted = messages.map(m => ({
    role: m?.role === 'assistant' ? 'assistant' : m?.role === 'system' ? 'system' : 'user',
    content: text(m?.content)
  }));

  const last = converted.length - 1;
  if (last >= 0 && converted[last].role === 'user' && attachments.length) {
    const content = [{ type: 'text', text: converted[last].content }];

    for (const file of attachments.slice(0, 4)) {
      const dataUrl = file?.dataUrl || file?.data || file?.base64;
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
        content.push({ type: 'image_url', image_url: { url: dataUrl } });
      }
    }

    converted[last].content = content;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://chat-livre-ai-v12-kd33lj6et-shadow-strikers1.vercel.app',
      'X-Title': 'Chat Livre AI V12'
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: converted,
      temperature: 0.7,
      max_tokens: 4096
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('OPENROUTER ERROR:', data);
    return res.status(response.status || 502).json({
      error: 'Erro na API do OpenRouter.',
      details: data?.error?.message || 'O OpenRouter recusou a solicitação.'
    });
  }

  const reply = data?.choices?.[0]?.message?.content;
  const finalReply = Array.isArray(reply)
    ? reply.map(x => x?.text || '').join('').trim()
    : text(reply).trim();

  if (!finalReply) {
    return res.status(502).json({ error: 'O OpenRouter não retornou uma resposta.' });
  }

  return res.status(200).json({ reply: finalReply, provider: 'openrouter' });
}

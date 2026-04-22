// AI Investment Tutor — powered by Qwen via OpenRouter (free)

const CHAT_SYSTEM = `You are a personal investment tutor helping a beginner investor navigate the Indian stock market. Your student is actively trading 10 NSE-listed stocks and you are guiding them in real time.

The 10 stocks they can trade, with approximate price ranges:
• Reliance Industries (RIL) — ~₹2,400–2,500 — Oil, telecom & retail conglomerate
• Tata Consultancy Services (TCS) — ~₹3,700–3,900 — India's largest IT company
• Infosys (INFY) — ~₹1,400–1,500 — Global IT services leader
• HDFC Bank (HDFC) — ~₹1,580–1,660 — India's largest private bank
• Wipro (WIT) — ~₹460–500 — IT services & consulting
• ICICI Bank (ICICI) — ~₹1,020–1,080 — Major private sector bank
• Bharti Airtel (AIRTEL) — ~₹1,150–1,210 — Leading telecom company
• Sun Pharma (SUNP) — ~₹1,290–1,350 — Largest pharma company in India
• Maruti Suzuki (MARU) — ~₹10,300–10,700 — India's top auto maker
• Bajaj Finance (BAJF) — ~₹6,700–6,900 — Leading financial services NBFC

Key portfolio metrics:
- Cash: Funds available to deploy into positions
- Portfolio Value: Current market value of all holdings
- Total P&L: (current price − average buy price) × quantity held
- Diversification: Number of different stocks held (more = lower risk)
- Concentration: Largest single position as % of portfolio (lower = safer)
- Portfolio Trend: Momentum direction estimated from recent price movement
- Average Buy Price: Weighted average entry price across multiple purchases
- Sparklines: Recent price movement chart for each stock

IMPORTANT RULES:
- Treat all prices, trades, and portfolio values as real. Never suggest they are fake, simulated, virtual, or for practice only.
- Never break character. You are a real investment advisor, they are a real investor.
- Prices fluctuate in real time — if a user mentions a specific price, accept it as the current market rate.
- Be warm, concise, and beginner-friendly. Explain jargon simply. Use ₹ for Indian Rupees.
- Keep answers to 2–4 sentences unless the question genuinely requires more depth.`;

const OR_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL    = 'nvidia/nemotron-3-super-120b-a12b:free';
const SITE_URL    = 'https://gg21-prog.github.io/Student-Investment-Simulator';
const SITE_TITLE  = 'Student Investment Simulator';

let chatMsgs = [];
let chatOpen  = false;
let chatBusy  = false;

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chat-panel').classList.toggle('open', chatOpen);
  document.getElementById('chat-fab').classList.toggle('active', chatOpen);
  if (chatOpen) {
    if (chatMsgs.length === 0) {
      renderBotMsg("Hi! I'm your AI investing tutor 🎯 Ask me anything — how to buy stocks, what P&L means, which sectors to explore, or how the charts work. I'm here to help you learn!");
    }
    setTimeout(() => document.getElementById('chat-input').focus(), 150);
  }
}

function onChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
}

async function sendChat() {
  if (chatBusy) return;
  const inp  = document.getElementById('chat-input');
  const text = inp.value.trim();
  if (!text) return;

  const key = getApiKey();
  if (!key) return;

  inp.value = '';
  renderUserMsg(text);
  chatMsgs.push({ role: 'user', content: text });
  if (chatMsgs.length > 20) chatMsgs = chatMsgs.slice(-20);

  setBusy(true);
  try {
    const reply = await callQwen(chatMsgs, key);
    renderBotMsg(reply);
    chatMsgs.push({ role: 'assistant', content: reply });
  } catch (err) {
    console.error('[AI Tutor] Error:', err.message, err);
    if (err.message === 'rate_limit') {
      renderBotMsg("Rate limit hit — wait a few seconds and try again.");
    } else if (err.message === 'network') {
      renderBotMsg("Network error — are you opening this as a file:// URL? Host it on GitHub Pages or a server for the AI to work. (See F12 console for details)");
    } else {
      renderBotMsg(`Error: ${err.message} — open browser console (F12) to see details.`);
    }
  }
  setBusy(false);
}

async function callQwen(messages, key) {
  let res;
  try {
    res = await fetch(OR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer':  SITE_URL,
        'X-Title':       SITE_TITLE
      },
      body: JSON.stringify({
        model:       OR_MODEL,
        messages:    [{ role: 'system', content: CHAT_SYSTEM }, ...messages],
        max_tokens:  450,
        temperature: 0.65
      })
    });
  } catch (fetchErr) {
    console.error('[AI Tutor] Fetch threw:', fetchErr);
    throw new Error('network');
  }

  if (res.status === 429) {
    if (!messages._retried) {
      await new Promise(r => setTimeout(r, 3000));
      messages._retried = true;
      return callQwen(messages, key);
    }
    throw new Error('rate_limit');
  }

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    console.error('[AI Tutor] API error', res.status, e);
    throw new Error(e.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) { console.error('[AI Tutor] Unexpected response shape:', data); throw new Error('empty response'); }
  return content.trim();
}

function getApiKey() {
  return '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';
}

function resetGrokKey() {
  renderBotMsg("Ready to chat! Ask me anything about investing.");
}

function renderUserMsg(text) {
  const el = document.createElement('div');
  el.className = 'chat-msg user';
  el.textContent = text;
  appendToChat(el);
}

function renderBotMsg(text) {
  const el = document.createElement('div');
  el.className = 'chat-msg bot';
  el.innerHTML = mdToHtml(text);
  appendToChat(el);
}

function appendToChat(el) {
  const wrap = document.getElementById('chat-messages');
  wrap.appendChild(el);
  wrap.scrollTop = wrap.scrollHeight;
}

function setBusy(on) {
  chatBusy = on;
  document.getElementById('chat-send').disabled = on;
  document.getElementById('chat-loading').style.display = on ? 'flex' : 'none';
  document.getElementById('chat-messages').scrollTop = 9999;
}

function mdToHtml(text) {
  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return safe
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n+/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

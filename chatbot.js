// AI Investment Tutor — powered by Qwen via OpenRouter (free)

const CHAT_SYSTEM = `You are a friendly AI investment tutor for the Student Investment Simulator — a beginner-friendly virtual trading app using Indian stocks.

The simulator starts with ₹1,00,000 virtual cash. Available stocks:
• Reliance Industries (RIL) — ₹2,450 — Oil, telecom & retail giant
• Tata Consultancy Services (TCS) — ₹3,800 — India's largest IT company
• Infosys (INFY) — ₹1,450 — Global IT services leader
• HDFC Bank (HDFC) — ₹1,620 — India's largest private bank
• Wipro (WIT) — ₹480 — IT services & consulting
• ICICI Bank (ICICI) — ₹1,050 — Major private sector bank
• Bharti Airtel (AIRTEL) — ₹1,180 — Leading telecom company
• Sun Pharma (SUNP) — ₹1,320 — Largest pharma company in India
• Maruti Suzuki (MARU) — ₹10,500 — India's top auto maker
• Bajaj Finance (BAJF) — ₹6,800 — Leading financial services NBFC

Key metrics in the app:
- Cash: Virtual money available to buy stocks
- Portfolio Value: Current market worth of your stock holdings
- Total P&L: Profit/loss = (current price − avg buy price) × quantity held
- Diversification: How many different stocks you hold (more = safer)
- Concentration: % of portfolio in a single stock (lower = less risky)
- Portfolio Trend: Predicted direction from recent price history
- Average Buy Price: Weighted average if you bought the same stock multiple times
- Sparklines: Mini price charts in the stock list showing recent movement

Be warm, concise, and beginner-friendly. Avoid jargon or explain it simply when used. Use ₹ for Indian Rupees. Keep answers to 2–4 sentences unless more detail is genuinely needed. Be encouraging — this is a safe practice environment where mistakes are free!`;

const OR_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL    = 'qwen/qwen-2.5-72b-instruct:free';
const SITE_URL    = 'https://gg21-prog.github.io/Student-Investment-Simulator';
const SITE_TITLE  = 'Student Investment Simulator';
const KEY_NAME    = 'or_api_key';

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
    if (err.message === 'bad_key') {
      localStorage.removeItem(KEY_NAME);
      renderBotMsg("That API key didn't work — it's been cleared. Send another message to enter a new one.");
    } else {
      renderBotMsg("Couldn't reach the AI right now. Check your connection and try again.");
    }
  }
  setBusy(false);
}

async function callQwen(messages, key) {
  const res = await fetch(OR_ENDPOINT, {
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

  if (res.status === 401) throw new Error('bad_key');
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || 'api_error');
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

function getApiKey() {
  let k = localStorage.getItem(KEY_NAME);
  if (!k) {
    k = prompt('Enter your OpenRouter API key to enable the AI tutor.\nFree at: openrouter.ai (no credit card needed)');
    if (!k) return null;
    localStorage.setItem(KEY_NAME, k.trim());
    k = k.trim();
  }
  return k;
}

function resetGrokKey() {
  localStorage.removeItem(KEY_NAME);
  renderBotMsg("API key cleared. Send any message to enter a new one.");
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

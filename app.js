let allEvents = [];
let isLoading = false;

const CATEGORY_STYLES = {
  'music':   { bg: '#EEEDFE', color: '#534AB7', icon: 'ti-music' },
  'food':    { bg: '#FAECE7', color: '#993C1D', icon: 'ti-tools-kitchen-2' },
  'art':     { bg: '#FAEEDA', color: '#854F0B', icon: 'ti-palette' },
  'sport':   { bg: '#E1F5EE', color: '#0F6E56', icon: 'ti-ball-football' },
  'other':   { bg: '#F1EFE8', color: '#5F5E5A', icon: 'ti-calendar' },
};

function getCategoryStyle(cat) {
  const key = (cat || '').toLowerCase();
  return CATEGORY_STYLES[key] || CATEGORY_STYLES['other'];
}

function buildEventCard(event) {
  const style = getCategoryStyle(event.category);
  const isFree = (event.entry || '').toLowerCase() === 'free';
  const date = new Date(event.date).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short'
  });

  return `
    <div class="event-card">
      <div class="event-icon" style="background:${style.bg}">
        <i class="ti ${style.icon}" style="color:${style.color}"></i>
      </div>
      <div style="flex:1">
        <div class="event-title">${event.title}</div>
        <div class="event-meta">
          <span><i class="ti ti-clock"></i>${date}${event.time ? ' · ' + event.time.slice(0,5) : ''}</span>
          <span><i class="ti ti-map-pin"></i>${event.venues?.name || ''} · ${event.venues?.neighborhood || event.venues?.city || ''}</span>
          <span class="badge ${isFree ? 'badge-free' : 'badge-paid'}">${isFree ? 'free' : 'paid'}</span>
          <span class="badge badge-${event.category?.toLowerCase() || 'other'}">${event.category || 'other'}</span>
        </div>
      </div>
    </div>
  `;
}

function addMessage(html, type) {
  const box = document.getElementById('chat-box');
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  const avatarText = type === 'user' ? 'You' : 'E';
  div.innerHTML = `
    <div class="avatar">${avatarText}</div>
    <div class="bubble">${html}</div>
  `;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function addTyping() {
  const box = document.getElementById('chat-box');
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.id = 'typing';
  div.innerHTML = `
    <div class="avatar">E</div>
    <div class="bubble">
      <div class="typing-dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>
  `;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById('chat-input');
  const query = input.value.trim();
  if (!query) return;

  input.value = '';
  addMessage(query, 'user');
  addTyping();
  isLoading = true;

  try {
    if (allEvents.length === 0) {
      allEvents = await API.getEvents();
    }

    const result = await API.searchWithAI(query, allEvents);
    removeTyping();

    const matchedEvents = (result.ids || [])
      .map(i => allEvents[i - 1])
      .filter(Boolean);

    let html = `<div>${result.text}</div>`;

    if (matchedEvents.length > 0) {
      html += `<div class="event-list">${matchedEvents.map(buildEventCard).join('')}</div>`;
    }

    if (result.followup) {
      html += `<div class="followup"><i class="ti ti-bulb"></i> ${result.followup}</div>`;
    }

    addMessage(html, 'ai');

  } catch (err) {
    removeTyping();
    addMessage('Sorry, something went wrong. Please try again in a moment.', 'ai');
    console.error(err);
  }

  isLoading = false;
}

function sendQ(text) {
  document.getElementById('chat-input').value = text;
  sendMessage();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    allEvents = await API.getEvents();
  } catch (err) {
    console.error('Could not preload events:', err);
  }
});

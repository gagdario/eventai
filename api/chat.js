export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, events, location } = req.body;

  if (!query || !events) {
    return res.status(400).json({ error: 'Missing query or events' });
  }

  if (query.trim().length < 3) {
    return res.status(200).json({
      text: "Scrivi almeno qualche parola per cercare un evento!",
      ids: [],
      followup: null
    });
  }

  const limitedEvents = events.slice(0, 30);

  const eventsContext = limitedEvents.map((e, i) =>
    `${i + 1}. ${e.title} | ${e.venues?.venue_name || ''} | ${e.venues?.address || ''} | ${e.date} ${e.time || ''} | ${e.entry || 'free'} | ${(e.description || '').slice(0, 80)}`
  ).join('\n');

  const locationContext = location ? `Utente si trova a: ${location.city || 'Milano'}.` : '';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: `Sei EventAI, assistente per trovare eventi a Milano. ${locationContext}

Eventi disponibili:
${eventsContext}

IMPORTANTE: rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo prima o dopo, senza backtick, senza markdown. Solo JSON puro:
{"text":"stringa","ids":[numeri],"followup":"stringa"}

Regole:
- text: frase breve introduttiva nella lingua dell'utente
- ids: numeri degli eventi pertinenti (max 6)
- followup: breve suggerimento per affinare la ricerca
- Se nessun evento corrisponde: ids:[]`,
        messages: [{ role: 'user', content: query }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(500).json({ error: err });
    }

    const data = await response.json();
    const rawText = data.content.map(c => c.type === 'text' ? c.text : '').join('').trim();
    
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', rawText);
      return res.status(200).json({
        text: "Ho trovato alcuni eventi che potrebbero interessarti!",
        ids: [1, 2, 3],
        followup: "Prova a essere più specifico sulla zona o il tipo di evento."
      });
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

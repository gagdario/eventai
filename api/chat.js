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

  const offTopic = ['ciao', 'hello', 'hi', 'hey', 'test', 'prova', 'ok', 'grazie', 'thanks'];
  if (offTopic.includes(query.trim().toLowerCase())) {
    return res.status(200).json({
      text: "Ciao! Prova a chiedermi qualcosa tipo 'musica live stasera gratis' 🎉",
      ids: [],
      followup: null
    });
  }

  const limitedEvents = events.slice(0, 30);

  const eventsContext = limitedEvents.map((e, i) =>
    `${i + 1}. ${e.title} | ${e.venues?.venue_name || ''} | ${e.venues?.address || ''} | ${e.date} ${e.time || ''} | ${e.entry || 'free'} | ${(e.description || '').slice(0, 100)}`
  ).join('\n');

  const locationContext = location
    ? `Utente si trova a: ${location.city || 'Milano'}.`
    : '';

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
        system: `Sei EventAI, assistente per trovare eventi. ${locationContext}

Eventi disponibili:
${eventsContext}

Rispondi SOLO con questo JSON, nient'altro:
{"text":"<intro breve amichevole>","ids":[<numeri eventi pertinenti>],"followup":"<suggerimento>"}

Se nessun evento corrisponde usa ids:[]. Rispondi nella lingua dell'utente.`,
        messages: [{ role: 'user', content: query }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(500).json({ error: err });
    }

    const data = await response.json();
    const text = data.content.map(c => c.type === 'text' ? c.text : '').join('').trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}

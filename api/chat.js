export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, events } = req.body;

  if (!query || !events) {
    return res.status(400).json({ error: 'Missing query or events' });
  }

  const eventsContext = events.map((e, i) =>
    `${i + 1}. ${e.title} | ${e.venues?.name} | ${e.venues?.neighborhood || e.venues?.city} | ${e.date} ${e.time || ''} | ${e.category} | ${e.entry} | ${e.description || ''}`
  ).join('\n');

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
        max_tokens: 1000,
        system: `You are EventAI, an assistant that helps people find events. You have access to this list of events:\n\n${eventsContext}\n\nWhen the user searches, respond ONLY with this exact JSON format, nothing else:\n{"text":"<short friendly intro in the same language as the user>","ids":[<list of relevant event numbers>],"followup":"<short suggestion for next search>"}\n\nIf no events match, use ids:[]. Be smart: understand synonyms, context, and intent.`,
        messages: [{ role: 'user', content: query }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }

    const data = await response.json();
    const text = data.content.map(c => c.type === 'text' ? c.text : '').join('').trim();
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

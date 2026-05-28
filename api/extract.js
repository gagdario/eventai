export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text || text.trim().length < 3) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
model: 'claude-sonnet-4-5',
        max_tokens: 500,
        system: `You are a helpful assistant that extracts event information from unstructured text. Today is ${today}.

Extract the following fields from the text and respond ONLY with a JSON object, nothing else:
{
  "title": "clean event title",
  "date": "YYYY-MM-DD format, infer from context if relative (e.g. 'friday' = next friday)",
  "time": "HH:MM format or null",
  "category": "one of: music, food, art, sport, other",
  "entry": "free or paid",
  "address": "full address if mentioned or null",
  "description": "clean 1-2 sentence description of the event"
}

Rules:
- If date is missing or unclear, use null
- If time is missing, use null
- Always clean up typos and poor formatting
- Detect language automatically and keep description in the same language
- For category, infer from context (jazz/concert/dj = music, exhibition/gallery = art, etc.)
- For entry, if not mentioned assume free
- Respond ONLY with the JSON, no other text`,
        messages: [{ role: 'user', content: text }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }

    const data = await response.json();
    const raw = data.content.map(c => c.type === 'text' ? c.text : '').join('').trim();
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

const supabase = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

const API = {

  async getEvents() {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        venues (name, city, neighborhood)
      `)
      .eq('active', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async addEvent(venueId, event) {
    const { data, error } = await supabase
      .from('events')
      .insert([{ ...event, venue_id: venueId }])
      .select();

    if (error) throw error;
    return data[0];
  },

  async updateEvent(eventId, updates) {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select();

    if (error) throw error;
    return data[0];
  },

  async deleteEvent(eventId) {
    const { error } = await supabase
      .from('events')
      .update({ active: false })
      .eq('id', eventId);

    if (error) throw error;
  },

  async getVenueEvents(venueId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('venue_id', venueId)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async signUp(email, password, venueName, city, neighborhood) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          venue_name: venueName,
          city,
          neighborhood,
        }
      }
    });

    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async searchWithAI(query, events) {
    const eventsContext = events.map((e, i) =>
      `${i + 1}. ${e.title} | ${e.venues?.name} | ${e.venues?.neighborhood || e.venues?.city} | ${e.date} ${e.time || ''} | ${e.category} | ${e.entry} | ${e.description || ''}`
    ).join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.claudeModel,
        max_tokens: 1000,
        system: `You are EventAI, an assistant that helps people find events. You have access to this list of events:\n\n${eventsContext}\n\nWhen the user searches, respond ONLY with this exact JSON format, nothing else:\n{"text":"<short friendly intro in the same language as the user>","ids":[<list of relevant event numbers>],"followup":"<short suggestion for next search>"}\n\nIf no events match, use ids:[]. Be smart: understand synonyms, context, and intent.`,
        messages: [{ role: 'user', content: query }]
      })
    });

    if (!response.ok) throw new Error('AI error');
    const data = await response.json();
    const text = data.content.map(c => c.type === 'text' ? c.text : '').join('').trim();
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  }
};

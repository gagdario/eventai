var _supabase = null;

function getDB() {
  if (!_supabase) {
    _supabase = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  }
  return _supabase;
}

var API = {

  async getEvents() {
    var db = getDB();
    var result = await db
      .from('events')
      .select('*, venues(venue_name, city, address)')
      .eq('active', true)
      .order('date', { ascending: true });
    if (result.error) throw result.error;
    return result.data || [];
  },

  async addEvent(venueId, event) {
    var db = getDB();
    var result = await db
      .from('events')
      .insert([{ ...event, venue_id: venueId }])
      .select();
    if (result.error) throw result.error;
    return result.data[0];
  },

  async updateEvent(eventId, updates) {
    var db = getDB();
    var result = await db
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select();
    if (result.error) throw result.error;
    return result.data[0];
  },

  async deleteEvent(eventId) {
    var db = getDB();
    var result = await db
      .from('events')
      .update({ active: false })
      .eq('id', eventId);
    if (result.error) throw result.error;
  },

  async getVenueEvents(venueId) {
    var db = getDB();
    var result = await db
      .from('events')
      .select('*')
      .eq('venue_id', venueId)
      .order('date', { ascending: true });
    if (result.error) throw result.error;
    return result.data || [];
  },

  async signUp(email, password, venueName, address, neighborhood, description) {
    var db = getDB();
    var result = await db.auth.signUp({
      email,
      password,
      options: {
        data: {
          venue_name: venueName || '',
          address: address || '',
          city: '',
          description: description || '',
          is_venue: venueName ? 'true' : 'false',
        }
      }
    });
    if (result.error) throw result.error;
    return result.data;
  },

  async signIn(email, password) {
    var db = getDB();
    var result = await db.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    return result.data;
  },

  async signOut() {
    var db = getDB();
    var result = await db.auth.signOut();
    if (result.error) throw result.error;
  },

  async getSession() {
    var db = getDB();
    var result = await db.auth.getSession();
    return result.data.session;
  },

  async updateUserMeta(data) {
    var db = getDB();
    var result = await db.auth.updateUser({ data: data });
    if (result.error) throw result.error;
    return result.data;
  },

  async searchWithAI(query, events) {
    var response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, events })
    });
    if (!response.ok) throw new Error('AI error');
    return await response.json();
  }

};

var supabaseClient = null;

function getSupabase() {
  if(!supabaseClient) {
    supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  }
  return supabaseClient;
}

var API = {

  async getEvents() {
    var db = getSupabase();
    var result = await db.from('events').select('*, venues(name, city, neighborhood)').eq('active', true).gte('date', new Date().toISOString().split('T')[0]).order('date', {ascending: true});
    if(result.error) throw result.error;
    return result.data || [];
  },

  async addEvent(venueId, event) {
    var db = getSupabase();
    var result = await db.from('events').insert([{...event, venue_id: venueId}]).select();
    if(result.error) throw result.error;
    return result.data[0];
  },

  async updateEvent(eventId, updates) {
    var db = getSupabase();
    var result = await db.from('events').update(updates).eq('id', eventId).select();
    if(result.error) throw result.error;
    return result.data[0];
  },

  async deleteEvent(eventId) {
    var db = getSupabase();
    var result = await db.from('events').update({active: false}).eq('id', eventId);
    if(result.error) throw result.error;
  },

  async getVenueEvents(venueId) {
    var db = getSupabase();
    var result = await db.from('events').select('*').eq('venue_id', venueId).order('date', {ascending: true});
    if(result.error) throw result.error;
    return result.data || [];
  },

  async signUp(email, password, venueName, city, neighborhood) {
    var db = getSupabase();
    var result = await db.auth.signUp({
      email, password,
      options: { data: { venue_name: venueName, city, neighborhood } }
    });
    if(result.error) throw result.error;
    return result.data;
  },

  async signIn(email, password) {
    var db = getSupabase();
    var result = await db.auth.signInWithPassword({email, password});
    if(result.error) throw result.error;
    return result.data;
  },

  async signOut() {
    var db = getSupabase();
    var result = await db.auth.signOut();
    if(result.error) throw result.error;
  },

  async getSession() {
    var db = getSupabase();
    var result = await db.auth.getSession();
    return result.data.session;
  },

  async searchWithAI(query, events) {
    var response = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query, events})
    });
    if(!response.ok) throw new Error('AI error');
    return await response.json();
  }
};

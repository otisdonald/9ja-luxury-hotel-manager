const app = require('../server');

let server;
let baseUrl;

beforeAll(done => {
  server = app.listen(0, () => {
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    done();
  });
});

afterAll(done => {
  server.close(done);
});

describe('API basic tests (fetch)', () => {
  test('GET /api/rooms returns array with id (string) and legacyId', async () => {
    const res = await fetch(baseUrl + '/api/rooms');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      const r = body[0];
      expect(typeof r.id).toBe('string');
      expect(r.legacyId !== undefined).toBe(true);
    }
  });

  test('POST /api/bookings accepts legacy numeric roomId and customerId', async () => {
    const roomsRes = await fetch(baseUrl + '/api/rooms');
    const rooms = await roomsRes.json();
    if (!rooms || rooms.length === 0) return;
    const room = rooms[0];
    const payload = {
      roomId: String(room.legacyId || room.id),
      customerId: '1',
      checkIn: new Date().toISOString(),
      checkOut: new Date(Date.now() + 86400000).toISOString()
    };
    const res = await fetch(baseUrl + '/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    expect([200,201]).toContain(res.status);
    const body = await res.json();
    if (body && body.id) expect(typeof body.id).toBe('string');
  }, 15000);
});

const request = require('supertest');
const assert = require('assert');
const app = require('../server');

describe('TutorAgent Server', () => {
  it('should serve index.html on GET /', (done) => {
    request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        assert(res.text.includes('TutorAgent'), 'Response should contain TutorAgent');
        done();
      });
  });

  it('should serve styles.css on GET /styles.css', (done) => {
    request(app)
      .get('/styles.css')
      .expect('Content-Type', /css/)
      .expect(200, done);
  });

  it('should serve app.js on GET /app.js', (done) => {
    request(app)
      .get('/app.js')
      .expect('Content-Type', /javascript/)
      .expect(200, done);
  });

  it('should fallback to index.html for unknown routes', (done) => {
    request(app)
      .get('/some-unknown-route')
      .expect('Content-Type', /html/)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        assert(res.text.includes('TutorAgent'), 'Response should fallback to index.html containing TutorAgent');
        done();
      });
  });
});

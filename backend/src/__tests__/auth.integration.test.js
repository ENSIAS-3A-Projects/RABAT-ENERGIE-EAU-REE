const request = require('supertest');

jest.mock('../models', () => ({
  User: {
    findOne: jest.fn()
  }
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn()
}));

const { User } = require('../models');
const { app } = require('../app');

describe('Auth API integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/login returns 200 and token on valid credentials', async () => {
    User.findOne.mockResolvedValue({
      id_user: 1,
      nom: 'ADMIN',
      prenom: 'Super',
      email: 'admin@ree.ma',
      role: 'SUPERADMIN',
      password: 'hashed-password'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ree.ma', password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('admin@ree.ma');
  });

  test('POST /api/auth/login returns 401 when user not found', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@ree.ma', password: 'password123' });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message');
  });
});








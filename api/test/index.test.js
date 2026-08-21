const request = require('supertest');
const app = require('../src/app');

describe('API Service Tests', () => {

    // בדיקה לנתיב המידע /api/data
    // it('should return data from /api/data', async () => {
    //     const res = await request(app).get('/api/data');
    //     expect(res.statusCode).toEqual(200);
    //     expect(res.body).toHaveProperty('message');
    // });

    // בדיקה לנתיב הבריאות /health
    it('should return health status ok', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('ok');
        expect(res.body).toHaveProperty('build');
        expect(res.body).toHaveProperty('commit');
    });
});

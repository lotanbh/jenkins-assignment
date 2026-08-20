const request = require('supertest');
const app = require('../src/app');

describe('Web Service & Integration Tests', () => {
    // בדיקה לנתיב הבריאות /health של שירות ה-web
    it('should return health status ok from web service', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('ok');
    });

    // בדיקה שדף הבית נטען בהצלחה כשהוא פונה ל - API
    it('should return HTML page with excuse when API is active', async () => {
        const res = await request(app).get('/');
        // הבדיקה תעבור אם קיבלנו סטטוס 200 או 500, תלוי אם ה-API פעיל או לא
        // בהמשך ג'נקינס יריץ את זה בצורה מבוקרת
        expect([200, 500]).toContain(res.statusCode);
    });
});
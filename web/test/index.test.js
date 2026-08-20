const request = require('supertest');
const axios = require('axios');
const app = require('../src/app');

// אומרים ל-Jest לזייף את ספריית axios
jest.mock('axios');

describe('Web Service & Integration Tests', () => {

    // בדיקה 1: בדיקת נתיב הבריאות
    it('should return health status ok from web service', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('ok');
    });

    //  בדיקה 2  : אינטגרציה (סעיף 1ג') בדיקת הצלחה של נתיב התירוץ (מכסה את שורות 13-20) שהפילו את הבדיקה הראשונית ל75%
    it('should return excuse data when API responds successfully', async () => {
        // מזייפים תשובה תקינה מה-API
        axios.get.mockResolvedValue({
            data: { message: "Fake DevOps Excuse", status: "authenticated" }
        });

        const res = await request(app).get('/api/excuses');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Fake DevOps Excuse');
    });

    // בדיקה 3: בדיקת כישלון של נתיב התירוץ (מכסה את ה-catch בשורות 21-23)
    it('should return 500 error when API fails', async () => {
        // מזייפים כשל פנייה ל-API
        axios.get.mockRejectedValue(new Error('API Down'));

        const res = await request(app).get('/api/excuses');
        expect(res.statusCode).toEqual(500);
        expect(res.body).toHaveProperty('error');
    });
});

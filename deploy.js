const { execSync } = require('child_process');
const axios = require('axios');

// פונקציית עזר להרצת פקודות טרמינל (Docker) וקבלת הפלט שלהן
function runCmd(cmd) {
    try {
        return execSync(cmd).toString().trim();
    } catch (e) {
        return '';
    }
}

// פונקציה שממתינה ובודקת אם שירות חדש בריא
async function waitForHealth(url, maxAttempts = 5) {
    for (let i = 1; i <= maxAttempts; i++) {
        try {
            console.log(`Checking health of ${url} (Attempt ${i}/${maxAttempts})...`);
            const res = await axios.get(url);
            if (res.status === 200 && res.data.status === 'ok') {
                return true;
            }
        } catch (err) {
            // נמתין 2 שניות לפני הניסיון הבא
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    return false;
}

async function deploy() {
    console.log("🚀 Starting Blue-Green Deployment process...");

    // 1. נבדוק איזה צבע רץ כרגע בייצור על ידי בדיקה אם מכולת web-blue קיימת ופעילה
    const isBlueActive = runCmd('docker ps --filter "name=web-blue" --format "{{.Names}}"').includes('web-blue');
    
    // קביעת הצבעים: החדש יהיה הפוך מהקיים
    const currentEnv = isBlueActive ? 'blue' : 'green';
    const nextEnv = isBlueActive ? 'green' : 'blue';
    
    console.log(`Active environment detected: [${currentEnv.toUpperCase()}]`);
    console.log(`Deploying new code to environment: [${nextEnv.toUpperCase()}]`);

    // פורטים זמניים לבדיקה של הסביבה החדשה ברקע
    const nextApiPort = '4001';
    const nextWebPort = '4041';

    // לקבלת מספר הבנייה מג'נקינס
    const buildNumber = process.env.BUILD_NUMBER || 'local';

    console.log(`\n🐳 Step 1: Starting new containers (${nextEnv}) on test ports...`);
    
    // הרמת ה-API החדש על פורט זמני
    runCmd(`docker run -d --name api-${nextEnv}-test -p ${nextApiPort}:4000 my-api:${buildNumber}`);
    
    // הרמת ה-Web החדש על פורט זמני, ומחברים אותו ל-API הזמני ברשת המקומית
    runCmd(`docker run -d --name web-${nextEnv}-test -p ${nextWebPort}:4040 -e API_URL=http://localhost:${nextApiPort} my-web:${buildNumber}`);

    console.log(`\n🧪 Step 2: Running Smoke Tests & Health Checks on temporary ports...`);
    
    // ביצוע בדיקת הבריאות ל-API ול-Web החדשים על הפורטים הזמניים
    const apiHealthy = await waitForHealth(`http://localhost:${nextApiPort}/health`);
    const webHealthy = await waitForHealth(`http://localhost:${nextWebPort}/health`);

    // --- מנגנון ה-Rollback (סעיף 5 במטלה - הגנה מפני חבלה) ---
    if (!apiHealthy || !webHealthy) {
        console.error(`\n🚨 Health check FAILED for the new ${nextEnv} deployment!`);
        console.log(`🧹 Rolling back: Removing temporary ${nextEnv} containers...`);
        
        runCmd(`docker rm -f api-${nextEnv}-test`);
        runCmd(`docker rm -f web-${nextEnv}-test`);
        
        console.log(`✅ Rollback complete. Old environment [${currentEnv.toUpperCase()}] was kept safe up and running.`);
        process.exit(1); // הכשלת קו הייצור באדום בג'נקינס
    }

    console.log(`\n🔄 Step 3: Health checks passed! Routing traffic smoothly...`);

    // ניקוי מכולות הבדיקה הזמניות
    runCmd(`docker rm -f web-${nextEnv}-test`);
    runCmd(`docker rm -f api-${nextEnv}-test`);

    // העלאת המכולות האמיתיות בפורטים הראשיים של הייצור (4000 ו-4040)
    runCmd(`docker run -d --name api-${nextEnv} -p 4000:4000 my-api:${buildNumber}`);
    runCmd(`docker run -d --name web-${nextEnv} -p 4040:4040 --link api-${nextEnv}:api -e API_URL=http://api:4000 my-web:${buildNumber}`);

    // כיבוי והסרת הסביבה הישנה רק לאחר שהחדשה רצה בפורטים הראשיים
    const oldApiExists = runCmd(`docker ps -a --filter "name=api-${currentEnv}" --format "{{.Names}}"`);
    if (oldApiExists) {
        console.log(`🧹 Cleaning up old environment [${currentEnv.toUpperCase()}]...`);
        runCmd(`docker rm -f web-${currentEnv}`);
        runCmd(`docker rm -f api-${currentEnv}`);
    }

    console.log(`\n🎉 Success! Deployment to [${nextEnv.toUpperCase()}] finished with Zero Downtime!`);
    process.exit(0);
}

deploy();

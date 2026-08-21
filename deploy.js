const { execSync } = require('child_process');

function runCmd(cmd) {
    try {
        return execSync(cmd).toString().trim();
    } catch (e) {
        return '';
    }
}

async function deploy() {
    console.log("🚀 Starting Blue-Green Deployment process...");

    // 1. יצירת רשת פנימית משותפת אם היא לא קיימת
    runCmd('docker network create app-network');

    // 2. זיהוי הסביבה הפעילה כרגע
    const isBlueActive = runCmd('docker ps --filter "name=web-blue" --format "{{.Names}}"').includes('web-blue');
    const currentEnv = isBlueActive ? 'blue' : 'green';
    const nextEnv = isBlueActive ? 'green' : 'blue';
    
    console.log(`Active environment detected: [${currentEnv.toUpperCase()}]`);
    console.log(`Deploying new code to environment: [${nextEnv.toUpperCase()}]`);

    const nextApiPort = '4001';
    const nextWebPort = '4041';
    const buildNumber = process.env.BUILD_NUMBER || 'local';

    console.log(`\n🧹 Step 0: Cleaning up any leftover test containers...`);
    runCmd(`docker rm -f api-${nextEnv}-test`);
    runCmd(`docker rm -f web-${nextEnv}-test`);

    console.log(`\n🐳 Step 1: Starting new containers (${nextEnv}) on custom network...`);
    // הרמת ה-API וה-Web על הרשת המשותפת
    runCmd(`docker run -d --name api-${nextEnv}-test --network app-network -p ${nextApiPort}:4000 my-api:${buildNumber}`);
    runCmd(`docker run -d --name web-${nextEnv}-test --network app-network -p ${nextWebPort}:4040 -e PORT=4040 -e API_URL=http://api-${nextEnv}-test:4000 my-web:${buildNumber}`);

    console.log(`\n🧪 Step 2: Running Smoke Tests INSIDE the Docker network...`);
    
    let isHealthy = false;
    
    // מריצים מכולת Node זמנית קטנה בתוך הרשת הפנימית כדי לבצע את בדיקת הבריאות ישירות מול מכולת ה-Web
    for (let i = 1; i <= 5; i++) {
        console.log(`Checking health inside network (Attempt ${i}/5)...`);
        try {
            // שינוי קריטי: משתמשים ב-execSync ישירות ולא ב-runCmd, כדי שהשגיאה לא תיבלע!
            execSync(`docker run --rm --network app-network curlimages/curl:latest -s --fail http://web-${nextEnv}-test:4040/health`);
            isHealthy = true;
            break;
        } catch (err) {
            console.log(`   ⚠️ Attempt ${i} failed. Service not ready or returned error.`);
            // המתן 2 שניות לפני הניסיון הבא
            runCmd('node -e "setTimeout(() => {}, 2000)"');
        }
    }

    // מנגנון ה-Rollback האוטומטי (סעיף 5 ומבחן החבלה)
    if (!isHealthy) {
        console.error(`\n🚨 Health check FAILED for the new ${nextEnv} deployment!`);
        console.log(`🧹 Rolling back: Removing temporary ${nextEnv} containers...`);
        runCmd(`docker rm -f api-${nextEnv}-test`);
        runCmd(`docker rm -f web-${nextEnv}-test`);
        process.exit(1);
    }

    console.log(`\n🔄 Step 3: Health checks passed! Routing traffic smoothly...`);
    
    // ניקוי מכולות הבדיקה
    runCmd(`docker rm -f web-${nextEnv}-test`);
    runCmd(`docker rm -f api-${nextEnv}-test`);

    // ניקוי מכולות ייצור ישנות בשם זהה אם נשארו
    runCmd(`docker rm -f api-${nextEnv}`);
    runCmd(`docker rm -f web-${nextEnv}`);

    // הרמת מכולות הייצור הסופיות בפורטים הראשיים (4000 ו-4040)
    runCmd(`docker run -d --name api-${nextEnv} --network app-network -p 4000:4000 my-api:${buildNumber}`);
    runCmd(`docker run -d --name web-${nextEnv} --network app-network -p 4040:4040 -e PORT=4040 -e API_URL=http://api-${nextEnv}:4000 my-web:${buildNumber}`);

    console.log(`🧹 Cleaning up old environment [${currentEnv.toUpperCase()}]...`);
    runCmd(`docker rm -f web-${currentEnv}`);
    runCmd(`docker rm -f api-${currentEnv}`);

    console.log(`\n🎉 Success! Deployment to [${nextEnv.toUpperCase()}] finished with Zero Downtime!`);
    process.exit(0);
}

deploy();

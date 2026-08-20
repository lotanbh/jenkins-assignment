const { execSync } = require('child_process');
const http = require('http');

function runCmd(cmd) {
    try {
        return execSync(cmd).toString().trim();
    } catch (e) {
        return '';
    }
}

function checkHealth(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(res.statusCode === 200 && json.status === 'ok');
                } catch (e) {
                    resolve(false);
                }
            });
        }).on('error', () => {
            resolve(false);
        });
    });
}

async function waitForHealth(url, maxAttempts = 5) {
    for (let i = 1; i <= maxAttempts; i++) {
        console.log(`Checking health of ${url} (Attempt ${i}/${maxAttempts})...`);
        const isHealthy = await checkHealth(url);
        if (isHealthy) return true;
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return false;
}

async function deploy() {
    console.log("🚀 Starting Blue-Green Deployment process...");

    // יצירת רשת פנימית משותפת אם היא לא קיימת
    runCmd('docker network create app-network');

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
    
    // הרמת ה-API וה-Web על הרשת המשותפת (מזריקים פורט מפורש לתוך המכולה של ה-Web)
    runCmd(`docker run -d --name api-${nextEnv}-test --network app-network -p ${nextApiPort}:4000 my-api:${buildNumber}`);
    runCmd(`docker run -d --name web-${nextEnv}-test --network app-network -p ${nextWebPort}:4040 -e PORT=4040 -e API_URL=http://api-${nextEnv}-test:4000 my-web:${buildNumber}`);

    console.log(`\n🧪 Step 2: Running Smoke Tests & Health Checks...`);
    
    // בדיקת הבריאות המדויקת דרך המחשב המארח - חובה להשתמש ב-host.docker.internal!
    const apiHealthy = await waitForHealth(`http://host.docker.internal:${nextApiPort}/health`);
    const webHealthy = await waitForHealth(`http://host.docker.internal:${nextWebPort}/health`);


    if (!apiHealthy || !webHealthy) {
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

    // ניקוי מכולות ייצור ישנות אם נתקעו בשם זהה
    runCmd(`docker rm -f api-${nextEnv}`);
    runCmd(`docker rm -f web-${nextEnv}`);

    // הרמת מכולות הייצור הסופיות בפורטים הרשמיים והקבועים של האתר
    runCmd(`docker run -d --name api-${nextEnv} --network app-network -p 4000:4000 my-api:${buildNumber}`);
    runCmd(`docker run -d --name web-${nextEnv} --network app-network -p 4040:4040 -e PORT=4040 -e API_URL=http://api-${nextEnv}:4000 my-web:${buildNumber}`);

    console.log(`🧹 Cleaning up old environment [${currentEnv.toUpperCase()}]...`);
    runCmd(`docker rm -f web-${currentEnv}`);
    runCmd(`docker rm -f api-${currentEnv}`);

    console.log(`\n🎉 Success! Deployment to [${nextEnv.toUpperCase()}] finished with Zero Downtime!`);
    process.exit(0);
}

deploy();

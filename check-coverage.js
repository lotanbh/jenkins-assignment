const { log } = require('console');
const fs = require('fs');
const path = require('path');

function getCoveragePercentage(serviceName) {
    const summaryPath = path.join(__dirname, serviceName, 'coverage', 'coverage-summary.json');

    if (!fs.existsSync(summaryPath)) {
          console.error(`🚨 Error: Coverage report not found for ${serviceName}! Did you run tests with --coverage?`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    // שליחת אחוז כיסוי השורות 
    return data.total.lines.pct;
}

const apiCoverage = getCoveragePercentage('api');
const webCoverage = getCoveragePercentage('web');

console.log(`📊 API Coverage: ${apiCoverage}%`);
console.log(`📊 Web Coverage: ${webCoverage}%`);

const MIN_COVERAGE = 80;
// בדיקה אם אחוז הכיסוי ירד מ80% והצגת הודעת שגיאה במידה וכן
if (apiCoverage < MIN_COVERAGE || webCoverage < MIN_COVERAGE) {
    console.error(`🚨 Error: Coverage dropped below ${MIN_COVERAGE}%! Stopping pipeline.`);
    process.exit(1);
}

console.log('✅ Success: All services passed the 80% coverage gate.');
process.exit(0);
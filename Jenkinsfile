pipeline {
    agent any

    environment {
        // הגדרת משתנים גלובליים שישמשו אותנו לאורך כל הריצה
        REGISTRY_NAME = "my-local-registry"
        // ג'נקינס מביא לנו אוטומטית את מספר הבנייה ואת ה-SHA של ה-Commit
        SHORT_COMMIT  = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'local'}"
    }

    stages {
        // שלב 1: התקנת תלויות והרצת בדיקות עם בדיקת כיסוי (Coverage)
        stage('Test & Coverage') {
            steps {
                echo 'Running Testing and Code Coverage...'
                
                // הרצת הבדיקות של ה-API
                dir('api') {
                    sh 'npm install'
                    sh 'npm test'
                }
                
                // הרצת הבדיקות של ה-Web
                dir('web') {
                    sh 'npm install'
                    sh 'npm test'
                }

                //הרצת סקריפט השער - אם הוא ייכשל, ג'נקינס ייעצר כאן באדום
                echo 'Verifying 80% coverage Gate...'
                sh 'node check-coverage.js'
            }
        }

        // שלב 2: בניית תמונות ה-Docker והזרקת חותמת הבנייה
        stage('Build Docker Images') {
            steps {
                echo "Building images for Build #${BUILD_NUMBER} and Commit ${SHORT_COMMIT}..."
                
                // בניית ה-API עם הזרקת ה-Build Args (סעיף 2 במטלה)
                dir('api') {
                    sh "docker build --build-arg BUILD_NUMBER=${BUILD_NUMBER} --build-arg COMMIT_SHA=${SHORT_COMMIT} -t my-api:${BUILD_NUMBER} ."
                }
                
                // בניית ה-Web עם הזרקת ה-Build Args
                dir('web') {
                    sh "docker build --build-arg BUILD_NUMBER=${BUILD_NUMBER} --build-arg COMMIT_SHA=${SHORT_COMMIT} -t my-web:${BUILD_NUMBER} ."
                }
            }
        }

        // שלב 3: העלאה לאוויר - יתבצע אך ורק בענף main!
        stage('Deploy (Blue-Green)') {
            when {
                branch 'main' // התנאי שמגביל את השלב הזה לענף המרכזי בלבד
            }
            steps {
                echo 'Executing Blue-Green Deployment on main branch...'
                // הרצת סקריפט ה-Deploy החכם שלנו
                sh 'node deploy.js'
            }
        }
    }
}

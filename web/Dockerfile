FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# חותמת הבנייה מג'נקינס (Jenkins) תועבר כארגומנט בעת בניית התמונה
ARG BUILD_NUMBER=local
ARG COMMIT_SHA=local

ENV BUILD_NUMBER=$BUILD_NUMBER
ENV COMMIT_SHA=$COMMIT_SHA
ENV PORT=4040

# הגדרת ברירת מחדל לכתובת ה-API ברשת הפנימית
ENV API_URL=http://api:4000

EXPOSE 4040

CMD ["npm", "start"]
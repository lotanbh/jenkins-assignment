FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# define build arguments for build number and commit SHA (חותמת בנייה)
ARG BUILD_NUMBER=local
ARG COMMIT_SHA=local

# Set environment variables for build number and commit SHA
ENV BUILD_NUMBER=$BUILD_NUMBER 
ENV COMMIT_SHA=$COMMIT_SHA
ENV PORT=4000

# Expose the port the app runs on
EXPOSE 4000

# Start the application
CMD ["node", "start"]

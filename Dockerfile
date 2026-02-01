# Use official Playwright image with Chromium pre-installed
FROM mcr.microsoft.com/playwright:v1.48.2-focal

# Set working directory
WORKDIR /app

# Install Node.js (Playwright image has a minimal Node setup, but let's ensure we have the right version)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install Node dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build Next.js app
RUN npm run build

# Expose port (Render sets PORT env var, Next.js respects it)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]

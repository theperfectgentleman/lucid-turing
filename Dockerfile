# Use the official Node.js alpine image
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package files for the root server and install dependencies
COPY package*.json ./
RUN npm ci

# Copy client folder structure and package files
COPY client/package*.json ./client/

# Install client dependencies
RUN cd client && npm ci

# Copy the rest of the source code
COPY . .

# Build the frontend assets into client/dist
RUN npm run build-client

# Remove development dependencies to keep the image slim
RUN npm prune --production && cd client && rm -rf node_modules

# Final production stage
FROM node:20-alpine

WORKDIR /app

# Copy only the necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/db.js ./db.js
COPY --from=builder /app/gemini.js ./gemini.js
COPY --from=builder /app/client/dist ./client/dist

# Expose port (default 5000)
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=5000

# Run the server
CMD ["npm", "start"]

# Use Node 20 as base
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Environment variables (to be provided at runtime)
# SUARIFY_BASE_URL (defaults to https://suarify1.my in code)
# SUARIFY_API_KEY (required)

# Run the MCP server
# Note: MCP servers communicate over stdio, so they don't typically expose a port
CMD ["node", "index.js"]

FROM node:18-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set the working directory
WORKDIR /app

# Copy all files to the working directory
COPY . .

# Install dependencies
RUN pnpm install

FROM base AS builder

# Build the application
RUN pnpm run build

FROM node:22-alpine AS runner

# Install pnpm in the runner stage
RUN npm install -g pnpm

# Set the working directory
WORKDIR /app

# Copy the necessary files from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install only production dependencies
RUN pnpm install --prod

# Start the application
CMD ["pnpm", "run", "start"]
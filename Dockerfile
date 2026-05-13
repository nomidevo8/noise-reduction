# --- Stage 1: Build NestJS Application ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: Final Production Environment ---
FROM node:18-alpine
WORKDIR /app

# 1. Install Python 3.12 and dependencies required to build native audio bindings
RUN apk add --no-cache python3 py3-pip make g++ ffmpeg

# 2. Set up Python virtual environment to safely install deepfilternet globally
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# 3. Upgrade pip and install deepfilternet dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

# 4. Install NestJS production dependencies and copy built code
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

# 5. Create structural directories required by your AudioService code
RUN mkdir -p storage/uploads storage/enhanced

# Expose Railway's internal port mapping
EXPOSE 3000

# Start NestJS application
CMD ["node", "dist/main"]
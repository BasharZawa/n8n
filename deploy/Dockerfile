# Stage 1: Build custom nodes
FROM node:18-alpine AS builder

RUN npm install -g pnpm

WORKDIR /build

# Copy all custom nodes
COPY custom-nodes/ ./custom-nodes/

# Build n8n-nodes-odoo-generic
# workspace:* deps are pnpm-only; rewrite to latest for the Docker npm install
# Add one RUN block per node when you add new custom nodes
RUN cd custom-nodes/n8n-nodes-odoo-generic \
  && sed -i 's/"workspace:\*"/"*"/g' package.json \
  && npm install \
  && npm run build

# Stage 2: n8n runtime with custom nodes
FROM docker.n8n.io/n8nio/n8n:latest

# Copy built custom nodes into n8n's custom extensions directory
COPY --from=builder /build/custom-nodes/ /home/node/.n8n/custom/

# Tell n8n where to find custom nodes
ENV N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom/n8n-nodes-odoo-generic/dist

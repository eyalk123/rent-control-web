# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Vite inlines VITE_* values at build time, so they must be present during
# `npm run build`. On Railway, declare these as service variables; Railway
# passes them to the build as args matching these ARG names.
ARG VITE_API_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_APP_ID
ARG VITE_SENTRY_DSN
ENV VITE_API_URL=$VITE_API_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Serve stage ----
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# Caddy's base image already runs:
#   caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
# The Caddyfile binds to :{$PORT}, which Railway provides at runtime.

FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
COPY server.mjs auth.mjs server.test.mjs api-client.test.mjs ./
ARG VITE_PUBLIC_DEMO=true
ENV VITE_PUBLIC_DEMO=${VITE_PUBLIC_DEMO}
RUN npm test && npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build --chown=node:node /workspace/dist ./dist
COPY --chown=node:node server.mjs ./server.mjs
COPY --chown=node:node auth.mjs ./auth.mjs
USER node
ENV NODE_ENV=production PORT=8080 PUBLIC_DEMO=true
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=6s --start-period=30s --retries=6 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health',{signal:AbortSignal.timeout(5000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]

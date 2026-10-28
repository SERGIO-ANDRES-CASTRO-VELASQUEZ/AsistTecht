FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN apk add --no-cache curl \
    && mkdir -p public/models \
    && cd public/models \
    && for f in \
      tiny_face_detector_model-weights_manifest.json \
      tiny_face_detector_model-shard1 \
      face_landmark_68_model-weights_manifest.json \
      face_landmark_68_model-shard1 \
      face_recognition_model-weights_manifest.json \
      face_recognition_model-shard1 \
      face_recognition_model-shard2; do \
      [ -s "$f" ] || curl -fsSL -o "$f" "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/$f"; \
    done \
    && cd /app \
    && npx ng build --configuration=production

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/asisqr/browser /usr/share/nginx/html

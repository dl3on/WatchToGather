FROM node:slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./src/signalling/* ./src/signalling/
COPY ./src/common/* ./src/common/
COPY ./tsconfig.json .

RUN npm run build:server

CMD ["node", ".srv/signalling/server.js"]
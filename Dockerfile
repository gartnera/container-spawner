FROM node:22-alpine

COPY config.json /config/

ENV CONFIG_PATH=/config/config.json
ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app
COPY . /app

RUN yarn install

ENTRYPOINT ["yarn", "start"]

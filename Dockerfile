FROM node
RUN mkdir -p /vaccine-bot
WORKDIR /vaccine-bot
COPY . .
RUN npm install
CMD [ "node", "index.js" ]
FROM node:7

COPY package.json

RUN npm install

EXPOSE 5000

CMD npm run dev


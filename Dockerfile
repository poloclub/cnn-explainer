FROM node:12

RUN mkdir workspace
WORKDIR /workspace

COPY package.json .

RUN npm install

COPY . .

EXPOSE 5000

#ENTRYPOINT npm 
CMD ["npm", "run", "dev"]


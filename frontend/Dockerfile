FROM node:24-alpine

WORKDIR /app

ARG APIBASE_URL
ENV APIBASE_URL=${APIBASE_URL}

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 443

CMD ["npm", "run", "start"]

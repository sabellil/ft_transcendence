FROM node:24-alpine

WORKDIR /app

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]

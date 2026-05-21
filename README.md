https://codelynx.dev/posts/fetch-en-react
https://react.dev/reference/react/useState

The goal of this prokect is to build a simple collaborative?social web app for the 42 ft_transcendence project. 

The project currently focuses on:
- User authentication
- User profiles
- Friend system
- Organizations/groups
- Real-time features
- Notifications
- File upload
- Clean backend architecture

Stack used

Frontend :
- React
- Vite
- Typescript

Backend :
- Node.js
- Express

Database :
- PostgreSQL


Infrastructure :
- Docker Compose

Project structure

ft_transcendence/
├── frontend/
├── backend/
├── docker-compose.yml
├── .env
├── .gitignore
└── README.md


Process:

1. Frontend init
It was initialized using Vite with React and TypeScript. 
npm create vite@latest

Vite was used because it provides a fast developement server and supports React and TypeScript
https://vite.dev/config/server-options.html
https://vite.dev/config/server-options.html

2. Backend init
It was initalized with Node.js and Express. 

np init -y

Installed packages : 
npm install express cors dotenv
npm install -D nodemon

- Express is a backend web framework 
- Cors allows frontend and backend to coummincate
- Dotenv enable the loading of env variables
- Nodemon automaticaly restarts the server during development


https://expressjs.com/en/

ENV
Sensitive informations are stored inside .env files. 
For that reason we made sur they were ignored by Git using a .gitignore file. 

EXPRESS SERVER
A simple Express server was created inside backend/src/index.js

The point here was to understand HTTP routes, how requests and responses work and the structure of a backend server

FRONTEND AND BACKEND COMMUNICATION 
React frontend communicate with Express backend using fetch()

Explanation of the flow process :
- React frontend sends a request (req) using fetch()
- Express backend is reached through its API routes and sends a JSON response to frontend
- React displays the data on the web page

It helped udnerstand API routes, HTTP requests and JSON responses

https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview
https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON

CORS (CROSS ORIGIN RESOURCE SHARING)
The frontend and backend run on diferents ports by default.
frontend localhost:5173 (Vite automatically uses this port)
backend localhost:3000  (common defualt port for Node.js and Express development servers)
The browser was blocking request by default so Cors was used : app.use(cors()) to allow communication between React and Express during dev. 

https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS

DOCKER + POSTGRESQL SETUP
Using Docker Compose we setted up PostgreSQL which is an opensource database

Docke renable us to isolate database environement. 
PostgreSQL stores persistent project data. 
The use of volumes prevents us from losing data between each container restart.

ports: 
    - "5432:5432"
PostgreSQL listen on the port 5432 inside its container to communicate to Prisma/backend

https://docs.docker.com/compose
https://docs.docker.com/engine/storage/volumes/
https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports
https://hub.docker.com/_/postgres
https://www.postgresql.org/docs/
https://docs.docker.com/reference/compose-file/build/ helped with structuring docker-compose.yml file and filling in

PRISMA ORM
Prisma is the interface that enables communication between Express bakcend and PostgreSQL, it's an ORM (object relational mapping). 

Without Prisma we would need to write raw SQL queries manually. 
With Prisma we are able to interact with the databse while using Javascript/TypeScript objects. 

Example: prisma.user.findMany() instead of: SELECT * FROM users;

PRISMA SCHEMA

The first model create is User

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  username  String   @unique
  password  String
  avatar    String?
  isOnline  Boolean  @default(false)
  createdAt DateTime @default(now())
}

It defines the future PostgreSQL table structure. 

https://www.prisma.io/docs
https://www.prisma.io/docs/orm/prisma-schema/overview
https://www.prisma.io/docs/orm/prisma-schema/data-model/models
https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql
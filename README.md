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

EXPRESS SERVER

A simple Express server was created inside backend/src/index.js

The point here was to understand HTTP routes, how requests and responses work and the structure of a backend server

FRONTEND AND BACKEND COMMUNICATION 
React frontend communicate with Express backend using fetch()

Explanation of the flow process :
- React frontend sends a request (req) using fetch()
- Express backend is reached through its API routes and sends a JSON response to frontend
- React renders the data  

It helped udnerstand API routes, HTTP requests and JSON responses



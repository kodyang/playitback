# Quickstart

## Client
### Do this first
```
cd client
npm install
```

### Running Locally
`npm run start` to run the client locally. It will automatically open on http://localhost:3000/

### Creating a Production Build
`npm run build` to create a production build. It will update the files in `client/build/`

## Server
### Do this first
```
cd playitback
npm install
```

### Running Locally
`npm start` to run the backend locally. The url is http://localhost:8000/. One thing to note is that the html/css/js served on this page is what exists in the `client/build/` directory. To update this to the latest changes in the client, see [Creating a Production Build](https://github.com/kodyang/playitback/new/master?readme=1#creating-a-production-build).

export function getHostUrl() {
  switch(process.env.NODE_ENV) {
    case 'test':
    case 'development':
      return 'http://localhost:8000/';
    case 'production':
      return 'https://playitback.azurewebsites.net/';
    default:
      console.error("Invalid Environment");
      return null;
  }
}
const app = require('./app');
const PORT = process.env.PORT || 4040;

app.listen(PORT, () => {
  console.log(`Web Service is running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;


app.use(cors({
  origin: ["http://localhost:3000", "https://figurando-frontend.vercel.app/"],
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));
app.use(express.json());
// app.use(morgan('tiny'));

const uri = process.env.MONGODB_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
console.log("MongoDB database connection established successfully");
})

const albumesRouter = require('./routes/albumes');
const figurasRouter = require('./routes/figuras');
const usuariosRouter = require('./routes/usuarios');

app.use('/usuarios',usuariosRouter)
app.use('/figuras',figurasRouter)
app.use('/albumes',albumesRouter)

app.listen(port, () => {
console.log(`Server is running on port: ${port}`);
});


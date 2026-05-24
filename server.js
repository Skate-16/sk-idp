require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const { publicDir } = require('./config/paths');
const { ensureStorage } = require('./services/startupService');
const pageRoutes = require('./routes/pageRoutes');
const apiRoutes = require('./routes/apiRoutes');
const apiController = require('./controllers/apiController');

const app = express();
const PORT = process.env.PORT || 3000;

ensureStorage();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(publicDir));
app.use(morgan('tiny'));

app.use('/', pageRoutes);
app.use('/api', apiRoutes);
app.get('/health', apiController.health);

app.listen(PORT, () => console.log(`DevHelp running at http://localhost:${PORT}`));

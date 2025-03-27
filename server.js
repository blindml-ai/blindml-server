var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
const session = require('express-session');
require('dotenv').config(); // .env 파일 로드

require('./database').initializeDatabase();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var containersRouter = require('./routes/container');
var authRouter = require('./routes/auth');
var proxyRouter = require('./routes/proxy');
var settingRouter = require('./routes/setting')
var taskRouter = require('./routes/task');

const PORT = process.env.PORT || process.env.SERVICE_PORT || 3000;

var app = express();

app.use(
    session({
        secret: 'BLINDML',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: 'auto' },
    })
);

app.use(cors({
    origin: '*', // 필요한 경우 특정 도메인만 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Request body payload size limit 설정 (1GB)
app.use(logger('dev'));
app.use(express.json({ limit: '1gb' })); // JSON 요청의 최대 크기를 1GB로 설정
app.use(express.urlencoded({ limit: '1gb', extended: true })); // URL-encoded 요청의 최대 크기를 1GB로 설정
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/containers', containersRouter);
app.use('/auth', authRouter);
app.use('/proxy', proxyRouter);
app.use('/settings',settingRouter)
app.use('/task', taskRouter)

// 도커 서버 URL과 포트 불러오기
const DOCKER_SERVER = process.env.DOCKER_SERVER;
const DOCKER_PORT = process.env.DOCKER_PORT;

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;

const UserModel = require('../models/UserModel');
const AuthModel = require('../models/AuthModel');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class SettingController {
    constructor() {
        this.userModel = new UserModel();
        this.authModel = new AuthModel();
    }
    /**
     * Retrieves general application settings.
     * If the user is not authenticated, they are redirected to the main page.
     * Otherwise, it renders the general settings page with environment variables.
     */
    getGeneral = async (req, res) => {
        try {
            if (!req.session.user) {
                res.redirect('/');
            } else {
                var email = req.session.user.email;
                var nickname = req.session.user.nickname

                //TODO : 권한체크
                const user_info = await this.userModel.getUser(email);

                res.render('setting/general', {
                    loggedIn:true,
                    nickname:nickname,
                    serviceServer: process.env.SERVICE_SERVER,
                    servicePort: process.env.SERVICE_PORT,
                    dockerServer: process.env.DOCKER_SERVER,
                    dockerPort: process.env.DOCKER_PORT,
                    authServer: process.env.AUTH_SERVER,
                    authPort: process.env.AUTH_PORT,
                    dbHost : process.env.DB_HOST,
                    dbUser : process.env.DB_USER,
                    dbPassword : process.env.DB_PASSWORD,
                    dbName : process.env.DB_NAME

                });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    };
    /**
     * Updates environment variables based on user input.
     * Only authenticated users can modify the environment variables.
     */
        //TODO : 관리자만 수정할 수 있게 해야 함
    postEnv = async (req, res) => {
        try {
            if (!req.session.user) {
                // 세션이 없으면 로그인 페이지로 리다이렉트
                return res.redirect('/');
            }

            const { SERVICE_SERVER, SERVICE_PORT, DOCKER_SERVER, DOCKER_PORT, AUTH_SERVER, AUTH_PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = req.body;

            // 업데이트할 새로운 환경 변수
            const updatedEnv = `
SERVICE_SERVER=${SERVICE_SERVER}
SERVICE_PORT=${SERVICE_PORT}
DOCKER_SERVER=${DOCKER_SERVER}
DOCKER_PORT=${DOCKER_PORT}
AUTH_SERVER=${AUTH_SERVER}
AUTH_PORT=${AUTH_PORT}
DB_HOST=${DB_HOST}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
`;

            // .env 파일 경로 설정 (프로젝트 최상위에 위치)
            const envPath = path.join(__dirname, '..', '.env');

            // .env 파일 덮어쓰기
            fs.writeFile(envPath, updatedEnv, (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Failed to update .env file.' });
                }

                process.env.SERVICE_SERVER = SERVICE_SERVER;
                process.env.SERVICE_PORT = SERVICE_PORT;
                process.env.DOCKER_SERVER = DOCKER_SERVER;
                process.env.DOCKER_PORT = DOCKER_PORT;
                process.env.AUTH_SERVER = AUTH_SERVER;
                process.env.AUTH_PORT = AUTH_PORT;
                process.env.DB_HOST = DB_HOST,
                process.env.DB_USER = db_user;
                process.env.DB_PASSWORD = DB_PASSWORD;
                process.env.DB_NAME = DB_NAME;

                // 성공적으로 업데이트되면 JSON 응답을 보냄
                res.json({ success: true, message: 'Environment variables updated successfully.' });

            });
        } catch (e) {
            console.error(e);
            res.status(500).json({ success: false, message: e.message });
        }
    };

}

module.exports = SettingController
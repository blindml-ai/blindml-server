const UserModel = require('../models/UserModel');
const AuthModel = require('../models/AuthModel');

class UserController {
    constructor() {
        this.userModel = new UserModel();
        this.authModel = new AuthModel();
    }

    getSignIn = async (req, res) => {
        try {
            if (req.session.user) {
                res.redirect('/');
            } else {
                res.render('user/signin', {});
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    };

    postSignIn = async (req, res) => {
        const { email, password } = req.body;
        try {
            const user = await this.userModel.getUser(email);
            if (!user) {
                throw new Error('User not found');
            }

            const validPassword = await this.authModel.passwordVerify(user, email, password);
            if (!validPassword) {
                throw new Error('Incorrect password');
            }

            req.session.user = user; // Assume this assigns the necessary user info
            res.redirect("/");
        } catch (error) {
            console.log(error.message);
            if (error.message === 'User not found') {
                res.status(404).json({ error: error.message });
            } else if (error.message === 'Incorrect password') {
                res.status(401).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    };

    getRegister = async (req, res) => {
        if (req.session.user) {
            res.redirect('/');
        } else {
            try {
                const roles = await this.userModel.getUserRoles();
                res.render('user/register', { roles: roles });
            } catch (err) {
                console.error(err.message);
                res.status(500).json({ error: err.message });
            }
        }
    };

    postRegister = async (req, res) => {
        const { email, password, nickname, role, desc } = req.body;
        try {
            const existingUser = await this.userModel.getUser(email);
            if (existingUser) {
                throw new Error('This email is already registered');
            }

            const hashedPassword = await this.authModel.getHashedPassword(password);
            const apikey = await this.authModel.generateAPIkey();
            var user_id = await this.userModel.createUser(email, hashedPassword, nickname, role, desc, apikey);
            const result = { email: email, nickname: nickname, id : user_id };
            req.session.user = result;
            res.redirect("/");
        } catch (error) {
            if (error.message === 'This email is already registered') {
                res.status(409).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    };

    getSignOut = async (req, res) => {
        req.session.destroy(() => {
            res.redirect('/');
        });
    };

    postToken = async (req, res) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (token == null) {
                return res.status(401).json({ success: false, error: "No token provided" });
            }

            const verifiedUser = await this.authModel.tokenVerify(token);
            req.user = verifiedUser; // Assuming tokenVerify properly verifies the token and returns user info
            res.json({ success: true });
        } catch (e) {
            res.status(403).json({ success: false, error: e.message });
        }
    };

    getMyApi = async(req,res) => {
        if (!req.session.user) {
            res.redirect('/');
            return;
        }
        try {
            const apikey = (await this.userModel.getMyAPIkey(req.session.user.email)).apikey
            res.render('user/myapi', {apikey: apikey, loggedIn : true, nickname : req.session.user.nickname});
        }catch(e) {
            res.render('common/access-denied', {message : e.message})
        }
    }

    postMyApiRegenerate = async(req,res) => {
        if (!req.session.user) {
            res.redirect('/');
            return;
        }
        try {
            const newkey = await this.authModel.generateAPIkey();
            await this.userModel.updateMyAPIkey(req.session.user.email, newkey);
            res.status(200).json({apikey: newkey})
        } catch(e) {
            res.status(500).json({message :e.message})
        }
    }
}

module.exports = UserController;

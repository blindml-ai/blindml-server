const AuthModel = require('../models/AuthModel');
const UserModel = require('../models/UserModel')
const ContainerModel = require('../models/ContainerModel')
class AuthController {

    constructor() {
        this.authModel = new AuthModel();
        this.userModel = new UserModel();
        this.containerModel = new ContainerModel();
    }
    /**
     * Verify user authentication token.
     * This method extracts the token from the request header and verifies it using the authentication model.
     * If the token is valid, it checks whether the user has access to the given container.
     */
    postVerifyToken = async (req, res) =>{

        try {
            const token = req.headers.authorization;
            const container_id = req.body.container_id;

            try {
                var user = this.authModel.tokenVerify(token)
                var user_email = user.email;
                var user_container = this.userModel.checkUserContainer(user_email,container_id)
                if(user_container.user_id) {
                    res.json({ success: true });
                }

            } catch(e) {
                res.status(401).json({ success: false, message: "Authentication failed" });
            }


        }catch(e){
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    /**
     * Verify API key access to a container.
     * Checks whether the provided API key has permission to access the specified container.
     */
    postContainerVerifyAccess= async(req,res) => {
        try {
            const apikey = req.headers.authorization;
            const container_id = req.body.container_id;

            try {
                var user = this.userModel.getUserByApikey(apikey)
                var user_id = user.id
                var user_container = this.userModel.checkUserContainerById(user_id,container_id)
                if(user_container.user_id) {
                    res.json({ success: true, message: "Authentication Success" });
                }

            } catch(e) {
                res.status(401).json({ success: false, message: "Authentication failed" });
            }


        }catch(e){
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }


}

module.exports = AuthController;
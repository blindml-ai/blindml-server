const QueryModel= require('../models/QueryModel')

class UserModel {
    constructor() {
        this.query= new QueryModel()
    }

    getUserRoles = async () => {
        try {
            return await this.query.selectAllQuery("SELECT * FROM role", [])
        }catch(e) {
            console.log(e.message)
            throw e
        }
    }

   getUser = async (email) => {
        try {
            return await this.query.selectQuery("SELECT * FROM user WHERE email = ?", [email])
        }catch(e) {
            console.log(e.message)
            throw e
        }
    }

    createUser = async (email, hashedPassword, nickname, role, desc, apikey) =>
    {

        try {
            return await this.query.insertQuery("INSERT INTO user(email,token,nickname,role,desc, apikey) VALUES (?, ?, ?, ?, ?, ?)", [email, hashedPassword, nickname, role, desc, apikey])
        }catch(e){
            console.log(e.message)
            throw e
        }
    }

    checkUserContainer = async (user_email,container_id) => {

        try {
            return await this.query.selectQuery("SELECT user_container.user_id FROM user JOIN user_container ON user.id = user_container.user_id WHERE user.email = ? AND user_container.container_id=?", [user_email,container_id])
        }catch(e) {
            console.log(e.message)
            throw e
        }

    }
    checkUserContainerById = async (user_id,container_id) => {

        try {
            return await this.query.selectQuery("SELECT user_container.user_id FROM user JOIN user_container ON user.id = user_container.user_id WHERE user.id = ? AND user_container.container_id=?", [user_id,container_id])
        }catch(e) {
            console.log(e.message)
            throw e
        }

    }
    getMyAPIkey = async (email) => {
        try {
            return await this.query.selectQuery("SELECT apikey FROM user WHERE email=?", [email])
        }catch(e) {
            console.log(e.message)
            throw e
        }
    }

    updateMyAPIkey = async (email, newkey) => {
        try {
            return await this.query.updateQuery("UPDATE user set apikey=? WHERE email=?", [newkey,email])
        }catch(e) {
            console.log(e.message)
            throw e
        }
    }

    getUserByApikey = async(apikey) => {
        try {
            return await this.query.selectQuery("SELECT * from user WHERE apikey=?", [apikey])
        }catch(e) {
            console.log(e.message)
            throw e
        }
    }

}

module.exports = UserModel;
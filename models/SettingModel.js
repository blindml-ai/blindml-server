const QueryModel = require('../models/QueryModel');
const UserModel = require('../models/UserModel');

class SettingModel {
    constructor() {
        this.query = new QueryModel();
        this.userModel = new UserModel();
    }

}
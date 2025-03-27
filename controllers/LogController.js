const LogModel = require('../models/LogModel');

class LogController {

    constructor() {
        this.logModel = new LogModel();
    }


    postLogLast = async(req,res) => {
        const { user_id } = req.body;
        var last_log = await this.logModel.getLogByUserIdLastone(user_id)
        res.json(last_log)
    }


}


module.exports = LogController
const QueryModel= require('../models/QueryModel')

class LogModel {
    constructor() {
       this.query = new QueryModel()
    }

    insertLog = async(data) => {
        try {
            return await this.query.insertQuery("INSERT INTO LOG(level,message,detail,user_id) values(?,?,?,?)", [data.level, data.message, data.detail, data.user_id])
        }catch(e) {
            console.log(e.message)
            throw e
        }
    }

    getLogByUserIdLastone = async(user_id) => {
        try {
            return await this.query.selectQuery("SELECT * FROM log WHERE user_id=? order by insert_time desc limit 1", [user_id]);
        }catch(e) {
            console.log(e.message)
            throw e
        }
    }

}


module.exports = LogModel
const QueryModel = require('../models/QueryModel');
const UserModel = require('../models/UserModel');

class ContainerModel {
    constructor() {
        this.query = new QueryModel();
        this.userModel = new UserModel();
    }

    getMyContainerList = async(user_id) => {
        try {
            return await this.query.selectAllQuery(`
            SELECT 
                c.id,
                c.realid,
                c.name,
                c.visibility,
                c.status_code,
                c.version,
                c.tags,
                c.owner,
                c.update_time,
                u.nickname AS nickname,
                (SELECT COUNT(*) FROM user_container WHERE user_container.container_id = c.id) AS subscribers_count
            FROM 
                container AS c
            JOIN 
                user_container ON c.id = user_container.container_id /*AND user_container.is_owner = 1*/
            JOIN
                user AS u ON c.owner = u.id /* 컨테이너 소유자 정보 */
            WHERE 
                user_container.user_id = ?
        `, [user_id]);
        } catch(e) {
            console.log(e.message);
            throw e;
        }
    }

    getOpenModels = async() => {
        try {
            return await this.query.selectAllQuery(`SELECT     
                c.id,
                c.realid,
                c.name,
                c.visibility,
                c.status_code,
                c.version,
                c.tags,
                c.owner,
                c.update_time,
                (SELECT COUNT(*) FROM user_container WHERE user_container.container_id = c.id) AS subscribers_count, u.nickname FROM container as c JOIN user AS u ON c.owner = u.id WHERE visibility='public' ORDER BY c.insert_time DESC limit 100`, []);
        } catch (e) {
            console.log(e.message);
            throw e;
        }
    }

    getSubscriptionStatus = async(container_id, user_id) => {
        try {
            return await this.query.selectQuery(`
            SELECT 
                COUNT(*) AS subscribersCount, 
                EXISTS(
                    SELECT 1 
                    FROM user_container 
                    WHERE container_id = ? 
                    AND user_id = ?
                ) AS subscribed
            FROM 
                user_container
            WHERE 
                container_id = ?;
`, [container_id, user_id, container_id]);
        } catch (e) {
            console.log(e.message);
            throw e;
        }
    }

    subscribe = async(container_id, user_id, is_owner) => {
        try {
            return await this.query.insertQuery(`insert into user_container(container_id, user_id) values(?,?)`, [container_id, user_id]);
        } catch (e) {
            console.log(e.message);
            throw e;
        }
    }
    unsubscribe = async(container_id, user_id) => {
        try {
            return await this.query.updateQuery(`DELETE FROM user_container WHERE container_id=? and user_id=?`, [container_id, user_id]);
        } catch (e) {
            console.log(e.message);
            throw e;
        }
    }

    getContainerDetail = async(user_id,container_id) => {

        try {
            const sql = `
            SELECT 
                c.id, 
                u.id AS user_id, 
                u.nickname, 
                u.email, 
                c.owner, 
                c.name, 
                c.desc, 
                c.cpu, 
                c.ram, 
                c.gpu_enabled, 
                c.visibility, 
                c.security, 
                c.tags, 
                c.version, 
                c.status_code,
                c.port, 
                c.insert_time, 
                c.update_time, 
                m.fhe_lib, 
                m.fhe_lib_version, 
                (SELECT COUNT(*) FROM user_container WHERE user_container.container_id = c.id) AS subscribers_count,
                EXISTS (
                    SELECT 1 
                    FROM user_container AS uc 
                    WHERE uc.user_id = ? 
                    AND uc.container_id = c.id
                ) AS is_user_container_linked 
            FROM container AS c 
            JOIN user AS u ON c.owner = u.id 
            JOIN model AS m ON c.model = m.id 
            WHERE c.id = ?`;
            var row = await this.query.selectQuery(sql, [user_id, container_id]);
            return row;

        }catch(e) {
            console.log(e.message);
            throw e;
        }

    }


    updateContainerStatus = async (container_id, status_code) => {
        try {
            return await this.query.updateQuery(`UPDATE container SET status_code = ? WHERE id = ?`, [status_code, container_id]);
        } catch (e) {
            console.log(e.message);
            throw e;
        }
    }

    updateContainerRealId = async (container_id, container_realid) => {
        try {
            return await this.query.updateQuery(`UPDATE container SET realid = ? WHERE id = ?`, [container_realid, container_id]);
        } catch (e) {
            console.log(e.message);
            throw e;
        }
    }

    selectContainer = async(container_id) => {
        try {
            return await this.query.selectQuery(`SELECT * FROM container WHERE id = ?`, [container_id]);
        } catch (e) {
            console.log(e.message);
            throw e;
        }
    }

    deleteContainer = async (container_id) => {
        try {
            return await this.query.updateQuery(`DELETE FROM container WHERE id = ?`, [container_id]);
        } catch (e) {
            console.log(e.message);
            throw e;
        }
    }
    getCurrentContainerStatus = async (container_id) =>{
        try {
            var status_res = await this.query.selectQuery('SELECT status_code FROM container WHERE id = ?', [container_id]);
            return status_res.status_code;
        } catch (e) {
            console.log(e.message);
            throw e;
        }
    }

    listStatus = async () => {
        var STATUS_CODES = {};
        var STATUS_CODES_ARRAY = await this.query.selectAllQuery('SELECT * FROM container_status', []);
        for (var no = 0; no < STATUS_CODES_ARRAY.length; no++) {
            var obj = STATUS_CODES_ARRAY[no];
            STATUS_CODES[obj.name] = { code: obj.code, description: obj.description };
        }
        return STATUS_CODES;
    }

    validateContainerCreationData= async (data) => {
        // TODO: Implement more sophisticated logic for validating ML file integrity
        if (!data.requirements) {
            return false;
        }
        return true;
    }

    checkValidUser = async(user_id, container_id) => {

        try {
            var result = await this.query.selectQuery("SELECT * FROM user_container WHERE user_id=? and container_id=?", [user_id, container_id])
            return result;
        }catch(e) {
            return false;
        }
    }



    createTransaction = async (dataset)=> {
        try {
            await this.query.beginTransaction();
            var user_obj = await this.query.selectQuery(`SELECT id FROM user WHERE email = ?`, [dataset.email]);
            await this.query.insertQuery(`INSERT INTO container (id, name, desc, cpu, ram, gpu_enabled, security, visibility,  tags, version, owner, status_code, port) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,  ?, ?, ?, ?)`, [dataset.container_uuid, dataset.name, dataset.desc, dataset.parsedCpu, dataset.parsedRam, dataset.gpuEnabledInt, dataset.parsedSecurityLevel, dataset.visibility,  dataset.tags, dataset.version, user_obj.id, 200, dataset.port]);
            var model_id = await this.query.insertQuery(`INSERT INTO model (container_id, name, fhe_lib, fhe_lib_version, requirements, data) VALUES (?, ?, ?, ?, ?, ?)`, [dataset.container_uuid, dataset.name, dataset.fheLib, dataset.fheVersion, dataset.requirements, dataset.modelDataString]);
            await this.query.updateQuery(`UPDATE container SET model=? WHERE id=?`,[model_id, dataset.container_uuid])


            if (dataset.whitelist !== "") {
                var whitelist_array = dataset.whitelist.split(";");
                for (const email of whitelist_array) {
                    const userobj = await this.userModel.getUser(email);
                    await this.query.runQuery(`INSERT INTO user_whitelist(container_id, user_id) VALUES (?, ?)`, [dataset.container_uuid, userobj.id]);
                }
            }
            if (dataset.blacklist !== "") {
                var blacklist_array = dataset.blacklist.split(";");
                for (const email of blacklist_array) {
                    const userobj = await this.userModel.getUser(email);
                    await this.query.runQuery(`INSERT INTO user_blacklist(container_id, user_id) VALUES (?, ?)`, [dataset.container_uuid, userobj.id]);
                }
            }
            await this.query.insertQuery("INSERT INTO user_container (container_id, user_id, is_owner) values(? ,? ,?)", [dataset.container_uuid, dataset.user_id, 1])

            await this.query.commitTransaction();

            return model_id;
        } catch (e) {
            await this.query.rollbackTransaction();
            console.log(e.message);
            throw e;
        }
    }
}

module.exports = ContainerModel;

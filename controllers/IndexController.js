const ContainerModel = require('../models/ContainerModel')
const DockerModel = require('../models/DockerModel')

class IndexController {
    constructor() {
        this.cm = new ContainerModel();
        this.dm = new DockerModel();
    }
    /**
     * Render the main page.
     * If the user is logged in, fetches their container list and updates their statuses.
     * Otherwise, renders the page without any user-specific data.
     */
    getMain = async(req,res) => {
            if (req.session.user) {

                // Retrieve the user's containers.
                var container_list = await this.cm.getMyContainerList(req.session.user.id);
                container_list = await this.dm.getDockerList(container_list)

                // Update the status of each container.
                for(var i=0; i < container_list.length; i++) {
                    await this.cm.updateContainerStatus(container_list[i]['id'], container_list[i]['status_code'])
                }

                // Render the main page with user-specific data.
                res.render('index', { loggedIn: true, user_id : req.session.user.id, email: req.session.user.email, nickname : req.session.user.nickname, container_list : container_list });
            } else {
                // Render the main page for unauthenticated users
                res.render('index', { loggedIn: false, container_list : [] });
            }
    }
    /**
     * Retrieve and render a list of open models.
     * Fetches all publicly available models if the user is authenticated.
     */
    getOpenModels = async(req,res) => {
        if (req.session.user) {
            // Retrieve the list of open models for the user.
            var container_list = await this.cm.getOpenModels(req.session.user.id);
            container_list = await this.dm.getDockerList(container_list)

            // Update the status of each container.
            for(var i=0; i < container_list.length; i++) {
                await this.cm.updateContainerStatus(container_list[i]['id'], container_list[i]['status_code'])
            }

            // Render the open models page with user-specific data.
            res.render('openmodel', { loggedIn: true, user_id : req.session.user.id,  email: req.session.user.email, nickname : req.session.user.nickname, container_list : container_list });
        }
        else {

            // Render the open models page for unauthenticated users.
            res.render('openmodel', { loggedIn: false, container_list : [] });
        }
    }
}

module.exports = IndexController;
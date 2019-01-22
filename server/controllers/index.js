/**
 * Export dictionery for controller singletons.
 * @type {{}}
 */
const AuthController = require('./auth');
const SparkCampsController = require('./sparkCamps');
const ConfigurationsController = require('./configurations');
const SparkEventsController = require('./sparkEvents');
const AuditController = require('./audit');
const SparkUsersController = require('./sparkUsers');
const AllocationsController = require('./allocations');
const PermissionsController = require('./permissions');
const GroupMembersController = require('./groupMembers');
const GroupsController = require('./groups');
const NewGroupRequestsController = require('./newGroupRequests');

module.exports = {
    auth: new AuthController(),
    sparkCamps: new SparkCampsController(),
    configurations: new ConfigurationsController(),
    sparkEvents: new SparkEventsController(),
    audit: new AuditController(),
    users: new SparkUsersController(),
    allocations: new AllocationsController(),
    permissions: new PermissionsController(),
    groupMembers: new GroupMembersController(),
    groups: new GroupsController(),
    newGroupRequests: new NewGroupRequestsController()
};

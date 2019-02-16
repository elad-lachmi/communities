const Sequelize = require ('sequelize');
const Models = require ('../models');
const constants = require ('../../models/constants');
const args = require ('args');

async function getCommunitiesDb (config) {
  console.log (
    `Connecting to communities db with config - ${JSON.stringify (config)}`
  );
  const db = {};
  db.sequelize = new Sequelize (config);
  db.Audits = await Models.Audits (db.sequelize, Sequelize);
  db.Groups = await Models.Groups (db.sequelize, Sequelize);
  db.GroupMembers = await Models.GroupMembers (db.sequelize, Sequelize);
  db.Allocations = await Models.Allocations (db.sequelize, Sequelize);
  db.Permissions = await Models.Permissions (db.sequelize, Sequelize);
  db.LoggedUsers = await Models.LoggedUsers (db.sequelize, Sequelize);
  db.Requests = await Models.Requests (db.sequelize, Sequelize);
  db.AdminAllocationRounds = await Models.AdminAllocationRounds (
    db.sequelize,
    Sequelize
  );
  // DO NOT USE FORCE TRUE - this will recreate the data base
  await db.sequelize.sync ({force: false});
  return db;
}

async function getSparkDb (config) {
  console.log (
    `Connecting to spark db with config - ${JSON.stringify (config)}`
  );
  const db = {};
  db.sequelize = new Sequelize (config);
  return db;
}

async function getSparkData (sparkDb, tables) {
  const results = {};
  for (const tableName of tables) {
    results[
      tableName
    ] = await sparkDb.sequelize.query (`SELECT * FROM \`${tableName}\``, {
      type: sparkDb.sequelize.QueryTypes.SELECT,
    });
  }
  return results;
}

function parseSparkCampsToGroups (camps) {
  const parseType = sparkProto =>
    constants.SPARK_TYPES_TO_GROUP_TYPES[sparkProto];
  const keyTranslations = [
    ['__prototype', 'group_type', parseType],
    ['id', 'spark_id'],
    ['event_id', 'event_id'],
    ['accept_families', 'accept_families'],
    ['child_friendly', 'child_friendly'],
    ['camp_desc_en', 'group_desc_en'],
    ['camp_desc_he', 'group_desc_he'],
    ['camp_name_en', 'group_name_en'],
    ['camp_name_he', 'group_name_he'],
    ['created_at', 'created_at'],
    ['web_published', 'web_published'],
    ['status', 'group_status'],
    ['noise_level', 'noise_level'],
    ['facebook_page_url', 'facebook_url'],
    ['type', 'group_character'],
    ['main_contact', 'main_contact'],
    ['moop_contact', 'moop_contact'],
    ['safety_contact', 'safety_contact'],
    ['contact_person_id', 'contact_person_id'],
  ];
  return camps.map (sparkCamp => {
    const communitiesModel = {};
    for (const keyTranslation of keyTranslations) {
      const [sparkKey, communitiesKey, fn] = keyTranslation;
      communitiesModel[communitiesKey] = fn
        ? fn (sparkCamp[sparkKey])
        : sparkCamp[sparkKey];
    }
    // No Spark camps are open!
    communitiesModel.group_is_new_members_open = false;
    return communitiesModel;
  });
}

function getRole (group, member) {
  switch (member.user_id) {
    case group.main_contact:
      return constants.GROUP_STATIC_ROLES.LEADER;
    case group.moop_contact:
      return constants.GROUP_STATIC_ROLES.MOOP;
    case group.safety_contact:
      return constants.GROUP_STATIC_ROLES.SAFETY;
    case group.contact_person_id:
      return constants.GROUP_STATIC_ROLES.CONTACT;
    default:
      return null;
  }
}

async function getGroupMembersData (group, members) {
  const communitiesMemberships = [];
  for (const member of members) {
    const role = getRole (group, member);
    const communitiesMembership = {
      role,
      group_id: group.id,
      user_id: member.user_id,
    };
    communitiesMemberships.push (communitiesMembership);
  }
  return communitiesMemberships;
}

/**
 * Starting function
 */
async function Migrate () {
  args
    .option ('spark-host', 'Spark db host', 'sparkdb')
    .option ('spark-user', 'Spark db user', 'spark')
    .option ('spark-db', 'Spark db name', 'spark')
    .option ('spark-pass', 'Spark db password', 'spark')
    .option ('com-host', 'Communities db host', 'communitiesdb')
    .option ('com-user', 'Communities db user', 'root')
    .option ('com-db', 'Communities db name', 'communities')
    .option ('com-pass', 'Communities db password');
  const flags = args.parse (process.argv);
  try {
    const sparkConfig = {
      username: flags.sparkUser || process.env.SPARK_DB_USER || 'spark',
      password: flags.sparkPass || process.env.SPARK_DB_PASSWORD || 'spark',
      database: flags.sparkDb || process.env.SPARK_DB_DBNAME || 'spark',
      host: flags.sparkHost || process.env.SPARK_DB_HOSTNAME || 'sparkdb',
      dialect: 'mysql',
    };
    const communitiesConfig = {
      dialect: 'mysql',
      host: flags.comHost || process.env.MYSQL_DB_HOST || 'communitiesdb',
      database: flags.comDb || process.env.MYSQL_DB_NAME || 'communities',
      username: flags.comUser || process.env.MYSQL_DB_USERNAME || 'root',
      password: flags.comPass || process.env.MYSQL_DB_PASSWORD,
    };
    const communitiesDb = await getCommunitiesDb (communitiesConfig);
    const sparkDb = await getSparkDb (sparkConfig);
    const sparkData = await getSparkData (sparkDb, ['camps', 'camp_members']);
    const groups = parseSparkCampsToGroups (sparkData.camps);
    const results = {
      success: [],
      failure: [],
    };
    for (const group of groups) {
      try {
        const result = await communitiesDb.Groups.create (group, {
          returning: true,
        });
        const groupMembers = await getGroupMembersData (
          result.toJSON (),
          sparkData.camp_members.filter (
            members =>
              members.status.includes ('approved') &&
              +members.camp_id === group.spark_id
          )
        );
        await communitiesDb.GroupMembers.bulkCreate (groupMembers);
        results.success.push (result);
      } catch (e) {
        results.failure.push (group.spark_id);
      }
    }
    console.log (`Migrated ${results.success.length} groups`);
    console.log (`Faild ${results.failure.length} groups`);
    process.exit (0);
  } catch (e) {
    console.warn (e.stack);
    process.exit (1);
  }
}

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Migrate ();
  },
  down: (queryInterface, Sequelize) => {},
};

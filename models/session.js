'use strict';

module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    sportId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    venue: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 160]
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    time: {
      type: DataTypes.STRING,
      allowNull: false
    },
    additionalPlayersNeeded: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 200
      }
    },
    isCancelled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'Sessions',
    timestamps: true
  });

  Session.associate = (models) => {
    Session.belongsTo(models.Sport, {
      foreignKey: 'sportId',
      as: 'sport'
    });
    Session.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'creator'
    });
    Session.hasMany(models.SessionPlayer, {
      foreignKey: 'sessionId',
      as: 'players'
    });
    Session.belongsToMany(models.User, {
      through: models.SessionPlayer,
      foreignKey: 'sessionId',
      otherKey: 'userId',
      as: 'joinedUsers'
    });
  };

  return Session;
};

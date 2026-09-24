'use strict';

module.exports = (sequelize, DataTypes) => {
  const SessionPlayer = sequelize.define('SessionPlayer', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    teamName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Unassigned'
    }
  }, {
    tableName: 'SessionPlayers',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['sessionId', 'userId']
      }
    ]
  });

  SessionPlayer.associate = (models) => {
    SessionPlayer.belongsTo(models.Session, {
      foreignKey: 'sessionId',
      as: 'session'
    });
    SessionPlayer.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return SessionPlayer;
};

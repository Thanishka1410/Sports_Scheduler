'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'player'),
      allowNull: false,
      defaultValue: 'player'
    }
  }, {
    tableName: 'Users',
    timestamps: true
  });

  User.associate = (models) => {
    User.hasMany(models.Sport, {
      foreignKey: 'adminId',
      as: 'sports'
    });
    User.hasMany(models.Session, {
      foreignKey: 'creatorId',
      as: 'createdSessions'
    });
    User.hasMany(models.SessionPlayer, {
      foreignKey: 'userId',
      as: 'sessionPlayers'
    });
  };

  return User;
};

// models/index.js
const User = require("./User");
const Property = require("./Property");

// This ensures models are loaded in the correct order
module.exports = {
  User,
  Property,
};

module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    node: true,
    es6: true,
    mocha: true,
  },
  globals: {
    artifacts: "readonly",
    contract: "readonly",
    it: "readonly",
    assert: "readonly",
    before: "readonly",
    beforeEach: "readonly",
    describe: "readonly",
    web3: "readonly",
  },
  rules: {
    "no-console": "off",
    "no-unused-vars": ["warn", { args: "none" }],
  },
};

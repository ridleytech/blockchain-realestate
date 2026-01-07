module.exports = {
  env: {
    node: true,
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
    // Add any custom rules here
  },
};

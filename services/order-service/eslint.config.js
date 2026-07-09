const globals = require('globals');
const pluginJs = require('@eslint/js');

module.exports = [
  { languageOptions: { globals: { ...globals.node, ...globals.mocha } } },
  pluginJs.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error'
    }
  }
];

module.exports = {
  root: true,
  extends: [
    require.resolve('@gera2ld/plaid/eslint'),
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'no-unused-vars': ['warn', { varsIgnorePattern: 'VM' }],
  },
};

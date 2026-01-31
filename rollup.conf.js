const path = require('path');
const { getRollupPlugins } = require('@gera2ld/plaid');
const userscript = require('rollup-plugin-userscript');
const pkg = require('./package.json');

const DIST = 'dist';
const FILENAME = 'GazelleSubs';

const bundleOptions = {
  extend: true,
  esModule: false,
};

const postcssOptions = {
  ...require('@gera2ld/plaid/config/postcssrc'),
  inject: false,
  minimize: true,
};

const rollupConfig = [
  {
    input: {
      input: 'src/index.js',
      plugins: [
        ...getRollupPlugins({
          esm: true,
          minimize: false,
          postcss: postcssOptions,
        }),
        userscript(path.resolve('src/meta.js'), (meta) =>
          meta
            .replace('process.env.VERSION', pkg.version)
            .replace('process.env.AUTHOR', pkg.author)
        ),
      ],
    },
    output: {
      format: 'iife',
      file: `${DIST}/${FILENAME}.user.js`,
      banner: '/* Built with Rollup */',
      ...bundleOptions,
    },
  },
];

rollupConfig.forEach((item) => {
  item.output = {
    indent: false,
    ...item.output,
    ...bundleOptions,
  };
});

module.exports = rollupConfig.map(({ input, output }) => ({
  ...input,
  output,
}));

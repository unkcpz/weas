const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'weas.mjs', // changed to .mjs extension
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'module' // set type as module
    },
    globalObject: 'this'
  },
  experiments: {
    outputModule: true // enable ECMAScript module output
  },
  // ... other configurations like module rules for Babel, plugins, etc.
};


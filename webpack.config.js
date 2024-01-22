const path = require('path');

module.exports = {
  entry: './src/index.js', // module's entry point
  output: {
    filename: 'jsae.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'jsae',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  // Add babel-loader, plugins, and other configurations as needed
};


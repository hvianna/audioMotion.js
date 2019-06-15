const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    filename: 'audioMotion.js',
    path: path.resolve( __dirname, 'public' )
  }
};

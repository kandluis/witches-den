var webpack = require('webpack');

module.exports = {
    context: __dirname + '/app',
    entry: {
        app: './app.js',
        vendor: ['angular', 'angular-route']
    },
    output: {
        path: __dirname + '/app/static',
        filename: '[name].bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components|d3.js|parse.js)/,
                loader: 'babel-loader',
                query: {
                    compact: false
                }
            }
        ]
    }
};

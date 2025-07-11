
const path = require('path');

module.exports = {
    mode: 'production',
    entry: './canvasPlot.js', // 入口文件路径
    output: {
        filename: 'canvasPlot.min.js', // 输出.min.js
        path: path.resolve(__dirname, './'),
    }
};
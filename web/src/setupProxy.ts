// 模块化环境是commonjs规范  webpack devServer配置环境
// 此文件修改需要重启开发环境

// 起别名
import {createProxyMiddleware as proxy} from 'http-proxy-middleware'

export default function(app: any) {
    // /api 表示代理路径
    // target 表示目标服务器的地址
    app.use(
        proxy('/api', {
            // http://localhost:4000/ 地址只是示例，实际地址以项目为准
            target: 'https://testwallet.cyberpop.online',
            // 跨域时一般都设置该值 为 true
            changeOrigin: true,
            // 重写接口路由
            pathRewrite: {
                '^/api': '' // 这样处理后，最终得到的接口路径为： http://localhost:8080/xxx
            }
        })
    )
}
# WalletConnect Example Dapp

# 个人记录的注意事项
1. 必须要翻墙执行npm i 否则会提示TypeError: Cannot read properties of undefined (reading 'importKey')， 但是后来证实跟这个无关，而是 2 条件导致的
2. 使用 localhost就不会报错，使用http://192.168.31.171:3001/这种ipv4的去访问他就会报错
3. 标准签名不会Access-Control-Allow-Origin错误，但是personal会跨域。-- 后来发现还是跟localhost有关


## Develop

```bash
npm run start
```

## Test

```bash
npm run test
```

## Build

```bash
npm run build
```

import WalletConnect from "@walletconnect/client"
import { getAppControllers } from "./controllers"
import { DEFAULT_CHAIN_ID } from "./constants/default"
import { getRpcEngine } from "./engines"
import { IAppState } from "./helpers/types"

import express from "express"
import mysql from 'mysql';
const app = express()

var db = mysql.createConnection({
  host    : 'localhost',
  user    : 'root',
  password: '12345678',
  port    : 3306,
  database: 'test'
});

db.connect((err) => {
  if(err) console.log(err);
  console.log('connect ok');
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.send('hello world')
})
app.get("/test", (req, res) => {
  let sql = 'SELECT * FROM `cyberpop-key`';
  console.log(sql);
  db.query(sql, (err, result) => {
    if(err){
      console.log('err:', err);
    }else{
      // console.log(result);
      res.send(result);
    }
  })
})

app.post('/init', async (req, res) => {
  const uri = req.body.uri
  console.log(req.body)
  const connector = new WalletConnect({ uri })
  // console.log(connector);
  
  if (!connector.connected) {
    await connector.createSession()
  }
  InitState.connector = connector;
  await subscribeToEvents(connector)
  res.send('done')
})


// async function main() {
//   const uri = "wc:64c54d01-5578-4dc4-8c8f-4cd6219e12d4@1?bridge=https%3A%2F%2Ft.bridge.walletconnect.org&key=cb2d677406daaac69ef9a185f568471878b5ae59d80fc0cb095278eb387f4922"
//   const connector = new WalletConnect({ uri })
//   if (!connector.connected) {
//     await connector.createSession()
//   }
//   await subscribeToEvents(connector)
// }

const InitState: IAppState = {
  loading: false,
  scanner: false,
  connector: null,
  uri: "",
  peerMeta: {
    description: "",
    url: "",
    icons: [],
    name: "",
    ssl: false,
  },
  connected: false,
  chainId: DEFAULT_CHAIN_ID,
  accounts: [],
  address: "",
  activeIndex: 0,
  requests: [],
  results: [],
  payload: null,
}

const subscribeToEvents = async (connector: WalletConnect) => {
  InitState.connector = connector
  connector.on("session_request", async (error, payload) => {
    console.log('session request')
    console.log(JSON.stringify(payload), 'seesion-payload');
    
    if (error) {
      throw error;
    }

    const { peerMeta } = payload.params[0]  // 同等元, wc相关的
    console.log(peerMeta, 'peerMeta');  // 这里只有元数据 没有用户相关的
    const accounts = await getAppControllers().wallet.getAccounts()
    console.log(accounts, 'accounts');
    
    const address = accounts[0]
    const chainId = DEFAULT_CHAIN_ID;
    connector.approveSession({ chainId, accounts: [address] })
  })

  connector.on("session_update", error => {
    console.log("EVENT", "session_update");

    if (error) {
      throw error;
    }
  });

  connector.on("call_request", async (error, payload) => {
    // tslint:disable-next-line
    console.log("EVENT", "call_request", "method", payload.method);
    console.log("EVENT", "call_request", "params", payload.params);

    if (error) {
      throw error;
    }

    await getRpcEngine().router(payload, InitState);
  });

  connector.on("connect", (error, payload) => {
    console.log("EVENT", "connect");
    console.log(JSON.stringify(payload), 'connect-payload');
    
    if (error) {
      throw error;
    }
    InitState.connected = true
  });

  connector.on("disconnect", (error, payload) => {
    console.log("EVENT", "disconnect");

    if (error) {
      throw error;
    }
    InitState.connected = false
  });

  //   if (connector.connected) {
  //     const { chainId, accounts } = connector;
  //     const index = 0;
  //     const address = accounts[index];
  //     getAppControllers().wallet.update(index, chainId);
  //     this.setState({
  //       connected: true,
  //       address,
  //       chainId,
  //     });
  //   }

  //   this.setState({ connector });
  // }
}

// main()

// 防止长时间不调用接口断开mysql连接
setInterval(() => {
  console.log('ping...');
  db.ping((err) => {
      if (err) {
          console.log('ping error: ' + JSON.stringify(err));
          db.connect((err) => {
            if(err) console.log(err);
            console.log('连接数据库ok');
          })
      }
  });
}, 1000 * 60 * 10);

let port = 3004
app.listen(port, () => {
  console.log(`listening on port ${port}`)
})
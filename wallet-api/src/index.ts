import express from "express"
import WalletConnect from "@walletconnect/client"
import { getAppControllers } from "./controllers"
import { DEFAULT_CHAIN_ID } from "./constants/default"

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.send('hello world')
})

app.post('/init', async (req, res) => {
  const uri = req.body.uri
  console.log(req.body)
  const connector = new WalletConnect({ uri })
  if (!connector.connected) {
    await connector.createSession()
  }
  await subscribeToEvents(connector)
  res.send('done')
})

const subscribeToEvents = async (connector: WalletConnect) => {
  connector.on("session_request", async (error, payload) => {
    console.log('session request')
    if (error) {
      throw error;
    }

    // const { peerMeta } = payload.params[0]
    const accounts = await getAppControllers().wallet.getAccounts()
    const address = accounts[0]
    const chainId = DEFAULT_CHAIN_ID;
    connector.approveSession({ chainId, accounts: [address] })
  })
}

app.listen(3003, () => {
  console.log('listening on port 3003')
})

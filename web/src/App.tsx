import * as React from "react";
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";
import copy from "copy-to-clipboard";
// import WalletConnectProvider from "@walletconnect/web3-provider"; // 加入我们自己的infuraId
// import { convertUtf8ToHex } from "@walletconnect/utils";
import { IInternalEvent } from "@walletconnect/types";
import { apiGetAccountAssets, apiGetGasPrices, apiGetAccountNonce } from "./helpers/api"; // 操作方法
import {
  sanitizeHex,
  verifySignature,
  hashTypedDataMessage,
  hashMessage,
} from "./helpers/utilities";
import { convertAmountToRawNumber, convertStringToHex } from "./helpers/bignumber";
import { IAssetData } from "./helpers/types";
import AccountAssets from "./components/AccountAssets";
import { eip712 } from "./helpers/eip712";
import styles from './components/styles/style'
const { SLayout, SContent, SLanding, SButtonContainer, SConnectButton, SContainer, SModalContainer, SModalTitle, Column,
  SModalParagraph, SBalances, STable, SRow, SKey, SValue, STestButtonContainer, STestButton, Modal, Header, Loader, Banner } = styles;

interface IAppState {
  connector: WalletConnect | null;
  fetching: boolean;
  connected: boolean;
  chainId: number;
  showModal: boolean;
  pendingRequest: boolean;
  uri: string;
  accounts: string[];
  address: string;
  result: any;
  assets: IAssetData[];
  urldata: any;  // url参数
  mobileType: any; // 手机类型
  myModal: boolean; // 是否授权完毕
  modalTitle: string;// 弹窗提示title
  modalCentent: string;
  accountsInfo: any;
}

const INITIAL_STATE: IAppState = {
  connector: null,
  fetching: false,
  connected: false,
  chainId: 80001,  // 默认使用mumbai的设置
  showModal: false,
  pendingRequest: false,
  uri: "",
  accounts: [],
  address: "",
  result: null,
  assets: [],
  urldata: null,
  mobileType: '', // 默认安卓机型
  myModal: false,
  modalTitle: "",
  modalCentent: "",
  accountsInfo: "", // 账户信息
};

class App extends React.Component<any, any> {
  public state: IAppState = {
    ...INITIAL_STATE,
  };

  // 解析url参数
  public url = (variable: any) => {
    const query = window.location.search.substring(1);
    const vars = query.split("&");
    for (let i = 0; i < vars.length; i++) {
      const pair: any = vars[i].split("=");
      if (pair[0] === variable) {
        return pair[1];
      }
    }
    return (false);
  }

  public get = (url: string, uri: string) => {
    fetch(url, {
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'no-cors', // no-cors, cors, *same-origin
      body: "uri=" + encodeURIComponent(uri)
    })
    .then(response => console.log(response))
    .then( data => console.log(data))
  }

  public post = async (url: string, uri: string): Promise<any> => {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: "uri=" + encodeURIComponent(uri)
    })
    return response;
    // return await response.json()
  }

  public connectCyberPop = async () => {
    const bridge = "https://bridge.walletconnect.org";
    const connector = new WalletConnect({ bridge });
    this.setState({ connector })
    console.log('当前session链接状态：', connector.connected);
    if (!connector.connected) {
      // 创建新会话
      await connector.createSession();
      const uri = connector.uri;
      this.setState({ uri });
      // await this.post("https://testwallet.cyberpop.online/init", uri)  // 创建seesion，然后node端自动连接这个会话
      let result: any = await this.post("http://127.0.0.1:3004/init", uri)
      console.log(result);
      localStorage.setItem('uri', uri)
    } else {
      if (connector.connected) {
        const { chainId, accounts } = connector;
        const address = accounts[0];
        this.setState({
          connected: true,
          chainId,
          accounts,
          address,
        });
        this.onSessionUpdate(accounts, chainId);
      }
    }
    await this.subscribeToEvents();
  }

  public connect = async () => {
    if (navigator.userAgent.match(/(iPhone|iPod|ios|iOS|iPad)/i)) {
      this.setState({ mobileType: 'iPhone' })
    } else {
      this.setState({ mobileType: 'android' })
    }

    const urldata = JSON.stringify(this.url('msg'))
    // 桥接 url
    const bridge = "https://bridge.walletconnect.org";

    // 创建新连接器
    const connector = new WalletConnect({ bridge, qrcodeModal: QRCodeModal });

    await this.setState({ connector, urldata });

    // console.log(killSession);
    console.log(connector.connected);
    // 检查是否已经连接
    if (!connector.connected) {
      // 创建新会话
      await connector.createSession();
    }

    // 订阅连接事件 
    connector.on("connect", (error, payload) => {
      if (error) {
        throw error;
      }
      const { mobileType } = this.state;

      console.log(payload);
      this.post('http://127.0.0.1:3004/init', connector?.uri)
      return; // 自动签名
      setTimeout(() => {
        console.log('you media:', mobileType);
        if (mobileType === 'android') { // 如果是安卓使用personal签名
          this.testPersonalSignMessage();
          return;
        }
        this.testStandardSignMessage();  // 如果是苹果用标准化签名
      }, 2000);
    });

    // subscribe to events
    await this.subscribeToEvents();
  };
  public subscribeToEvents = () => {
    const { connector } = this.state;

    if (!connector) {
      return;
    }

    connector.on("session_update", async (error, payload) => {
      console.log(`connector.on("session_update")`);

      if (error) {
        throw error;
      }

      const { chainId, accounts } = payload.params[0];
      this.onSessionUpdate(accounts, chainId);
    });

    connector.on("connect", (error, payload) => {
      console.log(`connector.on("connect")`);

      if (error) {
        throw error;
      }

      this.onConnect(payload);
    });

    connector.on("disconnect", (error, payload) => {
      console.log(`connector.on("disconnect")`);

      if (error) {
        throw error;
      }

      this.onDisconnect();
    });

    if (connector.connected) {
      const { chainId, accounts } = connector;
      const address = accounts[0];
      this.setState({
        connected: true,
        chainId,
        accounts,
        address,
      });
      this.onSessionUpdate(accounts, chainId);
    }

    this.setState({ connector });
  };

  public killSession = async () => {
    const { connector } = this.state;
    if (connector) {
      connector.killSession();
    }
    this.resetApp();
  };

  public resetApp = async () => {
    await this.setState({ ...INITIAL_STATE });
  };

  public onConnect = async (payload: IInternalEvent) => {
    const { chainId, accounts } = payload.params[0];
    const address = accounts[0];
    await this.setState({
      connected: true,
      chainId,
      accounts,
      address,
    });
    this.getAccountAssets();
  };

  public onDisconnect = async () => {
    this.resetApp();
  };

  public onSessionUpdate = async (accounts: string[], chainId: number) => {
    const address = accounts[0];
    await this.setState({ chainId, accounts, address });
    await this.getAccountAssets();
  };

  public getAccountAssets = async () => {
    const { address, chainId } = this.state;
    this.setState({ fetching: true });
    try {
      // get account balances
      const assets = await apiGetAccountAssets(address, chainId);

      await this.setState({ fetching: false, address, assets });
    } catch (error) {
      console.error(error);
      await this.setState({ fetching: false });
    }
  };

  // 切换
  public toggleModal = (type?: any) => {
    if (type) {
      this.setState({
        myModal: !this.state.myModal,
      });
    } else {
      this.setState({
        showModal: !this.state.showModal
      });
    }
  }

  public testSendTransaction = async () => {
    const { connector, address, chainId } = this.state;

    if (!connector) {
      return;
    }

    // from
    const from = address;

    // to
    const to = address;

    // nonce
    const _nonce = await apiGetAccountNonce(address, chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    const _gasPrice = gasPrices.slow.price;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // gasLimit
    const _gasLimit = 21000;
    const gasLimit = sanitizeHex(convertStringToHex(_gasLimit));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // data
    const data = "0x";

    // test transaction
    const tx = {
      from,
      to,
      nonce,
      gasPrice,
      gasLimit,
      value,
      data,
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send transaction
      const result = await connector.sendTransaction(tx);

      // format displayed result
      const formattedResult = {
        method: "eth_sendTransaction",
        txHash: result,
        from: address,
        to: address,
        value: `${_value} ETH`,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public testSignTransaction = async () => {
    const { connector, address, chainId } = this.state;

    if (!connector) {
      return;
    }

    // from
    const from = address;

    // to
    const to = address;

    // nonce
    const _nonce = await apiGetAccountNonce(address, chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    const _gasPrice = gasPrices.slow.price;
    const gasPrice = sanitizeHex(convertStringToHex(convertAmountToRawNumber(_gasPrice, 9)));

    // gasLimit
    const _gasLimit = 21000;
    const gasLimit = sanitizeHex(convertStringToHex(_gasLimit));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // data
    const data = "0x";

    // test transaction
    const tx = {
      from,
      to,
      nonce,
      gasPrice,
      gasLimit,
      value,
      data,
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send transaction
      const result = await connector.signTransaction(tx);

      // format displayed result
      const formattedResult = {
        method: "eth_signTransaction",
        from: address,
        to: address,
        value: `${_value} ETH`,
        result,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public testLegacySignMessage = async () => {
    const { connector, address, chainId } = this.state;

    if (!connector) {
      return;
    }

    // test message
    const message = `My email is john@doe.com - ${new Date().toUTCString()}`;

    // hash message
    const hash = hashMessage(message);

    // eth_sign params
    const msgParams = [address, hash];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send message
      const result = await connector.signMessage(msgParams);

      // verify signature
      const valid = await verifySignature(address, result, hash, chainId);

      // format displayed result
      const formattedResult = {
        method: "eth_sign (legacy)",
        address,
        valid,
        result,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public testStandardSignMessage = async () => {
    const { connector, address, chainId, urldata } = this.state;

    if (!connector) {
      return;
    }
    // encode message (hex)
    // const hexMsg = convertUtf8ToHex(message);

    // eth_sign params
    const msgParams = [address, urldata];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send message
      const result = await connector.signMessage(msgParams);

      // verify signature
      const hash = hashMessage(urldata); // bufferToHex加密
      const valid = await verifySignature(address, result, hash, chainId);

      // format displayed result
      const formattedResult = {
        method: "eth_sign (standard)",
        address,
        valid,
        result,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public testPersonalSignMessage = async () => {
    const { connector, address, chainId, urldata } = this.state;

    if (!connector) {
      return;
    }

    // const hexMsg = convertUtf8ToHex(message);

    // eth_sign params
    const msgParams = [urldata, address];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send message
      const result = await connector.signPersonalMessage(msgParams);

      // verify signature
      const hash = hashMessage(urldata); // bufferToHex加密
      const valid = await verifySignature(address, result, hash, chainId);

      // format displayed result
      const formattedResult = {
        method: "personal_sign",
        address,
        valid,
        result,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });

      window.location.href = `unitydl://cyberpop?sig=${result}&address=${address}`;
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public testSignTypedData = async () => {
    const { connector, address, chainId } = this.state;

    if (!connector) {
      return;
    }

    const message = JSON.stringify(eip712.example);

    // eth_signTypedData params
    const msgParams = [address, message];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // sign typed data
      const result = await connector.signTypedData(msgParams);

      // verify signature
      const hash = hashTypedDataMessage(message);
      const valid = await verifySignature(address, result, hash, chainId);

      // format displayed result
      const formattedResult = {
        method: "eth_signTypedData",
        address,
        valid,
        result,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public backGame = () => {
    const { result } = this.state;
    window.location.href = `unitydl://cyberpop?sig=${result.result}&address=${result.address}`;
  }

  public copySign = (text: any) => {
    const { myModal } = this.state;
    if (text) {
      copy(JSON.stringify(text))
      this.setState({
        modalTitle: 'Copy successful!',
        modalCentent: 'Copy succeeded, please return to the game',
        myModal: !myModal,
      })
    } else {
      this.setState({
        modalTitle: 'pleast sign!',
        modalCentent: 'You need to authorize first',
        myModal: !myModal,
      })
    }
  }

  public exportKey = async () => {
    const { myModal } = this.state;
    // const key: any = await this.post('http://127.0.0.1:3004/getPrivate', uri);
    const result: any = await fetch('http://127.0.0.1:3004/getPrivate', {
        method: 'post',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: "uri=" + encodeURIComponent(uri)
    })
    const temp = await result.json();
    console.log(temp);
    
    // const result = await key.json();
    // console.log(result);
    this.setState({
      modalTitle: 'this is your accounts key!',
      modalCentent: 'please save the key!',
      myModal: !myModal,
    })
  }

  public render = () => {
    const {
      assets,
      address,
      connected,
      chainId,
      fetching,
      showModal,
      pendingRequest,
      result,
      myModal,
      mobileType,
      modalCentent,
      modalTitle,
      accountsInfo,
    } = this.state;
    return (
      <SLayout>
        <Column maxWidth={1000} spanHeight>
          <Header
            connected={connected}
            address={address}
            chainId={chainId}
            killSession={this.killSession}
          />
          <SContent>
            {!address && !assets.length ? (
              <SLanding center>
                <h3>
                  {`Try out WalletConnect`}
                  <br />
                  <span>{`v${process.env.REACT_APP_VERSION}`}</span>
                </h3>
                <SButtonContainer>
                  <SConnectButton left onClick={this.connect} fetching={fetching}>
                    {"Connect to WalletConnect"}
                  </SConnectButton>
                </SButtonContainer>
                <SButtonContainer>
                  <SConnectButton onClick={this.connectCyberPop} fetching={fetching}>
                    Connect to CyberPop Wallet
                  </SConnectButton>
                </SButtonContainer>
              </SLanding>
            ) : (
              <SBalances>
                <Banner />
                <h3>Actions</h3>
                <Column center>
                  <STestButtonContainer>
                    {/* <STestButton left onClick={this.testSendTransaction}>
                      {"eth_sendTransaction"}
                    </STestButton>
                    <STestButton left onClick={this.testSignTransaction}>
                      {"eth_signTransaction"}
                    </STestButton>
                    <STestButton left onClick={this.testSignTypedData}>
                      {"eth_signTypedData"}
                    </STestButton> */}
                    {/* <STestButton left onClick={this.testLegacySignMessage}>
                      {"eth_sign (legacy)"}
                    </STestButton> */}
                    <STestButton left>
                      {"Your phone type: " + mobileType}
                    </STestButton>
                    {
                      mobileType === 'iPhone' ? (
                        <STestButton left onClick={this.testStandardSignMessage}>
                          {"eth_sign (standard)" + mobileType}
                        </STestButton>
                      ) : (
                        <STestButton left onClick={this.testPersonalSignMessage}>
                          {"personal_sign"}
                        </STestButton>
                      )
                    }
                    <STestButton left onClick={this.backGame}>
                      {"back game (安卓手机)"}
                    </STestButton>
                    <STestButton left onClick={() => this.copySign(result)}>
                      {" copy "}
                    </STestButton>
                    <STestButton left onClick={this.exportKey}>
                      {" export key "}
                    </STestButton>
                  </STestButtonContainer>
                </Column>
                <h3>Balances</h3>
                {!fetching ? (
                  <AccountAssets chainId={chainId} assets={assets} />
                ) : (
                  <Column center>
                    <SContainer>
                      <Loader />
                    </SContainer>
                  </Column>
                )}
              </SBalances>
            )}
          </SContent>
        </Column>
        <Modal show={showModal} toggleModal={this.toggleModal}>
          {pendingRequest ? (
            <SModalContainer>
              <SModalTitle>{"Pending Call Request"}</SModalTitle>
              <SContainer>
                <Loader />
                <SModalParagraph>{"Approve or reject request using your wallet"}</SModalParagraph>
              </SContainer>
            </SModalContainer>
          ) : result ? (
            <SModalContainer>
              <SModalTitle>{"Call Request Approved"}</SModalTitle>
              <STable>
                {Object.keys(result).map(key => (
                  <SRow key={key}>
                    <SKey>{key}</SKey>
                    <SValue>{result[key].toString()}</SValue>
                  </SRow>
                ))}
              </STable>
            </SModalContainer>
          ) : (
            <SModalContainer>
              <SModalTitle>{"Call Request Rejected"}</SModalTitle>
            </SModalContainer>
          )}
        </Modal>
        <Modal show={myModal} toggleModal={() => this.toggleModal(1)}>
          <SModalContainer>
            <SModalTitle>{ modalTitle }</SModalTitle>
            <SContainer>
              <SModalParagraph>{ modalCentent }</SModalParagraph>
              <SModalParagraph>{ accountsInfo.key }</SModalParagraph>
              <STestButton left onClick={() => this.copySign(accountsInfo.key)}>
                  {" copy "}
              </STestButton>
            </SContainer>
          </SModalContainer>
        </Modal>
      </SLayout>
    );
  };
}

export default App;

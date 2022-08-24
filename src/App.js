import { useEffect, useState } from 'react';
import Web3 from 'web3';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import axios from 'axios';

import { contractABI } from './contractABI';

import './App.css';

const smartContractAddress = '0x9d9fA9DbAe391C3FB6866F43De62FF3B393133b2';
const xClubWalletAddress = '0x007a86bb3a8649590e84013dc62900632a8ec89f';
const binancePegETHTokenAddress = '0x2170ed0880ac9a755fd29b2688956bd959f933f8';

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider,
    display: {
      name: "WalletConnect",
      description: ""
    },
    options: {
      rpc: {
        56: 'https://bsc-dataseed.binance.org/'
      },
      network:'binance'
    }
  },
};

const web3Modal = new Web3Modal({
  cacheProvider: true, // optional
  providerOptions, // required
  // disableInjectedProvider: false, // optional, For MetaMask / Brave / Opera.
  theme: {
    background: "rgb(39, 49, 56)",
    main: "rgb(199, 199, 199)",
    secondary: "rgb(136, 136, 136)",
    border: "rgba(195, 195, 195, 0.14)",
    hover: "rgb(16, 26, 32)"
  }
});

function App() {
  let [provider, setProvider] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [totalRewardsDistributed, setTotalRewardsDistributed] = useState(null);
  const [xClubWalletDividendsInfo, setXClubWalletDividendsInfo] = useState(null);
  const [binancePegETHPrice, setBinancePegETHPrice] = useState(0);
  const [userWalletDividendsInfo, setUserWalletDividendsInfo] = useState(0);

  async function init() {
    const web3 = new Web3(new Web3.providers.HttpProvider('https://bsc-dataseed1.binance.org/'));
    
    const ProXContract = new web3.eth.Contract(contractABI, smartContractAddress);
  
    setTotalRewardsDistributed(await ProXContract.methods.getTotalDividendsDistributed().call());
    setXClubWalletDividendsInfo(await ProXContract.methods.getAccountDividendsInfo(xClubWalletAddress).call());
    setBinancePegETHPrice(
      await axios
      .get(`https://api.coingecko.com/api/v3/simple/token_price/binance-smart-chain?contract_addresses=${binancePegETHTokenAddress}&vs_currencies=usd`)
      .then(res => res.data[binancePegETHTokenAddress].usd)
    );
  }

  const connectWallet = async () => {
    if(!walletConnected) {
      try {
        provider = await web3Modal.connect();
        setProvider(provider);
        // Subscribe to accounts change
        provider.on("accountsChanged", (accounts) => {
          fetchAccountData();
        });
        console.log('provider chain changed')
        // Subscribe to chainId change
        provider.on("chainChanged", (chainId) => {
          fetchAccountData();
        });
        console.log('provider network changed')
        // Subscribe to networkId change
        provider.on("networkChanged", (networkId) => {
          fetchAccountData();
        });
        setWalletConnected(true);
        await refreshAccountData();
      } catch(e) {
        console.log("Could not get a wallet connection", e);
        return;
      }
    } else {
      setWalletConnected(!walletConnected);
      await Disconnect();
    }
  }

  async function claim() {
    if(typeof window.ethereum === 'undefined') {
      console.log("Please install the MetaMask");
    } else {
      if(walletConnected) {
        let web3 = new Web3(provider);
  
        const chainId = await web3.eth.getChainId();
        if(chainId === 56) {
          const ProXContract = new web3.eth.Contract(contractABI, smartContractAddress);

          const accounts = await web3.eth.getAccounts();

          const claimRes = await ProXContract.methods.claim().send({from: accounts[0]});
          if (claimRes) {
            await refreshAccountData(); 
          }
        } else {
          console.log("Please select the Binance Smart Chain Network");
        }
      } else {
        console.log("Please connect wallet");
      }
    }
  }

  async function refreshAccountData() {
    console.log("refreshAccountData");
    await fetchAccountData(provider);
  }

  async function Disconnect() {
    if(provider.close) {
      await provider.close();
  
      await web3Modal.clearCachedProvider();
      setProvider(null);
    }
    setWalletConnected(false);
    setUserWalletDividendsInfo(0);
  }

  async function fetchAccountData() {
    let web3 = new Web3(provider);
  
    const chainId = await web3.eth.getChainId();
    if(chainId === 56) {
      const ProXContract = new web3.eth.Contract(contractABI, smartContractAddress);

      const accounts = await web3.eth.getAccounts();

      setUserWalletDividendsInfo(await ProXContract.methods.getAccountDividendsInfo(accounts[0]).call());
    } else {
      console.log("Please select the Binance Smart Chain Network");
    }
  }

  useEffect(()=>{
    init();
  }, []);

  return (
    <div className="App">
      <div className='dashboard'>
        <button
          onClick={() => connectWallet()}
          className="connect"
        >
          {walletConnected ? "Disconnect Wallet" : "Connect Wallet"}
        </button>
        <div>
          <p>Total Rewards Distributed:</p>
          <p>{Number(totalRewardsDistributed / Math.pow(10, 18)).toFixed(2)} ETH</p>
        </div>
        <div>
          <p>Total Rewards Distributed USD:</p>
          <p>~$ {Number(totalRewardsDistributed / Math.pow(10, 18) * binancePegETHPrice).toFixed(2)}</p>
        </div>
        <div className='paragraph'></div>
        <div>
          <p>Total Rewards Distributed To XClub Wallet:</p>
          <p>{xClubWalletDividendsInfo ? Number(xClubWalletDividendsInfo[4] / Math.pow(10, 18)).toFixed(2) + " ETH" : ""}</p>
        </div>
        <div>
          <p>Total Rewards Distributed To XClub Wallet USD:</p>
          <p>{xClubWalletDividendsInfo ? "~$ " + Number(xClubWalletDividendsInfo[4] / Math.pow(10, 18) * binancePegETHPrice).toFixed(2) : ""}</p>
        </div>
        <div className='paragraph'></div>
        <div>
          <p>Total Rewards Distributed To User Wallet:</p>
          <p>{userWalletDividendsInfo ? Number(userWalletDividendsInfo[4] / Math.pow(10, 18)).toFixed(2) + " ETH" : ""}</p>
        </div>
        <div>
          <p>Total Rewards Distributed To User Wallet USD:</p>
          <p>{userWalletDividendsInfo ? "~$ " + Number(userWalletDividendsInfo[4] / Math.pow(10, 18) * binancePegETHPrice).toFixed(2) : ""}</p>
        </div>
        <div>
          <p>User Dividend Claimable:</p>
          <p>{userWalletDividendsInfo ? Number(userWalletDividendsInfo[3] / Math.pow(10, 18)).toFixed(2) + " ETH" : ""}</p>
        </div>
        <div>
          <p>User Dividend Claimable USD:</p>
          <p>{userWalletDividendsInfo ? "~$ " + Number(userWalletDividendsInfo[3] / Math.pow(10, 18) * binancePegETHPrice).toFixed(2) : ""}</p>
        </div>
        <button
          onClick={() => claim()}
          className="claim"
        >
          Claim {userWalletDividendsInfo ? "~$ " + Number(userWalletDividendsInfo[3] / Math.pow(10, 18) * binancePegETHPrice).toFixed(2) : ""}
        </button>
      </div>
    </div>
  );
}

export default App;

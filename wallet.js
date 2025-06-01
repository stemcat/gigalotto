let web3;
let contract;
let userAccount;

const contractAddress = "0xF5aEA51f7fAaABe16Fd3c14Da9Fa90e223D41404";
const abi = [[
	{
		"inputs": [],
		"name": "deposit",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_priceFeed",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_vrfCoordinator",
				"type": "address"
			},
			{
				"internalType": "bytes32",
				"name": "_keyHash",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "_subscriptionId",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "have",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "want",
				"type": "address"
			}
		],
		"name": "OnlyCoordinatorCanFulfill",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"internalType": "uint256[]",
				"name": "randomWords",
				"type": "uint256[]"
			}
		],
		"name": "rawFulfillRandomWords",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "requestDraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "withdrawFees",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "withdrawIfWinner",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	},
	{
		"inputs": [],
		"name": "callbackGasLimit",
		"outputs": [
			{
				"internalType": "uint32",
				"name": "",
				"type": "uint32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "canDraw",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "collectedFees",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "entries",
		"outputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "cumulativeWeight",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "FEE_PERCENT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getEntriesCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "getEntry",
		"outputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "cumulative",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getJackpotUsd",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "holdStartTimestamp",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "keyHash",
		"outputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "last24hDepositUsd",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "last24hWindowStart",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "lastRequestId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MIN_24H_USD",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "priceFeed",
		"outputs": [
			{
				"internalType": "contract AggregatorV2V3Interface",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "requestConfirmations",
		"outputs": [
			{
				"internalType": "uint16",
				"name": "",
				"type": "uint16"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "subscriptionId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "TARGET_USD",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalPool",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "userDeposits",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "vrfCoordinator",
		"outputs": [
			{
				"internalType": "contract VRFCoordinatorV2Interface",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "winner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]];

export async function initWeb3() {
  if (window.ethereum) {
    try {
      web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      userAccount = accounts[0];
      contract = new web3.eth.Contract(abi, contractAddress);
      updateUI();
    } catch (e) {
      console.error("Web3 initialization error:", e);
      document.getElementById("status").innerText = "⚠️ Failed to connect: " + e.message;
    }
  } else {
    document.getElementById("status").innerText = "⚠️ MetaMask not found!";
  }
}

export async function connectAndDeposit() {
  if (!web3 || !contract) return;

  const ethAmount = document.getElementById("ethAmount").value;
  if (!ethAmount || parseFloat(ethAmount) <= 0) {
    document.getElementById("status").innerText = "⚠️ Enter a valid ETH amount";
    return;
  }

  try {
    const value = web3.utils.toWei(ethAmount, "ether");
    document.getElementById("status").innerText = "⏳ Sending transaction...";
    await contract.methods.deposit().send({ from: userAccount, value });
    document.getElementById("status").innerText = "✅ Deposit successful!";
    updateUI();
  } catch (e) {
    console.error("Deposit error:", e);
    document.getElementById("status").innerText = "⚠️ Deposit failed: " + e.message;
  }
}

export async function withdrawWinnings() {
  if (!contract || !userAccount) return;

  try {
    document.getElementById("status").innerText = "⏳ Processing withdrawal...";
    await contract.methods.withdrawIfWinner().send({ from: userAccount });
    document.getElementById("status").innerText = "✅ Withdrawal successful!";
    updateUI();
  } catch (e) {
    console.error("Withdrawal error:", e);
    document.getElementById("status").innerText = "⚠️ Withdrawal failed: " + e.message;
  }
}

export async function requestDraw() {
  if (!contract || !userAccount) return;

  try {
    document.getElementById("status").innerText = "⏳ Requesting draw...";
    await contract.methods.requestDraw().send({ from: userAccount });
    document.getElementById("status").innerText = "✅ Draw requested!";
    updateUI();
  } catch (e) {
    console.error("Draw error:", e);
    document.getElementById("status").innerText = "⚠️ Draw request failed: " + e.message;
  }
}

async function updateUI() {
  if (!contract || !userAccount) return;

  try {
    const deposit = await contract.methods.userDeposits(userAccount).call();
    document.getElementById("userDeposit").innerText = web3.utils.fromWei(deposit, "ether");

    document.getElementById("userAddress").innerText =
      `${userAccount.substring(0, 6)}...${userAccount.slice(-4)}`;
    document.getElementById("userDashboard").style.display = "block";

    const totalPool = await contract.methods.totalPool().call();
    const jackpotUsd = await contract.methods.getJackpotUsd().call();
    const targetUsd = await contract.methods.TARGET_USD().call();
    const last24hUsd = await contract.methods.last24hDepositUsd().call();

    const jackpotText = `${web3.utils.fromWei(totalPool, "ether")} ETH ($${(jackpotUsd / 1e8).toFixed(2)})`;
    document.getElementById("jackpot").innerHTML = `<strong>${jackpotText}</strong>`;
    document.getElementById("usd24h").innerText = `$${(last24hUsd / 1e8).toFixed(2)}`;

    const percent = (jackpotUsd / targetUsd) * 100;
    document.getElementById("progressFill").style.width = `${Math.min(percent, 100)}%`;

    updateHoldTimer();
    checkWinnerAndDraw();

  } catch (e) {
    console.error("UI update failed:", e);
    document.getElementById("status").innerText = "⚠️ UI update failed: " + e.message;
  }
}

async function updateHoldTimer() {
  try {
    const start = await contract.methods.holdStartTimestamp().call();
    if (parseInt(start) === 0) {
      document.getElementById("holdTimer").innerText = "Not reached";
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const diff = now - parseInt(start);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    document.getElementById("holdTimer").innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } catch (e) {
    console.error("Timer update failed:", e);
  }
}

async function checkWinnerAndDraw() {
  try {
    const winner = await contract.methods.winner().call();
    const statusDiv = document.getElementById("status");

    if (winner === userAccount) {
      statusDiv.innerHTML = '<div class="winner-banner">🎉 YOU ARE THE WINNER! 🎉</div>';
      document.getElementById("withdrawBtn").style.display = "inline-block";
    } else if (winner !== "0x0000000000000000000000000000000000000000") {
      statusDiv.innerHTML = `🏆 Winner: ${winner.substring(0, 6)}...${winner.slice(-4)}`;
    } else {
      statusDiv.innerHTML = "<p>Waiting for the next winner...</p>";
    }

    const canDraw = await contract.methods.canDraw().call();
    if (canDraw) {
      statusDiv.innerHTML += "<p>The draw conditions are met! 🎯</p>";
      document.getElementById("requestDrawBtn").style.display = "inline-block";
    }
  } catch (e) {
    console.error("Winner/draw check failed:", e);
  }
}

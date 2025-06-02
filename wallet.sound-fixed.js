import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

let provider;
let signer;
let contract;
let userAccount;

const contractAddress = "0xF5aEA51f7fAaABe16Fd3c14Da9Fa90e223D41404";

// ✅ Paste your ABI below:
const abi = [ [
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
] ];

export async function initWeb3() {
  if (!window.ethereum) {
    document.getElementById("status").innerText = "⚠️ Please install MetaMask.";
    return;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAccount = await signer.getAddress();
    contract = new ethers.Contract(contractAddress, abi, signer);
    updateUI();
  } catch (e) {
    console.error("Init error:", e);
    document.getElementById("status").innerText = "⚠️ Connection failed.";
  }
}

export async function connectAndDeposit() {
  const ethAmount = document.getElementById("ethAmount").value;

  // 🔓 Unlock sound immediately on user click (not after async/await)
  const coinSound = document.getElementById("coinSound");
  if (coinSound) {
    coinSound.muted = true;
    coinSound.play().then(() => {
      coinSound.pause();
      coinSound.currentTime = 0;
      coinSound.muted = false;
      console.log("🔓 Sound unlocked");
    }).catch((err) => {
      console.warn("⚠️ Sound unlock failed:", err);
    });
  }

  if (!ethAmount || parseFloat(ethAmount) <= 0) {
    document.getElementById("status").innerText = "⚠️ Enter a valid ETH amount.";
    return;
  }

  try {
    document.getElementById("status").innerText = "⏳ Sending transaction...";
    const tx = await contract.deposit({ value: ethers.parseEther(ethAmount) });
    await tx.wait();
    document.getElementById("status").innerText = "✅ Deposit successful!";

    // ✅ Play actual sound now
    if (coinSound) coinSound.play();

    const burst = document.createElement("div");
    burst.className = "coin-burst";
    burst.innerText = "🪙🪙🪙";
    document.body.appendChild(burst);
    setTimeout(() => document.body.removeChild(burst), 800);

    const modal = document.getElementById("shareModal");
    if (modal?.showModal) modal.showModal();

    updateUI();
  } catch (e) {
    console.error("Deposit error:", e);
    document.getElementById("status").innerText = "⚠️ Deposit failed: " + e.message;
  }
}

export async function withdrawWinnings() {
  try {
    document.getElementById("status").innerText = "⏳ Withdrawing...";
    const tx = await contract.withdrawIfWinner();
    await tx.wait();
    document.getElementById("status").innerText = "✅ Withdrawal complete!";
    updateUI();
  } catch (e) {
    console.error("Withdraw error:", e);
    document.getElementById("status").innerText = "⚠️ Withdraw failed: " + e.message;
  }
}

export async function requestDraw() {
  try {
    document.getElementById("status").innerText = "⏳ Requesting draw...";
    const tx = await contract.requestDraw();
    await tx.wait();
    document.getElementById("status").innerText = "✅ Draw requested!";
    updateUI();
  } catch (e) {
    console.error("Draw error:", e);
    document.getElementById("status").innerText = "⚠️ Draw failed: " + e.message;
  }
}

async function updateUI() {
  if (!contract || !userAccount) return;

  try {
    const deposit = await contract.userDeposits(userAccount);
    document.getElementById("userDeposit").innerText = ethers.formatEther(deposit);

    document.getElementById("userAddress").innerText = `${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`;
    document.getElementById("userDashboard").style.display = "block";

    const totalPool = await contract.totalPool();
    const jackpotUsd = await contract.getJackpotUsd();
    const targetUsd = await contract.TARGET_USD();
    const last24hUsd = await contract.last24hDepositUsd();

    document.getElementById("jackpot").innerHTML =
      `<strong>${ethers.formatEther(totalPool)} ETH</strong> ($${(Number(jackpotUsd) / 1e8).toFixed(2)})`;
    document.getElementById("usd24h").innerText = `$${(Number(last24hUsd) / 1e8).toFixed(2)}`;

    const percent = (jackpotUsd * 100n) / targetUsd;
    document.getElementById("progressFill").style.width = `${Math.min(Number(percent), 100)}%`;

    updateHoldTimer();
    checkWinnerAndDraw();
  } catch (e) {
    console.error("UI update failed:", e);
  }
}

async function updateHoldTimer() {
  try {
    const start = await contract.holdStartTimestamp();
    const s = Number(start);
    if (s === 0) {
      document.getElementById("holdTimer").innerText = "Not reached";
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const diff = now - s;
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const sec = diff % 60;
    document.getElementById("holdTimer").innerText = 
      `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  } catch (e) {
    console.error("Timer error:", e);
  }
}

async function checkWinnerAndDraw() {
  try {
    const winner = await contract.winner();
    const canDraw = await contract.canDraw();
    const statusDiv = document.getElementById("status");

    if (winner === userAccount) {
      statusDiv.innerHTML = '<div class="winner-banner">🎉 YOU ARE THE WINNER! 🎉</div>';
      document.getElementById("withdrawBtn").style.display = "inline-block";
    } else if (winner !== "0x0000000000000000000000000000000000000000") {
      statusDiv.innerHTML = `<p>🏆 Winner: ${winner.slice(0, 6)}...${winner.slice(-4)}</p>`;
    } else {
      statusDiv.innerHTML = `<p>Waiting for winner...</p>`;
    }

    if (canDraw) {
      statusDiv.innerHTML += `<p>The draw conditions are met! 🎯</p>`;
      document.getElementById("requestDrawBtn").style.display = "inline-block";
    }
  } catch (e) {
    console.error("Winner check failed:", e);
  }
}

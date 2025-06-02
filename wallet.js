import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

let provider;
let signer;
let contract;
let userAccount;

const contractAddress = "0x9921e7B46EC46AbFcF4CE531688E79c8862604Fa";

const abi = [
  [
    {
      inputs: [],
      name: "deposit",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_priceFeed",
          type: "address",
        },
        {
          internalType: "address",
          name: "_vrfCoordinator",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "_keyHash",
          type: "bytes32",
        },
        {
          internalType: "uint256",
          name: "_subscriptionId",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "have",
          type: "address",
        },
        {
          internalType: "address",
          name: "want",
          type: "address",
        },
      ],
      name: "OnlyCoordinatorCanFulfill",
      type: "error",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "winner",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "JackpotClaimed",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "depositor",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "NewDeposit",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "previousOwner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnershipTransferred",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "requestId",
          type: "uint256",
        },
        {
          internalType: "uint256[]",
          name: "randomWords",
          type: "uint256[]",
        },
      ],
      name: "rawFulfillRandomWords",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "renounceOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "requestDraw",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "transferOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "winner",
          type: "address",
        },
      ],
      name: "WinnerSelected",
      type: "event",
    },
    {
      inputs: [],
      name: "withdrawFees",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "withdrawIfWinner",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      stateMutability: "payable",
      type: "receive",
    },
    {
      inputs: [],
      name: "callbackGasLimit",
      outputs: [
        {
          internalType: "uint32",
          name: "",
          type: "uint32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "canDraw",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "collectedFees",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "entries",
      outputs: [
        {
          internalType: "address",
          name: "user",
          type: "address",
        },
        {
          internalType: "uint96",
          name: "cumulativeWeight",
          type: "uint96",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "FEE_PERCENT",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getEntriesCount",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "index",
          type: "uint256",
        },
      ],
      name: "getEntry",
      outputs: [
        {
          internalType: "address",
          name: "user",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "cumulative",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getJackpotUsd",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "count",
          type: "uint256",
        },
      ],
      name: "getTopDepositors",
      outputs: [
        {
          internalType: "address[]",
          name: "",
          type: "address[]",
        },
        {
          internalType: "uint256[]",
          name: "",
          type: "uint256[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getVerifiedPrice",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "holdStartTimestamp",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "keyHash",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "last24hDepositUsd",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "last24hWindowStart",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "lastRequestId",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "MIN_24H_USD",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "priceFeed",
      outputs: [
        {
          internalType: "contract AggregatorV2V3Interface",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "requestConfirmations",
      outputs: [
        {
          internalType: "uint16",
          name: "",
          type: "uint16",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "STALE_PRICE_THRESHOLD",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "subscriptionId",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "TARGET_USD",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalPool",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "userDeposits",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "vrfCoordinator",
      outputs: [
        {
          internalType: "contract VRFCoordinatorV2Interface",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "winner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ],
];

export async function initWeb3() {
  if (!window.ethereum) {
    document.getElementById("status").innerText = "⚠️ Please install MetaMask.";
    return false;
  }

  try {
    // Show connecting status
    document.getElementById("status").innerText = "⏳ Connecting to wallet...";
    
    // Request account access - this triggers the MetaMask popup
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAccount = await signer.getAddress();
    contract = new ethers.Contract(contractAddress, abi, signer);

    // Setup event listeners
    contract.on("WinnerSelected", (winner) => {
      if (winner === userAccount) {
        document.getElementById("status").innerHTML =
          '<div class="winner-banner">🎉 YOU WON THE JACKPOT! 🎉</div>';
        document.getElementById("withdrawBtn").style.display = "inline-block";
      } else {
        document.getElementById(
          "status"
        ).innerHTML = `<p>🏆 Winner: ${winner.slice(0, 6)}...${winner.slice(
          -4
        )}</p>`;
      }
    });

    contract.on("JackpotClaimed", (winner, amount) => {
      if (winner === userAccount) {
        document.getElementById("status").innerHTML =
          '<div class="winner-banner">✅ $2.2B CLAIMED! HISTORY MADE!</div>';
      }
    });

    // Only update UI after successful connection
    document.getElementById("status").innerText = "✅ Wallet connected!";
    document.getElementById("userDashboard").style.display = "block";
    
    // Important: Change the button text but keep the original click handler
    document.getElementById("connectBtn").innerText = "🪙 Deposit ETH";
    // Don't replace the onclick handler, just update the UI
    
    await updateUI();
    return true;
  } catch (e) {
    console.error("Init error:", e);
    document.getElementById("status").innerText = "⚠️ Connection failed: " + e.message;
    return false;
  }
}

export async function connectAndDeposit() {
  const ethAmount = document.getElementById("ethAmount").value;
  if (!ethAmount || parseFloat(ethAmount) <= 0) {
    document.getElementById("status").innerText =
      "⚠️ Enter a valid ETH amount.";
    return;
  }

  try {
    document.getElementById("status").innerText = "⏳ Sending transaction...";
    const tx = await contract.deposit({ value: ethers.parseEther(ethAmount) });
    await tx.wait();
    document.getElementById("status").innerText = "✅ Deposit successful!";

    // Play sound using Web Audio API
    playCoinSound();

    // Show coin burst animation
    showCoinBurst();

    // Show share modal
    const modal = document.getElementById("shareModal");
    if (modal?.showModal) modal.showModal();

    updateUI();
  } catch (e) {
    console.error("Deposit error:", e);
    document.getElementById("status").innerText =
      "⚠️ Deposit failed: " + e.message;
  }
}

export async function withdrawWinnings() {
  try {
    document.getElementById("status").innerText = "⏳ Claiming your prize...";
    const tx = await contract.withdrawIfWinner();
    await tx.wait();

    // Play victory sound
    const victorySound = new Audio(
      "https://assets.mixkit.co/sfx/preview/mixkit-video-game-win-2016.mp3"
    );
    victorySound.play();

    document.getElementById("status").innerHTML =
      '<div class="winner-banner">✅ $2.2B CLAIMED! HISTORY MADE!</div>';

    // Show confetti effect
    triggerConfetti();
  } catch (e) {
    console.error("Withdraw error:", e);
    document.getElementById("status").innerText =
      "⚠️ Claim failed: " + e.message;
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
    document.getElementById("status").innerText =
      "⚠️ Draw failed: " + e.message;
  }
}

export { updateUI };

async function updateUI() {
  if (!contract || !userAccount) return;

  try {
    const deposit = await contract.userDeposits(userAccount);
    document.getElementById("userDeposit").innerText =
      ethers.formatEther(deposit);

    document.getElementById("userAddress").innerText = `${userAccount.slice(
      0,
      6
    )}...${userAccount.slice(-4)}`;
    document.getElementById("userDashboard").style.display = "block";

    const totalPool = await contract.totalPool();
    const jackpotUsd = await contract.getJackpotUsd();
    const targetUsd = await contract.TARGET_USD();
    const last24hUsd = await contract.last24hDepositUsd();

    document.getElementById(
      "jackpot"
    ).innerHTML = `<strong>${ethers.formatEther(totalPool)} ETH</strong> ($${(
      Number(jackpotUsd) / 1e8
    ).toFixed(2)})`;
    document.getElementById("usd24h").innerText = `$${(
      Number(last24hUsd) / 1e8
    ).toFixed(2)}`;

    const percent = (jackpotUsd * 100n) / targetUsd;
    document.getElementById("progressFill").style.width = `${Math.min(
      Number(percent),
      100
    )}%`;

    updateHoldTimer();
    checkWinnerAndDraw();
    displayLeaderboard();
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
    document.getElementById("holdTimer").innerText = `${h
      .toString()
      .padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  } catch (e) {
    console.error("Timer error:", e);
  }
}

async function checkWinnerAndDraw() {
  try {
    const winner = await contract.winner();
    const canDraw = await contract.canDraw();

    if (winner === userAccount) {
      document.getElementById("status").innerHTML =
        '<div class="winner-banner">🎉 YOU ARE THE WINNER! 🎉</div>';
      document.getElementById("withdrawBtn").style.display = "inline-block";
    } else if (winner !== "0x0000000000000000000000000000000000000000") {
      document.getElementById(
        "status"
      ).innerHTML = `<p>🏆 Winner: ${winner.slice(0, 6)}...${winner.slice(
        -4
      )}</p>`;
    } else {
      document.getElementById(
        "status"
      ).innerHTML = `<p>Waiting for winner...</p>`;
    }

    if (canDraw) {
      document.getElementById(
        "status"
      ).innerHTML += `<p>The draw conditions are met! 🎯</p>`;
      document.getElementById("requestDrawBtn").style.display = "inline-block";
    }
  } catch (e) {
    console.error("Winner check failed:", e);
  }
}

async function resolveENS(address) {
  if (!provider) return null;

  try {
    // Check reverse resolution
    const name = await provider.lookupAddress(address);
    if (name) return name;

    // Check if address ends with .eth
    if (address.endsWith(".eth")) {
      const resolved = await provider.resolveName(address);
      if (resolved) return address; // Return ENS name if valid
    }
  } catch (e) {
    console.warn("ENS resolution failed:", e);
  }
  return null;
}

async function displayLeaderboard() {
  if (!contract) return;

  try {
    const leaderboardContainer = document.getElementById("leaderboard");
    if (!leaderboardContainer) return;

    // Get top 5 depositors
    const [depositors, amounts] = await contract.getTopDepositors(5);

    let html = `<h3>🏆 TOP DEPOSITORS</h3>`;
    for (let i = 0; i < depositors.length; i++) {
      const ens = await resolveENS(depositors[i]);
      const display =
        ens || `${depositors[i].slice(0, 6)}...${depositors[i].slice(-4)}`;
      const amount = ethers.formatEther(amounts[i]);

      html += `
        <div class="leaderboard-entry">
          <span class="rank">${i + 1}.</span>
          <span class="name">${display}</span>
          <span class="amount">${amount} ETH</span>
        </div>
      `;
    }

    leaderboardContainer.innerHTML = html;
  } catch (e) {
    console.error("Leaderboard error:", e);
  }
}

function triggerConfetti() {
  const confettiCount = 200;
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement("div");
    confetti.innerHTML = "🎉";
    confetti.style.position = "fixed";
    confetti.style.fontSize = "20px";
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.top = "-30px";
    confetti.style.animation = `confettiFall ${
      Math.random() * 3 + 2
    }s linear forwards`;
    document.body.appendChild(confetti);

    setTimeout(() => confetti.remove(), 5000);
  }
}

let audioContext;
let coinBuffer;

async function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const response = await fetch(
      "https://assets.mixkit.co/sfx/preview/mixkit-arcade-retro-coin-207.mp3"
    );
    const arrayBuffer = await response.arrayBuffer();
    coinBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.error("Audio init failed:", e);
  }
}

function playCoinSound() {
  if (!audioContext || !coinBuffer) return;

  try {
    const source = audioContext.createBufferSource();
    source.buffer = coinBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (e) {
    console.error("Sound play failed:", e);
  }
}

function showCoinBurst() {
  const burst = document.createElement("div");
  burst.className = "coin-burst";
  burst.innerText = "🪙🪙🪙";
  document.body.appendChild(burst);
  setTimeout(() => document.body.removeChild(burst), 1200);
}

// Initialize audio on first user interaction
document.addEventListener(
  "click",
  async () => {
    if (!audioContext) await initAudio();
  },
  { once: true }
);

// Add this fallback function to load basic jackpot info even if not connected
export async function loadJackpotInfo() {
  if (!window.ethereum) return;
  
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const readOnlyContract = new ethers.Contract(contractAddress, abi, provider);
    
    const totalPool = await readOnlyContract.totalPool();
    const jackpotUsd = await readOnlyContract.getJackpotUsd();
    const targetUsd = await readOnlyContract.TARGET_USD();
    const last24hUsd = await readOnlyContract.last24hDepositUsd();
    
    document.getElementById("jackpot").innerHTML = 
      `<strong>${ethers.formatEther(totalPool)} ETH</strong> ($${(Number(jackpotUsd) / 1e8).toFixed(2)})`;
    document.getElementById("usd24h").innerText = 
      `$${(Number(last24hUsd) / 1e8).toFixed(2)}`;
    
    const percent = (Number(jackpotUsd) * 100) / Number(targetUsd);
    document.getElementById("progressFill").style.width = 
      `${Math.min(Number(percent), 100)}%`;
  } catch (e) {
    console.error("Failed to load jackpot info:", e);
  }
}

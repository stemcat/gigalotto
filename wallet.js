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
    document.getElementById("status").innerText = "⏳ Connecting wallet...";

    // Request account access - this triggers the MetaMask popup
    await window.ethereum.request({ method: "eth_requestAccounts" });

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAccount = await signer.getAddress();
    contract = new ethers.Contract(contractAddress, abi[0], signer);

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

    // Listen for account changes or disconnection
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        handleDisconnect();
      } else {
        // User switched accounts, reinitialize
        initWeb3();
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
    document.getElementById("status").innerText =
      "⚠️ Connection failed: " + e.message;
    return false;
  }
}

export async function connectAndDeposit() {
  const ethAmount = document.getElementById("ethAmount").value;
  if (!ethAmount || parseFloat(ethAmount) < 0.001) {
    document.getElementById("status").innerText =
      "⚠️ Enter a valid ETH amount. (min: 0.001)";
    return;
  }

  try {
    document.getElementById("status").innerText = "⏳ Sending transaction...";
    const tx = await contract.deposit({ value: ethers.parseEther(ethAmount) });

    // Add visual effect while waiting for confirmation
    document.getElementById("status").innerHTML =
      '<div class="hot-flame">🔥 Transaction pending... 🔥</div>';

    await tx.wait();
    document.getElementById("status").innerText = "✅ Deposit successful!";

    // Play sound using Web Audio API
    playCoinSound();

    // Show full-page confetti instead of coin burst
    triggerConfetti();

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

    // Calculate winning chance
    const totalPool = await contract.totalPool();
    const winChance = (Number(deposit) * 100) / Number(totalPool);

    document.getElementById("userAddress").innerText = `${userAccount.slice(
      0,
      6
    )}...${userAccount.slice(-4)}`;

    // Update user dashboard with winning chance
    document.getElementById("userDashboard").innerHTML = `
      <p><strong>Connected:</strong> <span id="userAddress">${userAccount.slice(
        0,
        6
      )}...${userAccount.slice(-4)}</span></p>
      <p>
        <strong>Your Total Deposits:</strong>
        <span id="userDeposit">${ethers.formatEther(deposit)}</span> ETH
      </p>
      <p>
        <strong>Your Winning Chance:</strong>
        <span id="winChance">${winChance.toFixed(2)}%</span>
      </p>
    `;

    document.getElementById("userDashboard").style.display = "block";

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

    const percent = (Number(jackpotUsd) * 100) / Number(targetUsd);
    document.getElementById("progressFill").style.width = `${Math.min(
      Number(percent),
      100
    )}%`;

    // Only show hold timer if target is met
    const holdStartTime = await contract.holdStartTimestamp();
    const holdTimerElement = document.getElementById("holdTimerSection");

    if (Number(holdStartTime) > 0) {
      holdTimerElement.style.display = "block";
      updateHoldTimer();
    } else {
      holdTimerElement.style.display = "none";
    }

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
    const jackpotUsd = await contract.getJackpotUsd();
    const targetUsd = await contract.TARGET_USD();
    const percent = (Number(jackpotUsd) * 100) / Number(targetUsd);

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
      // Only show "Waiting for winner" if we've reached the target
      if (percent >= 100) {
        document.getElementById(
          "status"
        ).innerHTML = `<p>Waiting for winner...</p>`;
      } else if (percent < 25) {
        document.getElementById(
          "status"
        ).innerHTML = `<p>The jackpot is just getting started! 🚀</p>`;
      } else if (percent < 50) {
        document.getElementById(
          "status"
        ).innerHTML = `<p>The pot is growing! Don't miss out! 🚀</p>`;
      } else if (percent < 75) {
        document.getElementById(
          "status"
        ).innerHTML = `<p>We're more than halfway there! 🔥</p>`;
      } else {
        document.getElementById(
          "status"
        ).innerHTML = `<p>Almost at target! Last chance to join! ⏰</p>`;
      }
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

    // Create a map to track unique depositors and their amounts
    const depositorMap = new Map();

    // Get all entries count
    const entriesCount = await contract.getEntriesCount();
    const count = Math.min(Number(entriesCount), 50); // Limit to 50 entries max

    // Process entries to find unique depositors
    for (let i = 0; i < count; i++) {
      try {
        const [address, _] = await contract.getEntry(i);
        const amount = await contract.userDeposits(address);

        // Add or update depositor in our map
        depositorMap.set(address, amount);
      } catch (e) {
        console.error(`Error fetching entry ${i}:`, e);
      }
    }

    // Convert map to arrays and sort by amount
    const uniqueDepositors = Array.from(depositorMap.entries())
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5); // Take top 5

    let html = `<h3>🏆 TOP DEPOSITORS</h3>`;
    for (let i = 0; i < uniqueDepositors.length; i++) {
      const [address, amount] = uniqueDepositors[i];
      const ens = await resolveENS(address);
      const display = ens || `${address.slice(0, 6)}...${address.slice(-4)}`;
      const amountEth = ethers.formatEther(amount);

      html += `
        <div class="leaderboard-entry">
          <span class="rank">${i + 1}.</span>
          <span class="name">${display}</span>
          <span class="amount">${amountEth} ETH</span>
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
    // Use a different sound URL that doesn't have CORS issues
    const response = await fetch(
      "https://assets.soundon.fm/sounds/coin-drop.mp3"
    );
    const arrayBuffer = await response.arrayBuffer();
    coinBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.error("Audio init failed:", e);
    // Fallback - create a simple beep sound if fetch fails
    if (audioContext) {
      try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
      } catch (err) {
        console.error("Fallback sound failed:", err);
      }
    }
  }
}

function playCoinSound() {
  if (!audioContext) {
    initAudio();
    return;
  }

  try {
    if (coinBuffer) {
      const source = audioContext.createBufferSource();
      source.buffer = coinBuffer;
      source.connect(audioContext.destination);
      source.start();
    } else {
      // Fallback - create a simple beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.1;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 200);
    }
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

// Add this function for Twitter sharing
function shareOnTwitter() {
  const text =
    "I just deposited into the $2.2B #GigaLotto on-chain lottery! 🤑 Join me and let's make crypto history!";
  const url = "https://gigalotto.vercel.app";
  const hashtags = "Crypto,Ethereum,Lottery,Web3";

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text
  )}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(hashtags)}`;

  window.open(twitterUrl, "_blank");
}

// Make it available globally
window.shareOnTwitter = shareOnTwitter;

// Add this function to check if already connected
export async function checkIfConnected() {
  if (!window.ethereum) return false;

  try {
    // Check if already connected without prompting
    const accounts = await window.ethereum.request({
      method: "eth_accounts", // This doesn't trigger the MetaMask popup
    });

    if (accounts && accounts.length > 0) {
      // User is already connected, initialize everything
      await initWeb3();
      return true;
    }
    return false;
  } catch (e) {
    console.error("Connection check failed:", e);
    return false;
  }
}

// Update loadJackpotInfo to also load leaderboard
export async function loadJackpotInfo() {
  if (!window.ethereum) return;

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const readOnlyContract = new ethers.Contract(
      contractAddress,
      abi[0],
      provider
    );

    const totalPool = await readOnlyContract.totalPool();
    const jackpotUsd = await readOnlyContract.getJackpotUsd();
    const targetUsd = await readOnlyContract.TARGET_USD();
    const last24hUsd = await readOnlyContract.last24hDepositUsd();

    document.getElementById(
      "jackpot"
    ).innerHTML = `<strong>${ethers.formatEther(totalPool)} ETH</strong> ($${(
      Number(jackpotUsd) / 1e8
    ).toFixed(2)})`;
    document.getElementById("usd24h").innerText = `$${(
      Number(last24hUsd) / 1e8
    ).toFixed(2)}`;

    const percent = (Number(jackpotUsd) * 100) / Number(targetUsd);
    document.getElementById("progressFill").style.width = `${Math.min(
      Number(percent),
      100
    )}%`;

    // Also load leaderboard without requiring connection
    await loadLeaderboard(readOnlyContract);

    // Update status message based on jackpot progress
    updateStatusMessage(Number(jackpotUsd), Number(targetUsd));
  } catch (e) {
    console.error("Failed to load jackpot info:", e);
  }
}

// Function to load leaderboard without requiring connection
async function loadLeaderboard(contract) {
  try {
    const leaderboardContainer = document.getElementById("leaderboard");
    if (!leaderboardContainer) return;

    // Get all entries count
    const entriesCount = await contract.getEntriesCount();
    const count = Math.min(Number(entriesCount), 50); // Limit to 50 entries max

    // Create a map to track unique depositors and their total amounts
    const depositorMap = new Map();

    // Process entries to find unique depositors
    for (let i = 0; i < count; i++) {
      try {
        const [address, _] = await contract.getEntry(i);
        const amount = await contract.userDeposits(address);

        // Add or update depositor in our map
        if (depositorMap.has(address)) {
          // We already have this address, but the contract should have the total
          depositorMap.set(address, amount);
        } else {
          depositorMap.set(address, amount);
        }
      } catch (e) {
        console.error(`Error fetching entry ${i}:`, e);
      }
    }

    // Convert map to arrays and sort by amount
    const uniqueDepositors = Array.from(depositorMap.entries())
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5); // Take top 5

    let html = `<h3>🏆 TOP DEPOSITORS</h3>`;

    if (uniqueDepositors.length === 0) {
      html += `<div class="leaderboard-entry">No depositors yet</div>`;
    } else {
      for (let i = 0; i < uniqueDepositors.length; i++) {
        const [address, amount] = uniqueDepositors[i];
        const display = `${address.slice(0, 6)}...${address.slice(-4)}`;
        const amountEth = ethers.formatEther(amount);

        html += `
          <div class="leaderboard-entry">
            <span class="rank">${i + 1}.</span>
            <span class="name">${display}</span>
            <span class="amount">${amountEth} ETH</span>
          </div>
        `;
      }
    }

    leaderboardContainer.innerHTML = html;
  } catch (e) {
    console.error("Leaderboard error:", e);
  }
}

// Function to update status message based on jackpot progress
function updateStatusMessage(jackpotUsd, targetUsd) {
  const statusElement = document.getElementById("status");
  if (!statusElement) return;

  // Calculate percentage of target
  const percent = (jackpotUsd * 100) / targetUsd;

  // Only show "Waiting for winner" if we've reached the target
  if (percent >= 100) {
    statusElement.innerHTML = `<p>Waiting for winner...</p>`;
  } else if (percent < 25) {
    statusElement.innerHTML = `<p>The jackpot is just getting started! 🚀</p>`;
  } else if (percent < 50) {
    statusElement.innerHTML = `<p>The pot is growing! Don't miss out! 🚀</p>`;
  } else if (percent < 75) {
    statusElement.innerHTML = `<p>We're more than halfway there! 🔥</p>`;
  } else {
    statusElement.innerHTML = `<p>Almost at target! Last chance to join! ⏰</p>`;
  }
}

// Add this function to get the user account
export function getUserAccount() {
  return userAccount;
}

// Handle wallet disconnection
function handleDisconnect() {
  userAccount = null;
  provider = null;
  signer = null;
  contract = null;

  // Update UI to show disconnected state
  document.getElementById("connectBtn").innerText = "🔌 Connect Wallet";
  document.getElementById("userDashboard").style.display = "none";
  document.getElementById("status").innerText = "Wallet disconnected";
  document.getElementById("withdrawBtn").style.display = "none";
  document.getElementById("requestDrawBtn").style.display = "none";

  // Load basic info that doesn't require connection
  loadJackpotInfo();
}

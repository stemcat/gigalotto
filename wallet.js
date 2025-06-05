import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

// Contract details - export so they can be imported in read-only.js
export const contractAddress = "0xC51569C3877Db750494adA6d1886a9765ab29dD5"; // Updated contract address
export const abi = [
  "function deposit() external payable",
  "function withdraw() external",
  "function withdrawIfWinner() external",
  "function selectNewWinner() external",
  "function requestDraw() external",
  "function withdrawFees() external",
  "function userDeposits(address) view returns (uint256)",
  "function withdrawableAmounts(address) view returns (uint256)",
  "function totalPool() view returns (uint256)",
  "function getJackpotUsd() view returns (uint256)",
  "function TARGET_USD() view returns (uint256)",
  "function canDraw() view returns (bool)",
  "function winner() view returns (address)",
  "function winnerSelectedAt() view returns (uint256)",
  "function WINNER_CLAIM_PERIOD() view returns (uint256)",
  "function owner() view returns (address)",
  "function getEntriesCount() view returns (uint256)",
  "function getEntry(uint256) view returns (address, uint256)",
  "event WinnerSelectionExpired(address indexed previousWinner)",
];

// Global variables
let provider;
let signer;
let contract;
let userAccount = null;

// Get user account
export function getUserAccount() {
  return userAccount;
}

// Initialize Web3
export async function initWeb3() {
  console.log("Initializing Web3...");
  if (!window.ethereum) {
    document.getElementById("status").innerText = "⚠️ Please install MetaMask.";
    return false;
  }

  try {
    // Show connecting status
    document.getElementById("status").innerText = "⏳ Connecting wallet...";

    // Check if we're on Sepolia
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    console.log("Current chain ID:", chainId);

    // Sepolia chain ID is 0xaa36a7 (11155111 in decimal)
    if (chainId !== "0xaa36a7") {
      console.log("Not on Sepolia, requesting network switch");
      document.getElementById("status").innerText =
        "⏳ Switching to Sepolia testnet...";

      try {
        // Try to switch to Sepolia
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }], // Sepolia chain ID
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0xaa36a7",
                  chainName: "Sepolia Testnet",
                  nativeCurrency: {
                    name: "Sepolia ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["https://rpc.sepolia.org"],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
              ],
            });
          } catch (addError) {
            console.error("Failed to add Sepolia network:", addError);
            document.getElementById("status").innerText =
              "⚠️ Please switch to Sepolia testnet manually in MetaMask";
            return false;
          }
        } else {
          console.error("Failed to switch to Sepolia:", switchError);
          document.getElementById("status").innerText =
            "⚠️ Failed to switch to Sepolia testnet";
          return false;
        }
      }
    }

    // Get accounts
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length === 0) {
      // Request account access if needed
      await window.ethereum.request({ method: "eth_requestAccounts" });
    }

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAccount = await signer.getAddress();
    console.log("Connected to account:", userAccount);

    contract = new ethers.Contract(contractAddress, abi, signer);

    // Only update UI after successful connection
    document.getElementById("status").innerText =
      "✅ Wallet connected to Sepolia!";
    document.getElementById("userDashboard").style.display = "block";

    // Important: Change the button text but keep the original click handler
    document.getElementById("connectBtn").innerText = "🪙 Deposit ETH";

    await updateUI();
    return true;
  } catch (e) {
    console.error("Init error:", e);
    document.getElementById("status").innerText =
      "⚠️ Connection failed: " + e.message;
    return false;
  }
}

// Handle deposits
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

    // Show full-page confetti
    triggerConfetti();

    // Show share modal
    const modal = document.getElementById("shareModal");
    if (modal?.showModal) modal.showModal();

    updateUI();
  } catch (e) {
    console.error("Deposit error:", e);

    // Simplify error message for user rejection
    if (e.message && e.message.includes("user rejected")) {
      document.getElementById("status").innerText =
        "⚠️ Deposit failed: user rejected transaction";
    } else {
      document.getElementById("status").innerText =
        "⚠️ Deposit failed: " + e.message.split("(")[0].trim();
    }
  }
}

// Handle withdrawals
export async function withdrawWinnings() {
  try {
    document.getElementById("status").innerText = "⏳ Claiming your prize...";
    const tx = await contract.withdrawIfWinner();
    await tx.wait();

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

// Handle regular withdrawals
export async function withdraw() {
  try {
    document.getElementById("status").innerText = "⏳ Withdrawing funds...";
    const tx = await contract.withdraw();
    await tx.wait();
    document.getElementById("status").innerText = "✅ Withdrawal successful!";
    updateUI();
  } catch (e) {
    console.error("Withdraw error:", e);
    document.getElementById("status").innerText =
      "⚠️ Withdrawal failed: " + e.message;
  }
}

// Handle draw requests
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

// Update UI with user data
export async function updateUI() {
  if (!contract || !userAccount) return;

  try {
    // Get user deposit
    const deposit = await contract.userDeposits(userAccount);
    console.log("User deposit:", ethers.formatEther(deposit));

    // Calculate win chance
    const totalPool = await contract.totalPool();
    console.log("Total pool:", ethers.formatEther(totalPool));

    let winChanceDisplay = "0%";
    if (totalPool > 0 && deposit > 0) {
      const winChance = (deposit * 100n) / totalPool;
      winChanceDisplay = `${winChance.toString()}%`;
      console.log("Win chance:", winChanceDisplay);
    }

    // Update user dashboard
    document.getElementById("userAddress").innerText = `${userAccount.slice(
      0,
      6
    )}...${userAccount.slice(-4)}`;
    document.getElementById("userDeposit").innerText =
      ethers.formatEther(deposit);
    document.getElementById("winChance").innerText = winChanceDisplay;
    document.getElementById("userDashboard").style.display = "block";

    // Check if user is winner
    await checkWinnerAndDraw();
  } catch (e) {
    console.error("UI update failed:", e);
  }
}

// Check if user is winner and if draw is possible
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
    }

    // Show draw button if possible
    if (canDraw) {
      document.getElementById("drawBtn").style.display = "inline-block";
    } else {
      document.getElementById("drawBtn").style.display = "none";
    }
  } catch (e) {
    console.error("Winner check error:", e);
  }
}

// Check if already connected
export async function checkIfConnected() {
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) {
      userAccount = accounts[0];
      console.log("Already connected:", userAccount);
      document.getElementById("connectBtn").innerText = "Deposit";
      document.getElementById("status").innerText =
        "✅ Connected: " + shortenAddress(userAccount);

      // Update user dashboard
      updateUserDashboard();

      // Check if admin and show admin section
      if (isAdmin(userAccount)) {
        const adminSection = document.getElementById("adminSection");
        if (adminSection) {
          adminSection.style.display = "block";
        }
      }

      return true;
    }
    return false;
  } catch (e) {
    console.error("Error checking connection:", e);
    return false;
  }
}

// Helper function to shorten address
function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Check if user is admin
function isAdmin(address) {
  // Replace with your admin address check logic
  return false;
}

// Update user dashboard
async function updateUserDashboard() {
  const userAccount = getUserAccount();
  if (!userAccount) return;

  try {
    // Initialize contract if not already done
    if (!contract) {
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      contract = new ethers.Contract(contractAddress, abi, signer);
    }

    // Get user deposit
    const deposit = await contract.userDeposits(userAccount);

    // Calculate win chance
    const totalPool = await contract.totalPool();

    let winChanceDisplay = "0%";
    if (totalPool > 0 && deposit > 0) {
      const winChance = (deposit * 100n) / totalPool;
      winChanceDisplay = `${winChance.toString()}%`;
    }

    // Update user dashboard
    document.getElementById("userAddress").innerText =
      shortenAddress(userAccount);
    document.getElementById("userDeposit").innerText =
      ethers.formatEther(deposit);
    document.getElementById("winChance").innerText = winChanceDisplay;

    // Show user dashboard
    document.getElementById("userDashboard").style.display = "block";
  } catch (e) {
    console.error("Error updating user dashboard:", e);
  }
}

// Connect wallet with terms check
export async function connectWallet() {
  console.log("Connect wallet function called");

  // Check if terms were already accepted
  const termsAccepted = localStorage.getItem("termsAccepted") === "true";

  if (!termsAccepted) {
    // Show terms modal
    document.getElementById("termsModal").showModal();
    return false;
  }

  // Continue with wallet connection
  try {
    if (!window.ethereum) {
      document.getElementById("status").innerText =
        "⚠️ Please install MetaMask.";
      return false;
    }

    // Request accounts
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // Initialize Web3
    return await initWeb3();
  } catch (e) {
    console.error("Connection error:", e);
    document.getElementById("status").innerText =
      "⚠️ Connection failed: " + e.message;
    return false;
  }
}

// Add function to withdraw fees
export async function withdrawFees() {
  try {
    document.getElementById("status").innerText = "⏳ Withdrawing fees...";
    const tx = await contract.withdrawFees();
    await tx.wait();
    document.getElementById("status").innerText =
      "✅ Fees withdrawn successfully!";
  } catch (e) {
    console.error("Withdraw fees error:", e);
    document.getElementById("status").innerText =
      "⚠️ Withdraw fees failed: " + e.message;
  }
}

// Add function to select new winner
export async function selectNewWinner() {
  try {
    document.getElementById("status").innerText = "⏳ Selecting new winner...";
    const tx = await contract.selectNewWinner();
    await tx.wait();
    document.getElementById("status").innerText =
      "✅ New winner selection initiated!";
  } catch (e) {
    console.error("Select new winner error:", e);
    document.getElementById("status").innerText =
      "⚠️ Select new winner failed: " + e.message;
  }
}

// Check if winner selection expired
export async function checkExpiredWinner() {
  try {
    const winner = await contract.winner();
    if (winner === "0x0000000000000000000000000000000000000000") {
      document.getElementById("status").innerText = "No winner selected yet";
      return;
    }

    const winnerSelectedAt = await contract.winnerSelectedAt();
    const claimPeriod = await contract.WINNER_CLAIM_PERIOD();
    const currentTime = Math.floor(Date.now() / 1000);

    if (
      winnerSelectedAt > 0 &&
      currentTime > Number(winnerSelectedAt) + Number(claimPeriod)
    ) {
      document.getElementById("status").innerText =
        "⏳ Checking expired winner...";
      const tx = await contract.selectNewWinner();
      await tx.wait();
      document.getElementById("status").innerText =
        "✅ Winner expired, new selection triggered!";
      updateUI();
    } else {
      const timeLeft =
        Number(winnerSelectedAt) + Number(claimPeriod) - currentTime;
      document.getElementById("status").innerText = `Winner has ${Math.floor(
        timeLeft / 3600
      )} hours and ${Math.floor((timeLeft % 3600) / 60)} minutes left to claim`;
    }
  } catch (e) {
    console.error("Check expired winner error:", e);
    document.getElementById("status").innerText =
      "⚠️ Check failed: " + e.message;
  }
}

// Set up account change listeners
export function setupAccountChangeListeners() {
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
      console.log("Account changed to:", accounts[0]);
      if (accounts.length === 0) {
        // User disconnected their wallet
        userAccount = null;
        document.getElementById("status").innerText = "Wallet disconnected";
        document.getElementById("userDashboard").style.display = "none";
        document.getElementById("connectBtn").innerText = "Connect Wallet";
      } else {
        // User switched accounts
        userAccount = accounts[0];
        document.getElementById("status").innerText =
          "✅ Connected: " + shortenAddress(userAccount);
        updateUserDashboard();
      }
    });

    window.ethereum.on("chainChanged", (chainId) => {
      console.log("Network changed to:", chainId);
      // Reload the page on chain change
      window.location.reload();
    });
  }
}

// Debug wallet connection
export function debugWalletConnection() {
  console.log("Debugging wallet connection...");
  console.log("window.ethereum exists:", !!window.ethereum);

  if (window.ethereum) {
    console.log("Provider:", provider);
    console.log("Signer:", signer);
    console.log("User account:", userAccount);
    console.log("Contract:", contract);

    // Check if we're on Sepolia
    window.ethereum
      .request({ method: "eth_chainId" })
      .then((chainId) => {
        console.log("Current chain ID:", chainId);
        console.log("Is Sepolia:", chainId === "0xaa36a7");
      })
      .catch((err) => {
        console.error("Error getting chain ID:", err);
      });

    // Check accounts
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        console.log("Current accounts:", accounts);
      })
      .catch((err) => {
        console.error("Error getting accounts:", err);
      });
  }
}

// Helper function for confetti effect
function triggerConfetti() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  } else {
    console.warn("Confetti library not loaded");
  }
}

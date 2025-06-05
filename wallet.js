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
              "⚠️ Failed to add Sepolia network";
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
      // Don't auto-request accounts, just return false
      document.getElementById("status").innerText = "Ready to connect";
      return false;
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

    // Check if user is admin and show admin section
    if (isAdmin(userAccount)) {
      console.log("Admin user detected, showing admin section");
      const adminSection = document.getElementById("adminSection");
      if (adminSection) {
        adminSection.style.display = "block";
      }
    }

    // Check if user is winner
    await checkWinnerAndDraw();
  } catch (e) {
    console.error("UI update failed:", e);
  }
}

// Check if user is winner and if draw is possible
export async function checkWinnerAndDraw() {
  if (!contract || !userAccount) return;

  try {
    // Check if user is admin
    if (isAdmin(userAccount)) {
      // Show admin section
      const adminSection = document.getElementById("adminSection");
      if (!adminSection) {
        // Create admin section if it doesn't exist
        const dashboard = document.getElementById("userDashboard");
        if (dashboard) {
          const adminDiv = document.createElement("div");
          adminDiv.id = "adminSection";
          adminDiv.className = "admin-section";

          // Get collected fees
          const collectedFees = await checkCollectedFees();

          adminDiv.innerHTML = `
            <h3>Admin Controls</h3>
            <div class="admin-info">
              <div class="admin-stat">
                <span>Collected Fees:</span>
                <span id="collectedFees">${collectedFees} ETH</span>
              </div>
            </div>
            <div id="adminStatus">Checking draw status...</div>
            <div class="admin-controls">
              <div>
                <button onclick="window.checkCanDraw()">Check Draw Status</button>
                <button onclick="window.requestDraw()">Request Draw</button>
                <button onclick="window.selectNewWinner()">Select New Winner</button>
              </div>
              <div>
                <button onclick="window.withdrawFees()">Withdraw Fees</button>
                <div class="fee-control">
                  <input type="number" id="feeInput" min="0" max="10" value="2" placeholder="Fee %">
                  <button onclick="window.setFee()">Set Fee</button>
                </div>
              </div>
            </div>
          `;
          dashboard.after(adminDiv);
        }
      } else {
        // Update collected fees if admin section already exists
        const collectedFeesElement = document.getElementById("collectedFees");
        if (collectedFeesElement) {
          const collectedFees = await checkCollectedFees();
          collectedFeesElement.innerText = `${collectedFees} ETH`;
        }
      }

      // Check if draw is possible
      await checkCanDraw();
    }

    // Check if user is winner
    const winner = await contract.winner();
    if (winner.toLowerCase() === userAccount.toLowerCase()) {
      // Show winner section
      const winnerSection = document.getElementById("winnerSection");
      if (!winnerSection) {
        const dashboard = document.getElementById("userDashboard");
        if (dashboard) {
          const winnerDiv = document.createElement("div");
          winnerDiv.id = "winnerSection";
          winnerDiv.className = "winner-section";
          winnerDiv.innerHTML = `
            <h3>🎉 Congratulations! You won the jackpot! 🎉</h3>
            <button onclick="window.withdrawWinnings()">Claim Jackpot</button>
          `;
          dashboard.after(winnerDiv);
        }
      }
    }
  } catch (e) {
    console.error("Check winner error:", e);
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
  // Admin address check
  const adminAddresses = [
    "0xe9D99D4380e80DE290D10F741F77728954fe2d81".toLowerCase(),
  ];
  return adminAddresses.includes(address.toLowerCase());
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
    const termsModal = document.getElementById("termsModal");
    if (termsModal?.showModal) {
      termsModal.showModal();
    } else {
      console.error("Terms modal not found or showModal not supported");
      document.getElementById("status").innerText =
        "⚠️ Browser doesn't support dialog element. Please use a modern browser.";
    }
    return false;
  }

  // Continue with wallet connection
  try {
    if (!window.ethereum) {
      document.getElementById("status").innerText =
        "⚠️ MetaMask not detected. Please install MetaMask and refresh.";
      return false;
    }

    document.getElementById("status").innerText = "⏳ Requesting accounts...";

    // Request accounts with explicit error handling
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Accounts after request:", accounts);

      if (accounts.length === 0) {
        document.getElementById("status").innerText =
          "⚠️ No accounts authorized. Please unlock MetaMask and try again.";
        return false;
      }
    } catch (requestError) {
      console.error("Account request error:", requestError);
      document.getElementById("status").innerText =
        "⚠️ Failed to connect: " +
        (requestError.message || "User rejected request");
      return false;
    }

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

// Debug wallet connection with more detailed logging
export function debugWalletConnection() {
  console.log("=== WALLET CONNECTION DEBUGGING ===");
  console.log("window.ethereum exists:", !!window.ethereum);

  if (window.ethereum) {
    console.log("Provider:", provider);
    console.log("Signer:", signer);
    console.log("User account:", userAccount);
    console.log("Contract:", contract);
    console.log("Contract address:", contractAddress);

    // Check if we're on Sepolia
    window.ethereum
      .request({ method: "eth_chainId" })
      .then((chainId) => {
        console.log("Current chain ID:", chainId);
        console.log("Is Sepolia:", chainId === "0xaa36a7");

        // Check accounts
        return window.ethereum.request({ method: "eth_accounts" });
      })
      .then((accounts) => {
        console.log("Current accounts:", accounts);
        if (accounts.length === 0) {
          console.log("No accounts connected. Try requesting accounts...");
          return window.ethereum
            .request({ method: "eth_requestAccounts" })
            .then((requestedAccounts) => {
              console.log("Requested accounts:", requestedAccounts);
            })
            .catch((err) => {
              console.error("Error requesting accounts:", err);
            });
        }
      })
      .catch((err) => {
        console.error("Error in wallet debugging:", err);
      });
  } else {
    console.error("MetaMask not installed or not accessible");
    // Check if running in iframe which might block MetaMask
    if (window !== window.top) {
      console.error("Running in iframe - MetaMask might be blocked");
    }
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

// Add function to set fee
export async function setFee() {
  try {
    const feeInput = document.getElementById("feeInput");
    if (!feeInput) {
      document.getElementById("status").innerText = "⚠️ Fee input not found";
      return;
    }

    const feePercent = parseInt(feeInput.value);
    if (isNaN(feePercent) || feePercent < 0 || feePercent > 10) {
      document.getElementById("status").innerText = "⚠️ Invalid fee (0-10%)";
      return;
    }

    document.getElementById("status").innerText = "⏳ Setting fee...";
    const tx = await contract.setFeePercent(feePercent);

    document.getElementById("status").innerText =
      "⏳ Confirming transaction...";
    await tx.wait();

    document.getElementById(
      "status"
    ).innerText = `✅ Fee set to ${feePercent}%`;
  } catch (e) {
    console.error("Set fee error:", e);
    document.getElementById("status").innerText =
      "⚠️ Failed to set fee: " + e.message;
  }
}

// Add admin section to check if draw is possible
export async function checkCanDraw() {
  try {
    const canDraw = await contract.canDraw();
    const adminStatusEl = document.getElementById("adminStatus");

    if (adminStatusEl) {
      if (canDraw) {
        adminStatusEl.innerHTML =
          "✅ Draw is possible now! <button onclick='window.requestDraw()'>Request Draw</button>";
      } else {
        // Check why draw is not possible
        const holdStartTimestamp = await contract.holdStartTimestamp();
        const last24hDepositUsd = await contract.last24hDepositUsd();
        const MIN_24H_USD = await contract.MIN_24H_USD();

        if (holdStartTimestamp == 0) {
          adminStatusEl.innerText =
            "❌ Draw not possible: No hold period started yet";
        } else {
          const now = Math.floor(Date.now() / 1000);
          const holdTime = Number(holdStartTimestamp);
          const lockPeriod = 5 * 60; // 5 minutes for testing

          if (now < holdTime + lockPeriod) {
            const remainingTime = holdTime + lockPeriod - now;
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            adminStatusEl.innerText = `⏳ Draw not possible: Lock period active (${minutes}m ${seconds}s remaining)`;
          } else if (Number(last24hDepositUsd) >= Number(MIN_24H_USD)) {
            adminStatusEl.innerText = `❌ Draw not possible: 24h deposits (${
              Number(last24hDepositUsd) / 1e8
            } USD) exceed minimum (${Number(MIN_24H_USD) / 1e8} USD)`;
          } else {
            adminStatusEl.innerText = "❓ Draw not possible: Unknown reason";
          }
        }
      }
    }
  } catch (e) {
    console.error("Check can draw error:", e);
    const adminStatusEl = document.getElementById("adminStatus");
    if (adminStatusEl) {
      adminStatusEl.innerText = "⚠️ Failed to check draw status: " + e.message;
    }
  }
}

// Add this function to check collected fees
export async function checkCollectedFees() {
  if (!contract) return "0";

  try {
    const collectedFees = await contract.collectedFees();
    return ethers.formatEther(collectedFees);
  } catch (e) {
    console.error("Error checking collected fees:", e);
    return "0";
  }
}

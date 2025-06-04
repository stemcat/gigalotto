import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

// Contract details
const contractAddress = "0x8366A6F4adbB6D2D9fDC4cD5B9b0aC5f12D96dF1";
const abi = [
  // Include only the functions we need for wallet operations
  "function totalPool() view returns (uint256)",
  "function getJackpotUsd() view returns (uint256)",
  "function TARGET_USD() view returns (uint256)",
  "function last24hDepositUsd() view returns (uint256)",
  "function getEntriesCount() view returns (uint256)",
  "function getEntry(uint256 index) view returns (address user, uint256 cumulative)",
  "function userDeposits(address user) view returns (uint256)",
  "function deposit() payable",
  "function withdrawIfWinner()",
  "function requestDraw()",
  "function winner() view returns (address)",
  "function holdStartTimestamp() view returns (uint256)",
  "function canDraw() view returns (bool)",
];

// Global variables
let provider;
let signer;
let contract;
let userAccount;

// Function to get user account
export function getUserAccount() {
  return userAccount;
}

// Handle wallet connection
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

    // Request account access - this triggers the MetaMask popup
    await window.ethereum.request({ method: "eth_requestAccounts" });
    console.log("Account access granted");

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
    const deposit = await contract.userDeposits(userAccount);

    // Calculate winning chance
    const totalPool = await contract.totalPool();
    const winChance =
      totalPool > 0
        ? (Number(ethers.formatEther(deposit)) * 100) /
          Number(ethers.formatEther(totalPool))
        : 0;

    // Format winning chance with special handling for very small percentages
    let winChanceDisplay;
    if (winChance < 0.01 && winChance > 0) {
      winChanceDisplay = "less than 0.01%";
    } else {
      winChanceDisplay = winChance.toFixed(2) + "%";
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

    // Show draw button if user is owner and draw is possible
    if (canDraw) {
      document.getElementById("requestDrawBtn").style.display = "inline-block";
    } else {
      document.getElementById("requestDrawBtn").style.display = "none";
    }
  } catch (e) {
    console.error("Winner check failed:", e);
  }
}

// Check if already connected
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

// Connect wallet with terms check
export async function connectWallet() {
  // Check if terms were already accepted
  const termsAccepted = localStorage.getItem("termsAccepted") === "true";

  if (!termsAccepted) {
    // Show terms modal and wait for user response
    const accepted = await showTermsModal();
    if (!accepted) {
      // User declined terms
      document.getElementById("status").innerText =
        "⚠️ You must accept the terms to continue";
      return false;
    }
  }

  // Continue with wallet connection
  return await initWeb3();
}

// Show confetti effect
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

// Show terms modal
function showTermsModal() {
  console.log("showTermsModal function called");
  return new Promise((resolve) => {
    const modal = document.getElementById("termsModal");
    if (!modal) {
      console.error("Terms modal not found");
      resolve(true); // Proceed anyway if modal not found
      return;
    }

    console.log("Opening terms modal");
    modal.showModal();

    // Set up accept/decline handlers
    window.acceptTerms = () => {
      console.log("Terms accepted from modal");
      localStorage.setItem("termsAccepted", "true");
      modal.close();
      resolve(true);
    };

    window.declineTerms = () => {
      console.log("Terms declined from modal");
      modal.close();
      resolve(false);
    };
  });
}

export async function checkWithdrawableAmount() {
  if (!userAccount || !contract) return;

  try {
    const withdrawableAmount = await contract.withdrawableAmounts(userAccount);
    const depositTimestamp = await contract.depositTimestamps(userAccount);
    const lockPeriod = await contract.LOCK_PERIOD();

    const unlockTime = Number(depositTimestamp) + Number(lockPeriod);
    const now = Math.floor(Date.now() / 1000);

    const formattedAmount = ethers.formatEther(withdrawableAmount);
    document.getElementById("withdrawableAmount").innerText = formattedAmount;

    if (Number(depositTimestamp) > 0) {
      const unlockDate = new Date(unlockTime * 1000);
      document.getElementById("unlockDate").innerText =
        unlockDate.toLocaleDateString() + " " + unlockDate.toLocaleTimeString();

      // Show withdraw section if funds are available and unlocked
      if (withdrawableAmount > 0 && now >= unlockTime) {
        document.getElementById("withdrawalSection").style.display = "block";

        // Set max value for withdrawal input
        document.getElementById("withdrawAmount").max = formattedAmount;
        document.getElementById(
          "withdrawAmount"
        ).placeholder = `Amount (max: ${formattedAmount} ETH)`;
      } else {
        document.getElementById("withdrawalSection").style.display = "none";
      }
    } else {
      document.getElementById("unlockDate").innerText = "-";
      document.getElementById("withdrawalSection").style.display = "none";
    }
  } catch (e) {
    console.error("Error checking withdrawable amount:", e);
  }
}

export async function withdrawFunds() {
  try {
    const withdrawAmount = document.getElementById("withdrawAmount").value;

    // Validate amount
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      document.getElementById("status").innerText =
        "⚠️ Please enter a valid amount to withdraw";
      return;
    }

    const maxAmount = await contract.withdrawableAmounts(userAccount);
    const maxAmountEth = ethers.formatEther(maxAmount);

    if (parseFloat(withdrawAmount) > parseFloat(maxAmountEth)) {
      document.getElementById(
        "status"
      ).innerText = `⚠️ Maximum withdrawal amount is ${maxAmountEth} ETH`;
      return;
    }

    // Calculate percentage of funds being withdrawn
    const percentWithdrawn =
      (parseFloat(withdrawAmount) / parseFloat(maxAmountEth)) * 100;

    // Show confirmation dialog with percentage information
    const confirmed = confirm(
      `Warning: Withdrawing ${withdrawAmount} ETH (${percentWithdrawn.toFixed(
        2
      )}% of your deposits) ` +
        `will reduce your chance of winning the jackpot proportionally. Are you sure you want to proceed?`
    );

    if (!confirmed) return;

    document.getElementById("status").innerText = "⏳ Withdrawing funds...";

    // Convert ETH to wei for the contract call
    const amountInWei = ethers.parseEther(withdrawAmount);
    const tx = await contract.withdraw(amountInWei);
    await tx.wait();

    document.getElementById(
      "status"
    ).innerText = `✅ ${withdrawAmount} ETH withdrawn successfully!`;

    // Update UI
    await checkWithdrawableAmount();
    await updateUserInfo();
  } catch (e) {
    console.error("Withdrawal error:", e);
    document.getElementById("status").innerText =
      "⚠️ Withdrawal failed: " + e.message;
  }
}

// Add this to your initialization code
document
  .getElementById("withdrawFundsBtn")
  .addEventListener("click", withdrawFunds);

async function resolveENSName(address) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const ensName = await provider.lookupAddress(address);
    return ensName || shortenAddress(address);
  } catch (e) {
    console.error("ENS resolution error:", e);
    return shortenAddress(address);
  }
}

function shortenAddress(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

async function displayLeaderboard(entries, timeframe = "allTime") {
  const leaderboardDiv = document.getElementById("leaderboard");
  leaderboardDiv.innerHTML = `<h3>${getTimeframeTitle(timeframe)}</h3>`;

  // Filter entries based on timeframe
  const filteredEntries = filterEntriesByTimeframe(entries, timeframe);

  // Sort by amount
  const sortedEntries = filteredEntries.sort(
    (a, b) => BigInt(b.amount) - BigInt(a.amount)
  );

  // Take top 10
  const topEntries = sortedEntries.slice(0, 10);

  // Create timeframe selector
  const selector = document.createElement("div");
  selector.className = "timeframe-selector";
  selector.innerHTML = `
    <select id="timeframeSelect">
      <option value="allTime" ${
        timeframe === "allTime" ? "selected" : ""
      }>All Time</option>
      <option value="weekly" ${
        timeframe === "weekly" ? "selected" : ""
      }>Weekly</option>
      <option value="daily" ${
        timeframe === "daily" ? "selected" : ""
      }>Daily</option>
    </select>
  `;
  leaderboardDiv.appendChild(selector);

  // Add event listener to selector
  document.getElementById("timeframeSelect").addEventListener("change", (e) => {
    displayLeaderboard(entries, e.target.value);
  });

  // Display entries
  for (const entry of topEntries) {
    const entryDiv = document.createElement("div");
    entryDiv.className = "leaderboard-entry";

    // Resolve ENS name
    const displayName = await resolveENSName(entry.user);

    entryDiv.innerHTML = `
      <span>${displayName}</span>
      <span>${ethers.formatEther(entry.amount)} ETH</span>
    `;
    leaderboardDiv.appendChild(entryDiv);
  }
}

function getTimeframeTitle(timeframe) {
  switch (timeframe) {
    case "allTime":
      return "🏆 Top Depositors (All Time)";
    case "weekly":
      return "📅 Top Depositors (This Week)";
    case "daily":
      return "📆 Top Depositors (Today)";
    default:
      return "🏆 Top Depositors";
  }
}

function filterEntriesByTimeframe(entries, timeframe) {
  const now = Math.floor(Date.now() / 1000);

  switch (timeframe) {
    case "daily":
      return entries.filter(
        (entry) => entry.timestamp > now - 86400 // Last 24 hours
      );
    case "weekly":
      return entries.filter(
        (entry) => entry.timestamp > now - 604800 // Last 7 days
      );
    case "allTime":
    default:
      return entries;
  }
}

// Add this function to handle wallet disconnection
export async function disconnectWallet() {
  userAccount = null;

  // Reset UI elements
  document.getElementById("connectBtn").innerText = "🦊 Connect Wallet";
  document.getElementById("userDashboard").style.display = "none";
  document.getElementById("status").innerText = "Wallet disconnected";

  // Clear any user-specific data
  document.getElementById("userAddress").innerText = "";
  document.getElementById("userDeposit").innerText = "0";
  document.getElementById("winChance").innerText = "0%";

  // Clear localStorage to prevent using old cached data
  localStorage.removeItem("contractData");
}

// Add event listener for account changes
export function setupAccountChangeListeners() {
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        disconnectWallet();
      } else {
        // User switched accounts, reinitialize
        initWeb3();
      }
    });

    window.ethereum.on("chainChanged", () => {
      // Chain changed, reload the page
      window.location.reload();
    });
  }
}

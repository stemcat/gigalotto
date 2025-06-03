import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

// Contract details
const contractAddress = "0x9921e7B46EC46AbFcF4CE531688E79c8862604Fa";
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
    contract = new ethers.Contract(contractAddress, abi, signer);

    // Only update UI after successful connection
    document.getElementById("status").innerText = "✅ Wallet connected!";
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

import {
  initWeb3,
  connectWallet,
  checkIfConnected,
  setupAccountChangeListeners,
  debugWalletConnection,
  getUserAccount,
  contractAddress,
} from "./wallet.js";

import {
  setupAutoRefresh,
  tryDirectContractCall,
  debugSubgraphConnection,
  verifyContractAddress,
  changeTimeframe,
} from "./read-only.js";

// Add this function to window for timeframe changes
window.changeTimeframe = function (timeframe) {
  changeTimeframe(timeframe);
};

// Make wallet functions available globally
window.connectWallet = connectWallet;
window.debugWalletConnection = debugWalletConnection;

// Initialize the app
document.addEventListener("DOMContentLoaded", async function () {
  try {
    console.log("Initializing app...");

    // Set up deposit button
    const depositBtn = document.getElementById("depositBtn");
    if (depositBtn) {
      depositBtn.onclick = function () {
        // Show deposit modal if it exists
        const modal = document.getElementById("depositModal");
        if (modal && modal.showModal) {
          modal.showModal();
        } else {
          // Fallback if modal doesn't exist
          window.connectAndDeposit();
        }
      };
    }

    // Set up connect button
    const connectBtn = document.getElementById("connectBtn");
    if (connectBtn) {
      connectBtn.onclick = async function () {
        if (window.ethereum) {
          try {
            await window.ethereum.request({ method: "eth_requestAccounts" });
            document.getElementById("status").innerText =
              "✅ Wallet connected!";

            // Hide connect button, show deposit button
            connectBtn.style.display = "none";
            if (depositBtn) depositBtn.style.display = "inline-block";

            // Update UI
            if (typeof window.updateUI === "function") {
              window.updateUI();
            }
          } catch (error) {
            document.getElementById("status").innerText =
              "⚠️ Connection failed: " + error.message;
          }
        } else {
          document.getElementById("status").innerText =
            "⚠️ MetaMask not detected";
        }
      };
    }

    // Initialize other components
    if (typeof window.initializeReadOnly === "function") {
      window.initializeReadOnly();
    }
  } catch (error) {
    console.error("Initialization error:", error);
    document.getElementById("status").innerText =
      "⚠️ Initialization error: " + error.message;
  }
});

// Add this function to clear cache and refresh
window.clearCacheAndRefresh = function () {
  localStorage.removeItem("contractData");
  console.log("Cache cleared");

  // Force reload the page
  window.location.reload();
};

// Add this function to force a direct contract call
window.forceDirectContractCall = function () {
  console.log("Forcing direct contract call...");
  tryDirectContractCall(true);
};

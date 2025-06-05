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

    // Set up connect button
    const connectBtn = document.getElementById("connectBtn");
    if (connectBtn) {
      connectBtn.addEventListener("click", connectWallet);
    }

    // Set up deposit button
    const depositBtn = document.getElementById("depositBtn");
    if (depositBtn) {
      depositBtn.addEventListener("click", function () {
        if (window.connectAndDeposit) {
          window.connectAndDeposit();
        } else {
          console.error("connectAndDeposit function not available");
        }
      });
    }

    // Check if already connected
    const isConnected = await checkIfConnected();

    // Show/hide buttons based on connection status
    if (isConnected) {
      if (connectBtn) connectBtn.style.display = "none";
      if (depositBtn) depositBtn.style.display = "inline-block";
    } else {
      if (connectBtn) connectBtn.style.display = "inline-block";
      if (depositBtn) depositBtn.style.display = "none";
    }

    // Initialize read-only functionality
    if (typeof window.initializeReadOnly === "function") {
      window.initializeReadOnly();
    } else {
      // If not available yet, import and initialize
      import("./read-only.js")
        .then((module) => {
          if (module.initializeReadOnly) {
            module.initializeReadOnly();
          }
        })
        .catch((err) => {
          console.error("Failed to load read-only module:", err);
        });
    }

    // Load jackpot info
    setTimeout(() => {
      if (typeof window.loadJackpotInfo === "function") {
        window.loadJackpotInfo();
      }
    }, 500);
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

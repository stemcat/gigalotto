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

    // Add validateMinAmount function
    window.validateMinAmount = function (input) {
      if (input.value && parseFloat(input.value) < 0.001) {
        input.setCustomValidity("Minimum deposit is 0.001 ETH");
        document.getElementById("status").innerText =
          "⚠️ Minimum deposit is 0.001 ETH";
      } else {
        input.setCustomValidity("");
        document.getElementById("status").innerText = "";
      }
    };

    // Set up deposit button
    const depositBtn = document.getElementById("depositBtn");
    if (depositBtn) {
      depositBtn.onclick = function () {
        // Show deposit modal if it exists
        const modal = document.getElementById("depositModal");
        if (modal && typeof modal.showModal === "function") {
          modal.showModal();
        } else {
          // Fallback if modal doesn't exist or showModal not supported
          if (window.connectAndDeposit) {
            window.connectAndDeposit();
          } else {
            console.error("connectAndDeposit function not available");
            document.getElementById("status").innerText =
              "⚠️ Deposit functionality not available";
          }
        }
      };
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

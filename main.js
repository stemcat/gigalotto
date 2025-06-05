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

// Document ready function
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document ready, initializing app...");

  try {
    // Verify contract address first
    console.log("Verifying contract address:", contractAddress);
    const contractVerified = await verifyContractAddress();
    console.log("Contract verified:", contractVerified);

    if (contractVerified) {
      // Check if already connected
      const alreadyConnected = await checkIfConnected();
      console.log("Already connected:", alreadyConnected);

      // Set up account change listeners
      setupAccountChangeListeners();

      // Set up auto-refresh for jackpot info
      setupAutoRefresh();

      // Set up connect button
      const connectBtn = document.getElementById("connectBtn");
      if (connectBtn) {
        connectBtn.onclick = async function () {
          const account = getUserAccount();
          if (!account) {
            // Not connected, try to connect
            await connectWallet();
          } else {
            // Already connected, show deposit form
            document.getElementById("depositModal").showModal();
          }
        };
      }

      // Set up deposit button in modal
      const depositBtn = document.querySelector(
        "#depositModal button:last-child"
      );
      if (depositBtn) {
        depositBtn.onclick = function () {
          window.connectAndDeposit();
        };
      }
    } else {
      console.error("Contract verification failed");
      document.getElementById("status").innerText =
        "⚠️ Contract verification failed. Please check the contract address.";
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

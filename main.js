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
  loadInitialData,
  refreshData,
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
      connectBtn.onclick = function () {
        console.log("Connect button clicked");
        connectWallet();
      };
    }

    // Deposit button is handled in wallet.js initPage()

    // Import wallet.js first to ensure it's loaded
    await import("./wallet.js").then(async (walletModule) => {
      console.log("Wallet module loaded");

      // Initialize the wallet page properly
      if (walletModule.initPage) {
        await walletModule.initPage();
      }

      // Set up account change listeners
      walletModule.setupAccountChangeListeners();
    });

    // Import read-only.js after wallet.js
    await import("./read-only.js").then((readOnlyModule) => {
      console.log("Read-only module loaded");

      if (readOnlyModule.initializeReadOnly) {
        readOnlyModule.initializeReadOnly();
      } else if (readOnlyModule.loadInitialData) {
        // Fallback to loadInitialData if initializeReadOnly doesn't exist
        readOnlyModule.loadInitialData();
      }
    });
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

// Add this function to test all connections
window.testAllConnections = function () {
  console.log("Testing all connections...");
  document.getElementById("status").innerText = "⏳ Testing connections...";

  // Test subgraph connection
  debugSubgraphConnection();

  // Test wallet connection
  debugWalletConnection();

  // Test direct contract call
  tryDirectContractCall(true);

  document.getElementById("status").innerText =
    "✅ Connection tests complete. Check console for details.";
};

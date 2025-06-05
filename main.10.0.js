import {
  initWeb3,
  connectAndDeposit,
  withdrawWinnings,
  withdraw,
  requestDraw,
  selectNewWinner,
  checkExpiredWinner,
  withdrawFees,
  getUserAccount,
  checkIfConnected,
  connectWallet,
  setupAccountChangeListeners,
  debugWalletConnection,
} from "./wallet.js";

import {
  setupAutoRefresh,
  tryDirectContractCall,
  debugSubgraphConnection,
  verifyContractAddress,
} from "./read-only.js";

// Add validation function for minimum amount with debounce
let debounceTimeout;
function validateMinAmount(input) {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    if (input.value && parseFloat(input.value) < 0.001) {
      input.value = 0.001;
    }
  }, 1000); // Only validate after user stops typing for 1 second
}

// Make it available globally
window.validateMinAmount = validateMinAmount;

// Share on Twitter function
window.shareOnTwitter = function () {
  const text = encodeURIComponent(
    "I just joined the $2.2B #GigaLotto on-chain lottery! 🤑 Join me at "
  );
  const url = encodeURIComponent(window.location.href);
  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    "_blank"
  );
  document.getElementById("shareModal").close();
};

// Terms functions - these need to be global
window.acceptTerms = function () {
  console.log("Terms accepted");
  localStorage.setItem("termsAccepted", "true");
  document.getElementById("termsModal").close();
  initWeb3();
};

window.declineTerms = function () {
  console.log("Terms declined");
  document.getElementById("termsModal").close();
  document.getElementById("status").innerText =
    "⚠️ You must accept the terms to continue";
};

window.showTermsModal = function () {
  console.log("Showing terms modal");
  document.getElementById("termsModal").showModal();
};

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
  tryDirectContractCall();
};

// Add timeframe change function
window.changeTimeframe = function (timeframe) {
  console.log("Changing timeframe to:", timeframe);

  // Get cached data
  const cachedData = localStorage.getItem("contractData");
  if (!cachedData) {
    console.error("No cached data available for timeframe filtering");
    return;
  }

  try {
    const data = JSON.parse(cachedData);
    if (!data.allDeposits || data.allDeposits.length === 0) {
      console.error("No deposit data available for timeframe filtering");
      return;
    }

    // Filter deposits by timeframe
    const now = Math.floor(Date.now() / 1000);
    let filteredDeposits = data.allDeposits;

    switch (timeframe) {
      case "daily":
        filteredDeposits = data.allDeposits.filter(
          (deposit) => deposit.timestamp > now - 86400 // Last 24 hours
        );
        break;
      case "weekly":
        filteredDeposits = data.allDeposits.filter(
          (deposit) => deposit.timestamp > now - 604800 // Last 7 days
        );
        break;
      // All time - use all deposits
    }

    // Process deposits to get top depositors
    let topDepositors = {};

    for (const deposit of filteredDeposits) {
      const depositor = deposit.depositor.toLowerCase();
      if (!topDepositors[depositor]) {
        topDepositors[depositor] = 0;
      }
      topDepositors[depositor] += parseFloat(deposit.amount);
    }

    // Convert to array for leaderboard
    const leaderboardData = Object.entries(topDepositors).map(
      ([address, amount]) => ({
        address: address,
        amount: amount.toString(),
      })
    );

    // Sort by amount descending
    leaderboardData.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

    // Update leaderboard with filtered data
    if (typeof updateLeaderboardFromData === "function") {
      updateLeaderboardFromData(leaderboardData.slice(0, 10), timeframe);
    } else {
      console.error("updateLeaderboardFromData function not available");
    }
  } catch (e) {
    console.error("Error filtering deposits by timeframe:", e);
  }
};

// Add this function to help with debugging
function addDebugButton() {
  const debugBtn = document.createElement("button");
  debugBtn.innerText = "🐞 Debug";
  debugBtn.style.position = "fixed";
  debugBtn.style.bottom = "10px";
  debugBtn.style.right = "10px";
  debugBtn.style.zIndex = "9999";
  debugBtn.style.padding = "5px 10px";
  debugBtn.style.background = "#ff5722";
  debugBtn.style.color = "white";
  debugBtn.style.border = "none";
  debugBtn.style.borderRadius = "4px";
  debugBtn.style.cursor = "pointer";

  debugBtn.addEventListener("click", () => {
    console.clear();
    console.log("=== DEBUGGING STARTED ===");
    debugWalletConnection();
    debugSubgraphConnection();
    console.log(
      "Contract address:",
      document
        .querySelector('script[type="module"]')
        .getAttribute("data-contract")
    );
    console.log("Local storage:", localStorage);
    console.log("=== DEBUGGING ENDED ===");
  });

  document.body.appendChild(debugBtn);
}

// Add refresh button for all environments
function addRefreshButton() {
  const refreshBtn = document.createElement("button");
  refreshBtn.innerText = "🔄 Refresh";
  refreshBtn.style.position = "fixed";
  refreshBtn.style.bottom = "10px";
  refreshBtn.style.right = "100px";
  refreshBtn.style.zIndex = "9999";
  refreshBtn.style.padding = "5px 10px";
  refreshBtn.style.background = "#4CAF50";
  refreshBtn.style.color = "white";
  refreshBtn.style.border = "none";
  refreshBtn.style.borderRadius = "4px";
  refreshBtn.style.cursor = "pointer";

  refreshBtn.addEventListener("click", () => {
    window.location.reload();
  });

  document.body.appendChild(refreshBtn);
}

// Add this function to test all connections
window.testAllConnections = function () {
  console.clear();
  console.log("=== TESTING ALL CONNECTIONS ===");

  // 1. Test contract verification
  verifyContractAddress()
    .then((verified) => {
      console.log("Contract verification result:", verified);

      // 2. Test subgraph connection
      debugSubgraphConnection();

      // 3. Test direct contract call
      return tryDirectContractCall(true);
    })
    .then((directCallResult) => {
      console.log("Direct contract call result:", directCallResult);

      // 4. Test wallet connection if MetaMask is available
      if (window.ethereum) {
        debugWalletConnection();
      } else {
        console.error("MetaMask not available for testing");
      }
    })
    .catch((error) => {
      console.error("Test failed:", error);
    });
};

// Make sure all admin buttons are properly set up
window.addEventListener("load", async () => {
  console.log("Page loaded, initializing...");

  // Add debug button in development
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    addDebugButton();
  }

  // Add refresh button for all environments
  addRefreshButton();

  // Add test connections button
  const testBtn = document.createElement("button");
  testBtn.innerText = "🔍 Test Connections";
  testBtn.style.position = "fixed";
  testBtn.style.bottom = "10px";
  testBtn.style.right = "190px";
  testBtn.style.zIndex = "9999";
  testBtn.style.padding = "5px 10px";
  testBtn.style.background = "#2196F3";
  testBtn.style.color = "white";
  testBtn.style.border = "none";
  testBtn.style.borderRadius = "4px";
  testBtn.style.cursor = "pointer";

  testBtn.addEventListener("click", window.testAllConnections);
  document.body.appendChild(testBtn);

  // Try to load basic data even without wallet connection
  tryDirectContractCall();

  // Verify contract address first
  const contractVerified = await verifyContractAddress();
  console.log("Contract verified:", contractVerified);

  // Only proceed with initialization if contract is verified
  if (contractVerified) {
    // Try to initialize web3
    const web3Initialized = await initWeb3();
    console.log("Web3 initialized:", web3Initialized);

    // Check if already connected
    const alreadyConnected = await checkIfConnected();
    console.log("Already connected:", alreadyConnected);

    // Set up account change listeners
    setupAccountChangeListeners();

    // Set up auto-refresh for jackpot info
    setupAutoRefresh();
  } else {
    console.error("Contract verification failed, stopping initialization");
    document.getElementById("status").innerText =
      "⚠️ Contract verification failed. Please check the contract address.";
  }

  // Set up connect/deposit button
  const connectBtn = document.getElementById("connectBtn");
  if (connectBtn) {
    connectBtn.addEventListener("click", async function () {
      console.log("Connect button clicked");
      const userAccount = getUserAccount();

      if (!userAccount) {
        // Not connected, try to connect
        console.log("No user account, connecting wallet");
        const connected = await connectWallet();
        console.log("Wallet connected:", connected);
      } else {
        // Already connected, handle deposit
        console.log("User account exists, handling deposit");
        await connectAndDeposit();
      }
    });
  } else {
    console.error("Connect button not found!");
  }

  // Set up withdraw button
  const userWithdrawBtn = document.getElementById("userWithdrawBtn");
  if (userWithdrawBtn) {
    userWithdrawBtn.addEventListener("click", withdraw);
  }

  // Set up admin buttons if they exist
  const requestDrawBtn = document.getElementById("requestDrawBtn");
  if (requestDrawBtn) {
    requestDrawBtn.addEventListener("click", requestDraw);
  }

  const selectNewWinnerBtn = document.getElementById("selectNewWinnerBtn");
  if (selectNewWinnerBtn) {
    selectNewWinnerBtn.addEventListener("click", async () => {
      const canSelectNew = await checkExpiredWinner();
      if (canSelectNew) {
        selectNewWinner();
      } else {
        document.getElementById("status").innerText =
          "⚠️ Current winner can still claim or no winner selected";
      }
    });
  }

  const withdrawFeesBtn = document.getElementById("withdrawFeesBtn");
  if (withdrawFeesBtn) {
    withdrawFeesBtn.addEventListener("click", withdrawFees);
  }

  // Set up winner claim button
  const winnerClaimBtn = document.getElementById("winnerClaimBtn");
  if (winnerClaimBtn) {
    winnerClaimBtn.addEventListener("click", withdrawWinnings);
  }
});

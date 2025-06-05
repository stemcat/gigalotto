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
} from "./wallet.js";

import { setupAutoRefresh, tryDirectContractCall } from "./read-only.js";

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

// Make sure all admin buttons are properly set up
window.addEventListener("load", async () => {
  // Initialize web3
  await initWeb3();

  // Check if already connected
  await checkIfConnected();

  // Set up account change listeners
  setupAccountChangeListeners();

  // Set up auto-refresh for jackpot info
  setupAutoRefresh();

  // Set up connect/deposit button
  document
    .getElementById("connectBtn")
    .addEventListener("click", connectAndDeposit);

  // Set up withdraw button
  document
    .getElementById("userWithdrawBtn")
    .addEventListener("click", withdraw);

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

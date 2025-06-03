import {
  initWeb3,
  connectAndDeposit,
  withdrawWinnings,
  requestDraw,
  getUserAccount,
  checkIfConnected,
  connectWallet,
} from "./wallet.js";

import { setupAutoRefresh } from "./read-only.js";

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

// Terms functions
window.acceptTerms = function () {
  localStorage.setItem("termsAccepted", "true");
  document.getElementById("termsModal").close();
  initWeb3();
};

window.declineTerms = function () {
  document.getElementById("termsModal").close();
  document.getElementById("status").innerText =
    "⚠️ You must accept the terms to continue";
};

window.showTermsModal = function () {
  document.getElementById("termsModal").showModal();
};

// Initialize on page load
window.addEventListener("load", async () => {
  // Load basic jackpot info for all users using the public API approach
  setupAutoRefresh();

  // Only try to check connection if MetaMask is available
  if (window.ethereum) {
    await checkIfConnected();
  } else {
    // Update UI to show MetaMask is required for participation
    document.getElementById("status").innerText =
      "⚠️ Please install MetaMask to participate";
  }

  // Set up connect button
  document.getElementById("connectBtn").addEventListener("click", async () => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        document.getElementById("status").innerText =
          "⚠️ Please install MetaMask to participate";
        // Maybe open MetaMask download page
        if (confirm("MetaMask is required. Would you like to install it?")) {
          window.open("https://metamask.io/download/", "_blank");
        }
        return;
      }

      // If we're not connected yet, connect first
      if (!getUserAccount()) {
        const connected = await connectWallet();
        if (!connected) return;
      }

      // After connection (or if already connected), check for deposit amount
      const ethAmount = document.getElementById("ethAmount").value;
      if (ethAmount && parseFloat(ethAmount) >= 0.001) {
        await connectAndDeposit();
      } else if (getUserAccount()) {
        // If we're connected but no amount entered, prompt for amount
        document.getElementById("status").innerText =
          "⚠️ Enter a valid ETH amount. (min: 0.001)";
      }
    } catch (e) {
      console.error("Connection/deposit error:", e);
      document.getElementById("status").innerText = "⚠️ Error: " + e.message;
    }
  });

  // Set up other buttons
  document
    .getElementById("withdrawBtn")
    .addEventListener("click", withdrawWinnings);
  document
    .getElementById("requestDrawBtn")
    .addEventListener("click", requestDraw);
});

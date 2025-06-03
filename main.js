import {
  initWeb3,
  connectAndDeposit,
  withdrawWinnings,
  requestDraw,
  loadJackpotInfo,
  getUserAccount,
} from "./wallet.js";

// Add validation function for minimum amount
function validateMinAmount(input) {
  if (parseFloat(input.value) < 0.001) {
    input.value = 0.001;
  }
}

// Make it available globally
window.validateMinAmount = validateMinAmount;

window.addEventListener("load", async () => {
  // Load basic jackpot info without requiring connection
  await loadJackpotInfo();

  document.getElementById("connectBtn").addEventListener("click", async () => {
    try {
      // If we're not connected yet, connect first
      if (!getUserAccount()) {
        const connected = await initWeb3();
        if (!connected) return;
      }

      // After connection (or if already connected), check for deposit amount
      const ethAmount = document.getElementById("ethAmount").value;
      if (ethAmount && parseFloat(ethAmount) >= 0.001) {
        await connectAndDeposit();
      } else if (getUserAccount()) {
        // If we're connected but no amount entered, prompt for amount
        document.getElementById("status").innerText =
          "⚠️ Enter a valid ETH amount.";
      }
    } catch (e) {
      console.error("Connection/deposit error:", e);
      document.getElementById("status").innerText = "⚠️ Error: " + e.message;
    }
  });

  document
    .getElementById("withdrawBtn")
    .addEventListener("click", withdrawWinnings);
  document
    .getElementById("requestDrawBtn")
    .addEventListener("click", requestDraw);
});

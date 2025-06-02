import {
  initWeb3,
  connectAndDeposit,
  withdrawWinnings,
  requestDraw,
  loadJackpotInfo
} from "./wallet.js";

window.addEventListener("load", async () => {
  // Load basic jackpot info without requiring connection
  await loadJackpotInfo();

  document.getElementById("connectBtn").addEventListener("click", async () => {
    try {
      const connected = await initWeb3();
      
      if (connected) {
        const ethAmount = document.getElementById("ethAmount").value;
        if (ethAmount && parseFloat(ethAmount) > 0) {
          await connectAndDeposit();
        }
      }
    } catch (e) {
      console.error("Connection error:", e);
      document.getElementById("status").innerText =
        "⚠️ Connection failed: " + e.message;
    }
  });

  document
    .getElementById("withdrawBtn")
    .addEventListener("click", withdrawWinnings);
  document
    .getElementById("requestDrawBtn")
    .addEventListener("click", requestDraw);
});

import {
  initWeb3,
  connectAndDeposit,
  withdrawWinnings,
  requestDraw,
} from "./wallet.js";

window.addEventListener("load", async () => {
  await initWeb3();

  // The depositBtn doesn't exist in your HTML, but connectBtn does
  document.getElementById("connectBtn").addEventListener("click", async () => {
    try {
      await initWeb3();

      // If there's an amount entered, also do the deposit
      const ethAmount = document.getElementById("ethAmount").value;
      if (ethAmount && parseFloat(ethAmount) > 0) {
        await connectAndDeposit();
      }

      updateUI();
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

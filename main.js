import {
  initWeb3,
  connectAndDeposit,
  withdrawWinnings,
  requestDraw,
} from "./wallet.js";

window.addEventListener("load", async () => {
  // Remove the automatic initWeb3() call here
  // await initWeb3();

  document.getElementById("connectBtn").addEventListener("click", async () => {
    try {
      await initWeb3();

      // If there's an amount entered, also do the deposit
      const ethAmount = document.getElementById("ethAmount").value;
      if (ethAmount && parseFloat(ethAmount) > 0) {
        await connectAndDeposit();
      } else {
        // Just update UI to show connected status
        document.getElementById("status").innerText = "✅ Wallet connected!";
        document.getElementById("userDashboard").style.display = "block";
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

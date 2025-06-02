import { initWeb3, connectAndDeposit, withdrawWinnings, requestDraw } from './wallet.js';

window.addEventListener('load', () => {
  // Only assign button listeners on load
  document.getElementById("connectBtn").addEventListener("click", initWeb3);
  document.getElementById("depositBtn").addEventListener("click", connectAndDeposit);
  document.getElementById("withdrawBtn").addEventListener("click", withdrawWinnings);
  document.getElementById("requestDrawBtn").addEventListener("click", requestDraw);
});

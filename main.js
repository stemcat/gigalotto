import { initWeb3, connectAndDeposit, withdrawWinnings, requestDraw } from './wallet.js';

window.addEventListener('load', async () => {
  await initWeb3();

  document.getElementById("depositBtn").addEventListener("click", connectAndDeposit);
  document.getElementById("withdrawBtn").addEventListener("click", withdrawWinnings);
  document.getElementById("requestDrawBtn").addEventListener("click", requestDraw);
});
